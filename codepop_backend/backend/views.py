from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import F, Q, ExpressionWrapper
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.generics import CreateAPIView, ListAPIView, ListCreateAPIView, RetrieveUpdateDestroyAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework import status, viewsets
from rest_framework.views import APIView
from .models import Preference, Drink, Inventory, Notification, Order, Revenue, Machine, Schedule, Region, StoreRegistry, SupplyHub, HubInventoryItem, StoreInventoryItem, SupplyRequest, ManagerProfile, Delivery, SeasonalDrink, VisitingUserCache
from .serializers import CreateUserSerializer, GetUserSerializer, PreferenceSerializer, DrinkSerializer, InventorySerializer, NotificationSerializer, OrderSerializer, RevenueSerializer, MachineSerializer, ScheduleSerializer, RegionSerializer, StoreRegistrySerializer, SupplyHubSerializer, HubInventoryItemSerializer, StoreInventoryItemSerializer, SupplyRequestSerializer, DeliverySerializer, DriverSerializer, SeasonalDrinkSerializer
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.exceptions import PermissionDenied
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import stripe
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views import View #maybe delete these three?
from django.utils.decorators import method_decorator
import json
import requests
import uuid
from datetime import timedelta
from rest_framework.decorators import action
from django.utils.dateparse import parse_datetime
from .drinkAI import generate_soda
from rest_framework.permissions import BasePermission

stripe.api_key = settings.STRIPE_SECRET_KEY


class IsSuperUser(BasePermission):
    """Permission class to check if user is a superuser."""
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class VisitingTokenAuthentication(BaseAuthentication):
    """
    Accepts real DRF tokens AND synthetic visiting tokens.
    Synthetic format: visiting_<user_id>_<home_store_id>
    Validates synthetic tokens against VisitingUserCache (checks expiry).
    Used only on endpoints that visiting users must reach.
    """
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Token '):
            return None
        token = auth_header[6:].strip()

        # Try real DRF token first
        try:
            token_obj = Token.objects.get(key=token)
            return (token_obj.user, token_obj)
        except Token.DoesNotExist:
            pass

        # Try synthetic visiting token: visiting_<user_id>_<home_store_id>
        parts = token.split('_')
        if len(parts) == 3 and parts[0] == 'visiting':
            try:
                user_id = int(parts[1])
                home_store_id = int(parts[2])
            except ValueError:
                raise AuthenticationFailed('Invalid visiting token format.')

            cache = VisitingUserCache.objects.filter(
                user_id=user_id,
                home_store_id=home_store_id,
                expires_at__gt=timezone.now()
            ).first()
            if not cache:
                raise AuthenticationFailed('Visiting session expired or not found.')

            # Return the shadow user created during visiting login
            try:
                shadow = User.objects.get(username=f'visiting_{user_id}_{home_store_id}')
                return (shadow, None)
            except User.DoesNotExist:
                raise AuthenticationFailed('Visiting shadow user not found.')

        raise AuthenticationFailed('Invalid token.')


def _propagate_to_home_store(user_id: int):
    """
    If the user is a visiting user (in VisitingUserCache), push their current
    preferences and favorites back to their home store via P2P.
    If home store unreachable, queue in PendingProfileUpdate.
    """
    from .models import PendingProfileUpdate

    cache = VisitingUserCache.objects.filter(
        user_id=user_id, expires_at__gt=timezone.now()
    ).first()
    if not cache:
        return  # Home user — no propagation needed

    changes = {
        'preferences': list(Preference.objects.filter(
            UserID__pk=user_id).values_list('Preference', flat=True)),
        'favorite_drinks': cache.favorite_drinks,  # full drink data
    }

    # Try immediate delivery to home store
    try:
        resp = requests.post(
            f"{cache.home_store_endpoint}/backend/api/inter-node/profile-update/",
            json={'user_id': user_id, 'changes': changes,
                  'timestamp': timezone.now().isoformat()},
            headers={'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}',
                     'Content-Type': 'application/json'},
            timeout=5,
        )
        if resp.status_code == 200:
            confirmed = resp.json()
            update_fields = ['preferences']
            cache.preferences = confirmed.get('preferences', changes['preferences'])
            # Update cache: home store fills in home_drink_id for newly created drinks
            if 'favorite_drinks' in confirmed:
                cache.favorite_drinks = [
                    d if d.get('cache_drink_id') else {**d, 'cache_drink_id': str(uuid.uuid4())}
                    for d in confirmed['favorite_drinks']
                ]
                update_fields.append('favorite_drinks')
            cache.save(update_fields=update_fields)
            return
    except requests.RequestException:
        pass  # Fall through to queueing

    # Home store unreachable — queue the update
    now = timezone.now()
    PendingProfileUpdate.objects.create(
        user_id=user_id,
        home_store_id=cache.home_store_id,
        home_store_endpoint=cache.home_store_endpoint,
        changes_encrypted=PendingProfileUpdate.encrypt(changes),
        next_retry_at=now + timedelta(seconds=1),
        max_retry_until=now + timedelta(hours=24),
    )

class IsSuperUser(BasePermission):
    """
    Custom permission to allow access only to superusers.
    """

    def has_permission(self, request, view):
        # Check if the user is authenticated and a superuser
        return request.user and request.user.is_authenticated and request.user.is_superuser
    
class CustomAuthToken(ObtainAuthToken):
    """
    POST /backend/auth/login/
    Extended login that supports visiting users via the distributed lookup flow.

    Login attempt order:
    1. Check local auth.User (home users on this store)
    2. Check VisitingUserCache (visiting users cached within 24h)
    3. Query hub → hub broadcasts → P2P fetch from home store → cache result
    4. If home store unreachable and no cache: deny with friendly error
    """

    def post(self, request, *args, **kwargs):
        from rest_framework.authtoken.models import Token
        from .models import VisitingUserCache
        from django.contrib.auth import authenticate

        username_or_email = request.data.get('username', '')
        password = request.data.get('password', '')

        # ── Path 1: Local home user ──────────────────────────────────────────
        # Support email-based login for local users
        if '@' in username_or_email:
            from django.contrib.auth.models import User as DjangoUser
            local_user = DjangoUser.objects.filter(email__iexact=username_or_email).first()
            user = authenticate(request, username=local_user.username, password=password) if local_user else None
        else:
            user = authenticate(request, username=username_or_email, password=password)
        if user:
            token, _ = Token.objects.get_or_create(user=user)

            # Determine role based on user flags and profiles
            if user.is_superuser:
                role = 'super_admin'
            elif hasattr(user, 'repair_profile'):
                role = 'repair_staff'
            elif hasattr(user, 'logistics_profile'):
                role = 'logistics_manager'
            elif hasattr(user, 'manager_profile'):
                role = 'manager'
            elif user.is_staff:
                role = 'admin'
            else:
                role = 'user'

            return Response({
                'token':      token.key,
                'user_id':    user.pk,
                'first_name': user.first_name,
                'userRole':   role,
            })

        # ── Path 2: Visiting user in local cache ─────────────────────────────
        # Check by email (username may differ from email)
        email = username_or_email if '@' in username_or_email else None
        if not email:
            from django.contrib.auth.models import User as DjangoUser
            try:
                local = DjangoUser.objects.get(username=username_or_email)
                email = local.email
            except DjangoUser.DoesNotExist:
                email = username_or_email  # Try as email anyway

        cached = VisitingUserCache.objects.filter(
            email=email, expires_at__gt=timezone.now()
        ).first()
        if cached:
            from django.contrib.auth.hashers import check_password
            if check_password(password, cached.hashed_password):
                token_key = f"visiting_{cached.user_id}_{cached.home_store_id}"
                return Response({
                    'token':      token_key,
                    'user_id':    cached.user_id,
                    'first_name': cached.username,
                    'userRole':   cached.role,
                    'visiting':   True,
                    'home_store': cached.home_store_endpoint,
                })
            else:
                return Response({'error': 'Invalid credentials'},
                                status=status.HTTP_401_UNAUTHORIZED)

        # ── Path 3: Unknown user — trigger distributed lookup ─────────────────
        hub_url = settings.HUB_URL
        if not hub_url:
            return Response(
                {'error': 'This store cannot reach its regional hub. Please try your home store.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Step 3a: Ask hub to locate user's home store
        try:
            hub_resp = requests.post(
                f"{hub_url}/backend/api/hub/user-lookup/",
                json={'email': email, 'requesting_store_id': settings.STORE_ID},
                headers={'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}',
                         'Content-Type': 'application/json'},
                timeout=8,
            )
        except requests.RequestException:
            return Response(
                {'error': 'Your regional hub is currently unreachable. Please try again shortly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        if hub_resp.status_code == 404:
            return Response({'error': 'Invalid credentials'},
                            status=status.HTTP_401_UNAUTHORIZED)

        if hub_resp.status_code != 200:
            return Response(
                {'error': 'Hub returned an unexpected error. Please try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        hub_data = hub_resp.json()
        home_store_endpoint = hub_data['home_store_endpoint']

        # Step 3b: Fetch user data directly from home store (P2P)
        try:
            sync_resp = requests.post(
                f"{home_store_endpoint}/backend/api/inter-node/user-sync/",
                json={'email': email, 'requesting_store_id': settings.STORE_ID},
                headers={'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}',
                         'Content-Type': 'application/json'},
                timeout=8,
            )
        except requests.RequestException:
            return Response(
                {'error': 'Your home store is currently unreachable. '
                          'If you have visited this store before, your session may have expired. '
                          'Please try again later.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        if sync_resp.status_code != 200:
            return Response({'error': 'Could not retrieve user data from home store.'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        user_data = sync_resp.json()

        # Step 3c: Verify password against home store's PBKDF2 hash
        from django.contrib.auth.hashers import check_password
        if not check_password(password, user_data['hashed_password']):
            return Response({'error': 'Invalid credentials'},
                            status=status.HTTP_401_UNAUTHORIZED)

        # Step 3d: Cache user data locally for 24 hours
        VisitingUserCache.objects.update_or_create(
            user_id=user_data['user_id'],
            home_store_id=user_data['home_store_id'],
            defaults={
                'username':           user_data['username'],
                'email':              user_data['email'],
                'hashed_password':    user_data['hashed_password'],
                'role':               user_data['role'],
                'home_store_endpoint': home_store_endpoint,
                'preferences':        user_data.get('preferences', []),
                'favorite_drinks': [
                    {**d, 'cache_drink_id': str(uuid.uuid4())}
                    for d in user_data.get('favorite_drinks', [])
                ],
                'expires_at':         timezone.now() + timedelta(hours=24),
            }
        )

        # Step 3e: Create a shadow auth.User + real DRF Token so subsequent API calls work.
        # The shadow user is prefixed "visiting_" to distinguish from home users.
        # It is cleaned up by the cleanup_expired_visiting_cache Celery task.
        from django.contrib.auth.models import User as DjangoUser
        from rest_framework.authtoken.models import Token as DRFToken

        shadow_user, _ = DjangoUser.objects.update_or_create(
            username=f"visiting_{user_data['user_id']}_{user_data['home_store_id']}",
            defaults={
                'email':      user_data['email'],
                'password':   user_data['hashed_password'],  # already PBKDF2 hashed
                'first_name': user_data.get('username', ''),
                'is_active':  True,
            }
        )
        drf_token, _ = DRFToken.objects.get_or_create(user=shadow_user)

        return Response({
            'token':      drf_token.key,
            'user_id':    user_data['user_id'],
            'first_name': user_data['username'],
            'userRole':   user_data['role'],
            'visiting':   True,
            'home_store': home_store_endpoint,
        })

#Code to create a user in the database
class CreateUserAPIView(CreateAPIView):
    serializer_class = CreateUserSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        # DRF authtoken may already create a Token via post_save on User; use get_or_create
        # to avoid IntegrityError (unique user_id on authtoken_token).
        token, _ = Token.objects.get_or_create(user=serializer.instance)
        token_data = {"token": token.key}
        return Response(
            {**serializer.data, **token_data},
            status=status.HTTP_201_CREATED,
            headers=headers
        )

class LogoutUserAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Delete the token to log out the user
        try:
            request.user.auth_token.delete()
        except Exception as e:
            # Token might already be deleted or not exist, but logout is still successful
            import sys
            print(f"Logout token deletion error: {e}", file=sys.stderr)
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)

class CheckEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        exists = User.objects.filter(
            Q(email__iexact=email) | Q(username__iexact=email)
        ).exists()
        return Response({'exists': exists}, status=status.HTTP_200_OK)


class UserSelfUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
        })

    def post(self, request):
        user = request.user
        data = request.data

        new_email = data.get('email', '').strip()
        if new_email:
            if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                return Response({'error': 'Email already in use.'}, status=status.HTTP_400_BAD_REQUEST)
            user.email = new_email
            user.save()
            return Response({'success': True, 'email': user.email})

        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        if current_password and new_password:
            if not user.check_password(current_password):
                return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)
            user.save()
            return Response({'success': True})

        return Response({'error': 'No valid update data provided.'}, status=status.HTTP_400_BAD_REQUEST)


class PreferencesOperations(viewsets.ModelViewSet):
    queryset = Preference.objects.all()
    serializer_class = PreferenceSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        _propagate_to_home_store(request.user.pk)
        return response

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        response = super().destroy(request, *args, **kwargs)
        _propagate_to_home_store(request.user.pk)
        return response

class UserPreferenceLookup(ListAPIView):
    serializer_class = PreferenceSerializer
    permission_classes = [IsAuthenticated]

    # Override get_queryset to filter preferences by the provided UserID
    def get_queryset(self):
        user_id = self.kwargs['user_id']  # Retrieve the 'user_id' from the URL
        # Check if the user exists first, and raise a 404 if not
        user = get_object_or_404(User, pk=user_id)
        return Preference.objects.filter(UserID=user_id)
    
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.generics import ListAPIView
from django.shortcuts import get_object_or_404
from .models import Drink
from .serializers import DrinkSerializer
from rest_framework.views import APIView

class DrinkOperations(viewsets.ModelViewSet):
    queryset = Drink.objects.all()
    serializer_class = DrinkSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """
        Modify the basic GET request behavior so it only returns drinks not user created
        """
        if self.action in ['update', 'retrieve', 'destroy']:
            return Drink.objects.all()
        return Drink.objects.filter(User_Created=False)

    def create(self, request, *args, **kwargs):
        # Custom logic for creating a drink (optional for customization)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """
        Custom update method to handle updating a drink's fields, favorites, and validation.
        """
        # Retrieve the drink object to be updated
        drink = self.get_object()

        # Use the serializer to validate and update the data
        serializer = self.get_serializer(drink, data=request.data)

        # Validate the data (including Ice and Size field checks)
        if serializer.is_valid():
            # If valid, update the fields
            # Explicitly update fields from request data if they exist on the drink model
            for field, value in request.data.items():
                if hasattr(drink, field):
                    setattr(drink, field, value)

            # Handle adding/removing favorites
            favorite_to_add = request.data.get("addFavorite", [])
            favorite_to_remove = request.data.get("removeFavorite", [])
            
            if favorite_to_add:
                drink.addFavorite(favorite_to_add)
            if favorite_to_remove:
                drink.removeFavorite(favorite_to_remove)

            # Save the updated drink
            drink.save()

            # Return the updated drink data using the serializer
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            # Return a 400 Bad Request if validation fails
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        # Custom logic for deleting a drink (optional for customization)
        return super().destroy(request, *args, **kwargs)

class UserDrinksLookup(ListAPIView):
    serializer_class = DrinkSerializer
    authentication_classes = [VisitingTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Retrieve drinks that are marked as favorites by the provided user ID.
        For home users: returns real Drink records from M2M.
        For visiting users: returns cached drink data.
        """
        user_id = self.kwargs['user_id']
        user = get_object_or_404(User, pk=user_id)
        return Drink.objects.filter(Favorite=user_id)

    def list(self, request, *args, **kwargs):
        user_id = self.kwargs['user_id']
        # Check if this is a visiting user
        cache = VisitingUserCache.objects.filter(
            user_id=user_id, expires_at__gt=timezone.now()
        ).first()
        if cache:
            drinks = [
                {**d, "DrinkID": d.get("cache_drink_id", d.get("home_drink_id"))}
                for d in cache.favorite_drinks
            ]
            return Response(drinks)
        # Home user: use normal queryset
        return super().list(request, *args, **kwargs)


class UserFavoriteToggleView(APIView):
    """
    PATCH /backend/users/<user_id>/favorites/<drink_id>/
    Toggles a drink's favorite status for a user.
    Handles both home users (int drink_id) and visiting users (UUID cache_drink_id).
    Body: { "action": "add" } or { "action": "remove" }
    """
    authentication_classes = [VisitingTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id, drink_id):
        action = request.data.get("action")
        if action not in ("add", "remove"):
            return Response(
                {"error": "action must be 'add' or 'remove'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if this is a visiting user (has cache entry)
        cache = VisitingUserCache.objects.filter(
            user_id=user_id, expires_at__gt=timezone.now()
        ).first()
        if cache:
            return self._toggle_visiting(request, cache, drink_id, action)

        # Home user — use Drink.Favorite M2M
        user = get_object_or_404(User, pk=user_id)
        try:
            drink = Drink.objects.get(pk=int(drink_id))
        except (Drink.DoesNotExist, ValueError):
            return Response({"error": "Drink not found"}, status=status.HTTP_404_NOT_FOUND)

        if action == "add":
            drink.Favorite.add(user)
        else:
            drink.Favorite.remove(user)
        _propagate_to_home_store(user_id)
        return Response({"favorited": action == "add", "drink_id": drink_id})

    def _toggle_visiting(self, request, cache, drink_id, action):
        if action == "add":
            # drink_id is the local DrinkID (int) created just before this call
            try:
                local_drink = Drink.objects.get(pk=int(drink_id))
            except (Drink.DoesNotExist, ValueError):
                return Response({"error": "Drink not found"}, status=status.HTTP_404_NOT_FOUND)

            cache_drink_id = str(uuid.uuid4())
            entry = {
                "cache_drink_id": cache_drink_id,
                "home_drink_id": None,
                "Name": local_drink.Name,
                "SodaUsed": local_drink.SodaUsed or [],
                "SyrupsUsed": local_drink.SyrupsUsed or [],
                "AddIns": local_drink.AddIns or [],
                "Ice": local_drink.Ice,
                "Price": float(local_drink.Price),
                "Size": local_drink.Size,
            }
            cache.favorite_drinks = cache.favorite_drinks + [entry]
            cache.save(update_fields=["favorite_drinks"])
            _propagate_to_home_store(cache.user_id)
            return Response({"favorited": True, "drink_id": cache_drink_id})
        else:
            # drink_id is cache_drink_id (UUID string) for visiting users
            cache.favorite_drinks = [
                d for d in cache.favorite_drinks
                if d.get("cache_drink_id") != drink_id
            ]
            cache.save(update_fields=["favorite_drinks"])
            _propagate_to_home_store(cache.user_id)
            return Response({"favorited": False, "drink_id": drink_id})


class SeasonalDrinkListView(ListAPIView):
    """
    GET /backend/seasonal-drinks/
    Public endpoint — no auth required.
    Returns only is_active=True seasonal drinks for the carousel.
    """
    serializer_class = SeasonalDrinkSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return SeasonalDrink.objects.filter(is_active=True)


class IngredientsListView(APIView):
    """
    GET /backend/ingredients/
    Public endpoint — returns all ingredient names from Inventory, grouped by type.
    Used by the frontend to populate drink builder dropdowns.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        sodas = list(Inventory.objects.filter(ItemType='Soda').values_list('ItemName', flat=True).order_by('ItemName'))
        syrups = list(Inventory.objects.filter(ItemType='Syrup').values_list('ItemName', flat=True).order_by('ItemName'))
        add_ins = list(Inventory.objects.filter(ItemType='Add In').values_list('ItemName', flat=True).order_by('ItemName'))
        return Response({'sodas': sodas, 'syrups': syrups, 'add_ins': add_ins})


class InventoryListAPIView(ListAPIView):
    """List all items that are not out of stock."""
    queryset = Inventory.objects.filter(Quantity__gt=0)
    serializer_class = InventorySerializer

class InventoryReportAPIView(APIView):
    """Generate an inventory report."""
    def get(self, request):
        inventory = Inventory.objects.all()
        report_data = {
            'inventory_items': [
                {
                    'InventoryID': item.InventoryID,
                    'ItemName': item.ItemName,
                    'Quantity': item.Quantity,
                    'ThresholdLevel': item.ThresholdLevel,
                }
                for item in inventory
            ],
            'total_items': inventory.count(),
            'out_of_stock': inventory.filter(Quantity=0).count(),
            'below_threshold': inventory.filter(Quantity__lte=models.F('ThresholdLevel')).count(),
        }
        return Response(report_data, status=status.HTTP_200_OK)

class InventoryUpdateAPIView(RetrieveUpdateAPIView):
    """Update inventory based on what was ordered, with warnings for empty or low stock."""
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer

    def patch(self, request, *args, **kwargs):
        item = self.get_object()  # Retrieve the specific item based on ID
        
        reset_quantity = request.data.get('reset')  # Check if the request is for a reset
        used_quantity = request.data.get('used_quantity')  # Used quantity for orders

        # Handle inventory reset
        if reset_quantity:
            # Reset the quantity to the threshold level (or a specific value)
            item.Quantity = item.ThresholdLevel  # Or you could use a custom value
            item.save()

            # Return the updated item details in the response
            return Response(self.get_serializer(item).data, status=status.HTTP_200_OK)

        # Handle normal used quantity update (for orders)
        if used_quantity is None or int(used_quantity) <= 0:
            return Response(
                {"detail": "Invalid used quantity."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if the item is already out of stock
        if item.Quantity == 0:
            return Response(
                {"detail": f"'{item.ItemName}' is already out of stock."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if the order quantity exceeds available stock
        if item.Quantity < int(used_quantity):
            return Response(
                {"detail": f"Not enough stock available for '{item.ItemName}'."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Subtract the used quantity from the current stock
        item.Quantity -= int(used_quantity)
        item.save()

        # Generate a warning if stock falls below the threshold level
        warning = None
        if item.Quantity <= item.ThresholdLevel:
            warning = f"'{item.ItemName}' stock is below the threshold level."

        # Prepare the response data
        response_data = self.get_serializer(item).data
        if warning:
            response_data['warning'] = warning

        return Response(response_data, status=status.HTTP_200_OK)


class NotificationOperations(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_id = self.request.user.id
        user = get_object_or_404(User, pk=user_id)
        # Filter notifications that are either global or specific to the user
        return Notification.objects.filter(models.Q(Global=True) | models.Q(UserID=user_id))

    def create(self, request, *args, **kwargs):
        # Custom logic for creating a notification can go here
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        # Custom logic for updating a notification can go here
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Custom logic for deleting a notification can go here
        return super().destroy(request, *args, **kwargs)
    
    def filter_by_time(self, request):
        """
        Custom endpoint to filter notifications within a specific time range for the authenticated user.
        Accepts 'start' and 'end' parameters in ISO 8601 format.
        """
        start = request.query_params.get('start')
        end = request.query_params.get('end')

        # Parse start and end times
        start_time = parse_datetime(start) if start else None
        end_time = parse_datetime(end) if end else None

        # Check and convert to timezone-aware if necessary
        if start_time and timezone.is_naive(start_time):
            start_time = timezone.make_aware(start_time)
        if end_time and timezone.is_naive(end_time):
            end_time = timezone.make_aware(end_time)

        # Validate parameters
        if not start_time or not end_time:
            return Response(
                {"error": "Both 'start' and 'end' parameters are required in ISO 8601 format."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Filter notifications by time range and for the authenticated user
        user = request.user
        notifications = Notification.objects.filter(
            Timestamp__range=(start_time, end_time),
            UserID=user
        )

        # Include global notifications if they fall within the time range
        global_notifications = Notification.objects.filter(
            Timestamp__range=(start_time, end_time),
            Global=True
        )
        notifications = notifications | global_notifications

        # Serialize and return the notifications
        serializer = self.get_serializer(notifications.distinct(), many=True)
        return Response(serializer.data)
    
class UserNotificationLookup(ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    # Override get_queryset to filter preferences by the provided UserID
    def get_queryset(self):
        user_id = self.kwargs['user_id']  # Retrieve the 'user_id' from the URL
        # Check if the user exists first, and raise a 404 if not
        user = get_object_or_404(User, pk=user_id)
        return Notification.objects.filter(UserID=user_id)

class OrderOperations(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [AllowAny]

    def patch(self, request, *args, **kwargs):
        order = self.get_object()
        drinks_to_add = request.data.get("AddDrinks", [])
        drinks_to_remove = request.data.get("RemoveDrinks", [])
        
        # Adding drinks
        if drinks_to_add:
            order.add_drinks(drinks_to_add)

        # Removing drinks
        if drinks_to_remove:
            order.remove_drinks(drinks_to_remove)
        
        serializer = self.get_serializer(order, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    # def get_permissions(self):
    #     """Only authenticated users can create, update, or delete orders."""
    #     if self.action in ['create', 'update', 'destroy']:
    #         return [IsAuthenticated()]
    #     return super().get_permissions()

    def create(self, request, *args, **kwargs):
        # Extract data from the request
        user_id = request.data.get("UserID", None)
        drinks = request.data.get("Drinks", [])
        order_status = request.data.get("OrderStatus", "processing")
        payment_status = request.data.get("PaymentStatus", "pending")
        stripe_id = request.data.get("StripeID", None)

         # Log extracted values
        print(f"UserID: {user_id}, Drinks: {drinks}, OrderStatus: {order_status}, PaymentStatus: {payment_status}, StripeID: {stripe_id}")

        # Create a new order
        order_data = {
            "UserID": user_id,
            "order_status": order_status,
            "Drinks": drinks,
            "PaymentStatus": payment_status,
            "StripeID": stripe_id,
        }

        serializer = self.get_serializer(data=order_data)
        if serializer.is_valid():
            order = serializer.save()

            # Add drinks to the order if provided
            if drinks:
                order.add_drinks(drinks)

            # Return the created order's data
            return Response(self.get_serializer(order).data, status=status.HTTP_201_CREATED)

        print("Serializer errors:", serializer.errors)
        # Handle validation errors
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

class UserOrdersLookup(ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter orders based on the user ID from the URL."""
        user_id = self.kwargs['user_id']
        user = get_object_or_404(User, pk=user_id)
        return Order.objects.filter(UserID=user)

    def perform_create(self, serializer):
        """Associate the new order with the correct user."""
        user_id = self.kwargs['user_id']
        user = get_object_or_404(User, pk=user_id)
        serializer.save(UserID=user)

class StripeConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'publishableKey': settings.STRIPE_PUBLISHABLE_KEY})


@method_decorator(csrf_exempt, name='dispatch')
class StripePaymentIntentView(View):

    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            amount = data.get("amount")
            if amount is None:
                return JsonResponse({'error': 'Amount is required.'}, status=400)
            amount = int(amount * 100)  # Stripe uses cents, so multiply dollars by 100

            # Create a new customer
            customer = stripe.Customer.create()

            # Create an ephemeral key for the customer
            ephemeral_key = stripe.EphemeralKey.create(
                customer=customer['id'],
                stripe_version='2023-10-16',
            )

            # Create a payment intent
            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency='usd',
                customer=customer['id'],
                payment_method_types=['card'],  # Accept only card payments
            )

            # Respond with the required information
            return JsonResponse({
                'paymentIntent': payment_intent.client_secret,
                'ephemeralKey': ephemeral_key.secret,
                'customer': customer.id,
                'publishableKey': settings.STRIPE_PUBLISHABLE_KEY
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

def refund_order(client_secret_or_id):
    try:
        # Extract PaymentIntent ID if a client secret is provided
        if "_secret_" in client_secret_or_id:
            payment_intent_id = client_secret_or_id.split("_secret_")[0]
        else:
            payment_intent_id = client_secret_or_id

        # Process the refund using the PaymentIntent ID
        refund = stripe.Refund.create(
            payment_intent=payment_intent_id,
        )
        print("Refund successful:", refund)
        return True

    except stripe.error.StripeError as e:
        print(f"Stripe error: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False
    
class emailAPI(APIView):
    def get(self, request, orderId):
        try:
            # Fetch order details
            order = Order.objects.get(pk=orderId)
            revenue = Revenue.objects.filter(OrderID=orderId).first()

            # Generate styled terminal output
            email_text = self.generate_email_preview(order, revenue)

            # Print styled text to the terminal
            print("\033[92m=== EMAIL PREVIEW ===\033[0m")  # Green and bold
            print(email_text)
            print("\033[92m=====================\033[0m")  # Green and bold

            return Response({"message": "Email preview generated successfully."}, status=status.HTTP_200_OK)

        except Order.DoesNotExist:
            return Response({"error": f"Order with ID {orderId} does not exist."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def generate_email_preview(self, order, revenue):
        """Generate a styled email preview for terminal output."""
        email_subject = f"Order Confirmation - Order #{order.OrderID}"
        user_info = f"Customer Name: {order.UserID.first_name}" if order.UserID else "Customer Name: Guest"

        # Generate detailed drink information
        drinks_list = "".join(
            [
                f"""  
        - {drink.Name}:\033[92m ${drink.Price:.2f} \033[0m
            Sodas: {', '.join(drink.SodaUsed) if drink.SodaUsed else 'None'}
            Syrups: {', '.join(drink.SyrupsUsed) if drink.SyrupsUsed else 'None'}
            Add-ins: {', '.join(drink.AddIns) if drink.AddIns else 'None'}\n"""
                for drink in order.Drinks.all()
            ]
        )

        total_amount = f"${revenue.TotalAmount:.2f}" if revenue else "N/A"
        order_status = order.OrderStatus.capitalize()
        payment_status = order.PaymentStatus.capitalize()

        # Styled email content using ANSI escape codes
        email_content = f"""
        ==============================================
        \033[96m{email_subject}\033[0m
        ==============================================

        \033[93mOrder Details:\033[0m  
        {user_info}  
        Payment Status: \033[94m{payment_status}\033[0m  
        Pickup Time: {order.PickupTime.strftime('%Y-%m-%d %H:%M:%S') if order.PickupTime else 'Not Set'}

        \033[93mDrinks Ordered:\033[0m 
        {drinks_list if drinks_list else '  No drinks added to this order.'}

        \033[93mTotal Amount:\033[0m  
        \033[92m{total_amount}\033[0m 

        Thank you for ordering with us!

        ==============================================
        """
        return email_content

    
class GenerateAIDrink(APIView):
    permission_classes = [AllowAny]

    def get(self, request, user_id=None):
        try:
            if user_id:
                # Generate drink for account user
                response_data = self.generate_account_user(user_id)
            else:
                # Generate drink for general user
                response_data = self.generate_general_user()
            if response_data is None:
                return Response({"message": "AI recommendations temporarily unavailable"}, status=200)
            return Response(response_data)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
    
    def generate_account_user(self, user_id):
        """Generate AI drink for a registered user using their preferences and order history."""
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            # Visiting user — shadow pk ≠ home user_id; no local User row.
            # Use cached preferences if available, otherwise fall back to generic generation.
            cache = VisitingUserCache.objects.filter(
                user_id=user_id, expires_at__gt=timezone.now()
            ).first()
            if cache and cache.preferences:
                return self.generate_response_data(cache.preferences, user_created=True)
            return self.generate_general_user()

        preferences = Preference.objects.filter(UserID=user)
        preferences_list = []

        if preferences.exists():
            for pref in preferences:
                preferences_list.append(pref.Preference)
        else:
            preferences_list = ["mango", "peach", "vanilla", "salted caramel", "orange", "lavender", "peppermint", "blue raspberry"]

        # Fetch last 5 completed orders
        recent_orders = Order.objects.filter(
            UserID=user, OrderStatus='completed'
        ).order_by('-CreationTime').prefetch_related('Drinks')[:5]

        order_history = []
        for order in recent_orders:
            for drink in order.Drinks.all():
                order_history.append({
                    'syrups': drink.SyrupsUsed or [],
                    'soda': drink.SodaUsed[0] if drink.SodaUsed and len(drink.SodaUsed) > 0 else '',
                    'addins': drink.AddIns or [],
                })

        print("User") # Test code
        return self.generate_response_data(preferences_list, user_created=True, order_history=order_history)

    def generate_general_user(self):
        """Generate AI drink for a general user with hardcoded preferences."""
        preferences = ["mango", "peach", "vanilla", "salted caramel", "orange", "lavender", "peppermint", "blue raspberry"]
        print("General") # Test code
        return self.generate_response_data(preferences, user_created=False)

    def generate_response_data(self, preferences, user_created, order_history=None):
        """Helper function to generate response data."""
        result = generate_soda(preferences, order_history=order_history)
        if result is None:
            return None
        return {
            'SyrupsUsed': result["syrups"],
            'SodaUsed': result["soda"][0],
            'AddIns': result["addins"],
            'Size': "24oz",
            'Ice': "regular",
            "UserCreated": user_created,
        }


class RevenueViewSet(viewsets.ModelViewSet):
    """
    A viewset for listing, retrieving, creating, and filtering revenue records.
    """
    queryset = Revenue.objects.all()
    serializer_class = RevenueSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        """
        Custom create method to ensure the total amount is calculated if not provided.
        """
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """
        Custom update method to ensure the total amount is recalculated when updating the revenue.
        """
        revenue_instance = self.get_object()  # Retrieve the specific revenue instance

        # Check if 'TotalAmount' is provided in the request
        if 'TotalAmount' in request.data:
            # Update TotalAmount with the provided value
            revenue_instance.TotalAmount = request.data['TotalAmount']
        else:
            # Calculate and set the total amount if it wasn't provided
            revenue_instance.calculate_total_amount()

        revenue_instance.save()

        # Proceed with the standard update process
        return super().update(request, *args, **kwargs)


class NationalRevenueView(APIView):
    """
    GET /backend/revenues/national/
    Fans out to all configured hubs in parallel; returns per-hub and grand total.
    Restricted to superusers only.
    """
    permission_classes = [IsSuperUser]

    def get(self, request):
        import concurrent.futures

        def query_hub(region, hub_url):
            if not hub_url:
                return None
            try:
                resp = requests.get(
                    f"{hub_url}/backend/api/hub/revenue/",
                    headers={'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}'},
                    timeout=10,
                )
                if resp.status_code == 200:
                    return resp.json()
            except requests.RequestException:
                return None

        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=7) as executor:
            futures = {
                executor.submit(query_hub, region, url): region
                for region, url in settings.HUB_ENDPOINTS.items()
                if url
            }
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                if result:
                    results.append(result)

        grand_total = sum(r.get('total_revenue', 0) for r in results)
        return Response({
            'grand_total': round(grand_total, 2),
            'by_region':   results,
        })


class UserOperations(viewsets.ModelViewSet):
    permission_classes = [IsSuperUser]
    serializer_class = GetUserSerializer

    def get(self, request):
        userList = User.objects.all()
        serializer = self.serializer_class(userList, many=True)
        return Response(serializer.data)

    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user.delete()
            return JsonResponse({"message":"User deleted successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return JsonResponse({'Error': str(e)}, status=400)

    def edit(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)

            data = json.loads(request.body)
            edits = data.get('edits', {})

            username = edits.get("username", None)
            first_name = edits.get("firstName", None)
            last_name = edits.get("lastName", None)
            password = edits.get("password", None)
            role = edits.get("role", None)

            if (user.username != username and username != "unchanged" and username):
                user.username = username

            if (user.first_name != first_name and first_name != "unchanged" and first_name):
                user.first_name = first_name

            if (user.last_name != last_name and last_name != "unchanged" and last_name):
                user.last_name = last_name

            if (user.password != password and password != "unchanged" and password):
                user.set_password(password)
                print("Password updated")

            if (role != "unchanged" and role):
                if (role == "user"):
                    user.is_staff = False
                    user.is_superuser = False
                elif (role == "staff"):
                    user.is_staff = True
                    user.is_superuser = False
                elif (role == "admin"):
                    user.is_staff = False
                    user.is_superuser = True

            user.save()
            return JsonResponse({"message":"User edited successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return JsonResponse({'Error': str(e)}, status=400)
        
class MachineOperations(viewsets.ModelViewSet):
    queryset = Machine.objects.all()
    serializer_class = MachineSerializer
    permission_classes = [IsAuthenticated]

    def update_status(self, request, pk=None):
        machine = self.get_object()
        new_status = request.data.get('status')

        if new_status not in dict(Machine.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        machine.status = new_status
        machine.save()
        return Response({'status': machine.status}, status=status.HTTP_200_OK)
    
class ScheduleOperations(viewsets.ModelViewSet):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated]
    
    # Returns all the schedules associated with a user
    def get_user_schedules(self, request):
        user_schedules = Schedule.objects.filter(assigned_to=request.user)
        serializer = self.get_serializer(user_schedules, many=True)
        return Response(serializer.data)

# ─────────────────────────────────────────────
# ADMIN DASHBOARD VIEWS
# ─────────────────────────────────────────────

from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.pagination import PageNumberPagination
from .serializers import (PermissionSerializer, RoleSerializer, UserListSerializer,
                          UserCreateUpdateSerializer, AuditLogSerializer)
from .models import Permission, Role, UserProfile, AuditLog
from .permissions import IsAdminUser


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class PermissionListView(ListCreateAPIView):
    """List all permissions, grouped by category."""
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return Permission.objects.all().order_by('category', 'label')


class RoleListCreateView(ListCreateAPIView):
    """List all roles or create a new custom role."""
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def perform_create(self, serializer):
        role = serializer.save(is_builtin=False)
        # Log the action
        AuditLog.objects.create(
            actor=self.request.user,
            action='Role Created',
            target_type='role',
            target_id=role.id,
            target_repr=role.name,
            ip_address=self.get_client_ip(),
            result='success'
        )

    def get_client_ip(self):
        """Extract client IP from request."""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip


class RoleDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a specific role."""
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAdminUser]

    def perform_update(self, serializer):
        role = serializer.instance
        if role.is_builtin:
            raise PermissionDenied("Cannot edit built-in roles.")
        serializer.save()
        AuditLog.objects.create(
            actor=self.request.user,
            action='Role Updated',
            target_type='role',
            target_id=role.id,
            target_repr=role.name,
            ip_address=self.get_client_ip(),
            result='success'
        )

    def perform_destroy(self, instance):
        if instance.is_builtin:
            raise PermissionDenied("Cannot delete built-in roles.")
        if instance.users.exists():
            raise PermissionDenied("Cannot delete role with assigned users.")
        instance.delete()
        AuditLog.objects.create(
            actor=self.request.user,
            action='Role Deleted',
            target_type='role',
            target_id=instance.id,
            target_repr=instance.name,
            ip_address=self.get_client_ip(),
            result='success'
        )

    def get_client_ip(self):
        """Extract client IP from request."""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip


class UserListView(ListCreateAPIView):
    """List all users with filtering and search."""
    queryset = UserProfile.objects.select_related('user', 'role', 'region')
    serializer_class = UserListSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = UserProfile.objects.select_related('user', 'role', 'region')

        # Filter by status
        status = self.request.query_params.get('status')
        if status == 'active':
            qs = qs.filter(user__is_active=True, is_deleted=False)
        elif status == 'disabled':
            qs = qs.filter(user__is_active=False, is_deleted=False)
        elif status == 'deleted':
            qs = qs.filter(is_deleted=True)

        # Search by name or email
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(user__first_name__icontains=search) |
                models.Q(user__last_name__icontains=search) |
                models.Q(user__email__icontains=search)
            )

        return qs.order_by('-user__date_joined')


class UserCreateView(ListCreateAPIView):
    """Create a new user."""
    queryset = UserProfile.objects.all()
    serializer_class = UserCreateUpdateSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        profile = serializer.save()
        AuditLog.objects.create(
            actor=self.request.user,
            action='User Created',
            target_type='user',
            target_id=profile.user.id,
            target_repr=profile.user.email,
            ip_address=self.get_client_ip(),
            result='success'
        )

    def get_client_ip(self):
        """Extract client IP from request."""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip


class UserDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a specific user."""
    queryset = UserProfile.objects.select_related('user', 'role', 'region')
    serializer_class = UserCreateUpdateSerializer
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return UserListSerializer
        return UserCreateUpdateSerializer

    def perform_update(self, serializer):
        profile = serializer.save()
        AuditLog.objects.create(
            actor=self.request.user,
            action='User Updated',
            target_type='user',
            target_id=profile.user.id,
            target_repr=profile.user.email,
            ip_address=self.get_client_ip(),
            result='success'
        )

    def perform_destroy(self, instance):
        """Soft delete: mark as deleted and deactivate."""
        instance.is_deleted = True
        instance.user.is_active = False
        instance.save()
        instance.user.save()
        AuditLog.objects.create(
            actor=self.request.user,
            action='User Deleted',
            target_type='user',
            target_id=instance.user.id,
            target_repr=instance.user.email,
            ip_address=self.get_client_ip(),
            result='success'
        )

    def get_client_ip(self):
        """Extract client IP from request."""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip


class UserDisableView(APIView):
    """Disable a user account."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            profile = UserProfile.objects.get(pk=pk)
            profile.user.is_active = False
            profile.user.save()
            AuditLog.objects.create(
                actor=request.user,
                action='User Disabled',
                target_type='user',
                target_id=profile.user.id,
                target_repr=profile.user.email,
                ip_address=self.get_client_ip(request),
                result='success'
            )
            return Response({'message': 'User disabled'}, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    def get_client_ip(self, request):
        """Extract client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class UserEnableView(APIView):
    """Enable a user account."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            profile = UserProfile.objects.get(pk=pk)
            profile.user.is_active = True
            profile.user.save()
            AuditLog.objects.create(
                actor=request.user,
                action='User Enabled',
                target_type='user',
                target_id=profile.user.id,
                target_repr=profile.user.email,
                ip_address=self.get_client_ip(request),
                result='success'
            )
            return Response({'message': 'User enabled'}, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    def get_client_ip(self, request):
        """Extract client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class AuditLogListView(ListCreateAPIView):
    """List audit logs with filtering by date, action, and actor."""
    queryset = AuditLog.objects.select_related('actor').order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = AuditLog.objects.select_related('actor').order_by('-timestamp')

        # Filter by date range
        start_date = self.request.query_params.get('start')
        end_date = self.request.query_params.get('end')
        if start_date:
            from datetime import datetime
            qs = qs.filter(timestamp__gte=datetime.fromisoformat(start_date))
        if end_date:
            from datetime import datetime
            qs = qs.filter(timestamp__lte=datetime.fromisoformat(end_date))

        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action__icontains=action)

        # Filter by actor
        actor = self.request.query_params.get('actor')
        if actor:
            qs = qs.filter(actor__username__icontains=actor)

        return qs


class AdminKPIView(APIView):
    """Return KPI metrics for the admin dashboard."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from backend.models import StoreInventoryItem
        from django.db.models import Q, F, IntegerField, ExpressionWrapper

        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        disabled_users = User.objects.filter(is_active=False).count()
        deleted_users = UserProfile.objects.filter(is_deleted=True).count()
        manager_count = UserProfile.objects.filter(role__name='Manager').count()
        admin_count = User.objects.filter(is_staff=True).count()

        # Inventory health KPIs
        total_items = StoreInventoryItem.objects.count()
        healthy_items = StoreInventoryItem.objects.filter(quantity__gte=F('threshold')).count()
        inventory_health_pct = round((healthy_items / total_items * 100)) if total_items > 0 else 100

        critical_stores = StoreInventoryItem.objects.filter(
            Q(quantity__lt=F('threshold')) | Q(days_remaining__lte=3)
        ).values('store').distinct().count()

        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'disabled_users': disabled_users,
            'deleted_users': deleted_users,
            'manager_count': manager_count,
            'admin_count': admin_count,
            'inventory_health_pct': inventory_health_pct,
            'critical_stores': critical_stores,
        })


# ─────────────────────────────────────────────
# STORES & SUPPLY HUBS VIEWS
# ─────────────────────────────────────────────

class RegionListView(ListAPIView):
    """List all regions."""
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [IsAuthenticated]


class AdminStoreListCreateView(ListCreateAPIView):
    """List and create stores (Super Admin)."""
    serializer_class = StoreRegistrySerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        queryset = StoreRegistry.objects.all()
        region = self.request.query_params.get('region')
        status = self.request.query_params.get('status')
        search = self.request.query_params.get('search')

        if region:
            queryset = queryset.filter(region__name=region)
        if status:
            queryset = queryset.filter(status=status)
        if search:
            queryset = queryset.filter(store_name__icontains=search)

        return queryset

    def perform_create(self, serializer):
        serializer.save()


class AdminStoreDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a store (Super Admin)."""
    queryset = StoreRegistry.objects.all()
    serializer_class = StoreRegistrySerializer
    permission_classes = [IsSuperUser]


class AdminSupplyHubListCreateView(ListCreateAPIView):
    """List and create supply hubs (Super Admin)."""
    serializer_class = SupplyHubSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        queryset = SupplyHub.objects.all()
        region = self.request.query_params.get('region')

        if region:
            queryset = queryset.filter(region__name=region)

        return queryset

    def perform_create(self, serializer):
        serializer.save()


class AdminSupplyHubDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a supply hub (Super Admin)."""
    queryset = SupplyHub.objects.all()
    serializer_class = SupplyHubSerializer
    permission_classes = [IsSuperUser]


class RegionalStatusView(APIView):
    """Get regional aggregation stats (Super Admin)."""
    permission_classes = [IsSuperUser]

    def get(self, request):
        from django.db.models import Count, Q

        regional_stats = []
        regions = Region.objects.all()

        for region in regions:
            online_count = StoreRegistry.objects.filter(
                region=region,
                status='active'
            ).count()
            unreachable_count = StoreRegistry.objects.filter(
                region=region,
                status='unreachable'
            ).count()

            regional_stats.append({
                'id': region.id,
                'name': region.display_name,
                'online_stores': online_count,
                'unreachable_stores': unreachable_count,
            })

        return Response(regional_stats)


class LogisticsStoreListView(ListAPIView):
    """List stores with filtering (Logistics Manager)."""
    serializer_class = StoreRegistrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from backend.models import StoreInventoryItem
        from django.db.models import Q, F, ExpressionWrapper, IntegerField

        queryset = StoreRegistry.objects.all()
        health = self.request.query_params.get('health')
        region = self.request.query_params.get('region')
        search = self.request.query_params.get('search')

        if health:
            if health == 'critical':
                critical_store_ids = StoreInventoryItem.objects.filter(
                    Q(quantity__lt=F('threshold')) | Q(days_remaining__lte=3)
                ).values_list('store_id', flat=True).distinct()
                queryset = queryset.filter(id__in=critical_store_ids)
            elif health == 'low':
                low_store_ids = StoreInventoryItem.objects.filter(
                    quantity__lt=ExpressionWrapper(
                        F('threshold') * 2, output_field=IntegerField()
                    )
                ).exclude(
                    Q(quantity__lt=F('threshold')) | Q(days_remaining__lte=3)
                ).values_list('store_id', flat=True).distinct()
                queryset = queryset.filter(id__in=low_store_ids)
            elif health == 'good':
                pass  # all stores

        if region:
            queryset = queryset.filter(region__name=region)

        if search:
            queryset = queryset.filter(store_name__icontains=search)

        return queryset


class LogisticsStoreDetailView(ListAPIView):
    """Get store detail with related data (Logistics Manager)."""
    serializer_class = StoreRegistrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        pk = self.kwargs.get('pk')
        return StoreRegistry.objects.filter(pk=pk)


class LogisticsCriticalStoresView(ListAPIView):
    """Get top 5 critical stores (Logistics Manager)."""
    serializer_class = StoreRegistrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Stub: return stores with status='unreachable' ordered by last_heartbeat
        return StoreRegistry.objects.filter(
            status='unreachable'
        ).order_by('last_heartbeat')[:5]


class LogisticsHubStatusView(ListAPIView):
    """Get hub status for logistics manager's region (Logistics Manager)."""
    queryset = SupplyHub.objects.all()
    serializer_class = SupplyHubSerializer
    permission_classes = [IsAuthenticated]


# ─────────────────────────────────────────────
# INVENTORY VIEWS
# ─────────────────────────────────────────────

class AdminHubInventoryListView(ListCreateAPIView):
    """List and create hub inventory items (Super Admin)."""
    serializer_class = HubInventoryItemSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        hub_pk = self.kwargs.get('hub_pk')
        queryset = HubInventoryItem.objects.filter(hub_id=hub_pk)
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset


class AdminHubInventoryDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a hub inventory item (Super Admin)."""
    serializer_class = HubInventoryItemSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        hub_pk = self.kwargs.get('hub_pk')
        return HubInventoryItem.objects.filter(hub_id=hub_pk)


class AdminStoreInventoryListView(ListCreateAPIView):
    """List and create store inventory items (Super Admin)."""
    serializer_class = StoreInventoryItemSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        store_pk = self.kwargs.get('store_pk')
        queryset = StoreInventoryItem.objects.filter(store_id=store_pk)
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset


class AdminStoreInventoryDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a store inventory item (Super Admin)."""
    serializer_class = StoreInventoryItemSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        store_pk = self.kwargs.get('store_pk')
        return StoreInventoryItem.objects.filter(store_id=store_pk)


class LogisticsHubInventoryListView(ListAPIView):
    """List hub inventory items with filtering (Logistics Manager)."""
    serializer_class = HubInventoryItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        hub_pk = self.kwargs.get('hub_pk')
        queryset = HubInventoryItem.objects.filter(hub_id=hub_pk)
        category = self.request.query_params.get('category')
        health = self.request.query_params.get('health')
        search = self.request.query_params.get('search')

        if category:
            queryset = queryset.filter(category=category)
        if health:
            if health == 'critical':
                queryset = queryset.filter(quantity__lt=F('threshold'))
            elif health == 'low':
                queryset = queryset.filter(
                    quantity__lt=ExpressionWrapper(
                        F('threshold') * 2, output_field=models.IntegerField()
                    )
                ).exclude(quantity__lt=F('threshold'))
        if search:
            queryset = queryset.filter(item_name__icontains=search)

        return queryset


class LogisticsStoreInventoryListView(ListAPIView):
    """List store inventory items (Logistics Manager)."""
    serializer_class = StoreInventoryItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        store_pk = self.kwargs.get('store_pk')
        queryset = StoreInventoryItem.objects.filter(store_id=store_pk)
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset


class ManagerInventoryListView(ListAPIView):
    """List inventory for the logged-in manager's assigned store (Manager)."""
    serializer_class = StoreInventoryItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from backend.models import ManagerProfile
        user = self.request.user
        try:
            manager = ManagerProfile.objects.get(user=user)
            if not manager.assigned_store:
                return StoreInventoryItem.objects.none()
            queryset = StoreInventoryItem.objects.filter(store=manager.assigned_store)
        except ManagerProfile.DoesNotExist:
            return StoreInventoryItem.objects.none()

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        return queryset


# ─────────────────────────────────────────────
# SUPPLY REQUEST VIEWS
# ─────────────────────────────────────────────

class LogisticsSupplyRequestListView(ListAPIView):
    """List all supply requests with optional filters (status, store, hub, urgency)"""
    permission_classes = [IsAuthenticated]
    serializer_class = SupplyRequestSerializer

    def get_queryset(self):
        qs = SupplyRequest.objects.all().order_by('-created_at')
        for param in ('status', 'store', 'hub', 'urgency'):
            val = self.request.query_params.get(param)
            if val:
                qs = qs.filter(**{param: val})
        return qs


class LogisticsSupplyRequestDetailView(RetrieveUpdateAPIView):
    """Retrieve or update (approve/deny/fulfill) a supply request"""
    permission_classes = [IsAuthenticated]
    serializer_class = SupplyRequestSerializer
    queryset = SupplyRequest.objects.all()

    def perform_update(self, serializer):
        new_status = self.request.data.get('status')
        instance = serializer.save()

        # Update status and related fields
        if new_status:
            instance.status = new_status
            if new_status == 'approved':
                instance.approved_by = self.request.user
                instance.approved_at = timezone.now()
            elif new_status == 'fulfilled':
                instance.fulfilled_at = timezone.now()
            instance.save()


class ManagerSupplyRequestListCreateView(ListCreateAPIView):
    """List manager's store supply requests or create a new one"""
    permission_classes = [IsAuthenticated]
    serializer_class = SupplyRequestSerializer

    def get_queryset(self):
        try:
            profile = ManagerProfile.objects.get(user=self.request.user)
            qs = SupplyRequest.objects.filter(store_id=profile.assigned_store_id).order_by('-created_at')
            status_filter = self.request.query_params.get('status')
            if status_filter:
                qs = qs.filter(status=status_filter)
            return qs
        except ManagerProfile.DoesNotExist:
            return SupplyRequest.objects.none()

    def perform_create(self, serializer):
        try:
            profile = ManagerProfile.objects.get(user=self.request.user)
            serializer.save(store_id=profile.assigned_store_id, created_by=self.request.user)
        except ManagerProfile.DoesNotExist:
            raise PermissionDenied("Manager profile not found")


class ManagerSupplyRequestDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve or cancel (delete) a manager's pending supply request"""
    permission_classes = [IsAuthenticated]
    serializer_class = SupplyRequestSerializer

    def get_queryset(self):
        try:
            profile = ManagerProfile.objects.get(user=self.request.user)
            return SupplyRequest.objects.filter(
                store_id=profile.assigned_store_id,
                status='pending'
            )
        except ManagerProfile.DoesNotExist:
            return SupplyRequest.objects.none()


class AdminSupplyRequestListView(ListAPIView):
    """List all supply requests (for admin KPI dashboard)"""
    permission_classes = [IsAdminUser]
    serializer_class = SupplyRequestSerializer

    def get_queryset(self):
        qs = SupplyRequest.objects.all().order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


# ─────────────────────────────────────────────
# DELIVERY VIEWS
# ─────────────────────────────────────────────

class LogisticsDeliveryListCreateView(ListCreateAPIView):
    """List all deliveries with filters, or create a new one."""
    permission_classes = [IsAuthenticated]
    serializer_class = DeliverySerializer

    def get_queryset(self):
        qs = Delivery.objects.prefetch_related('stores').select_related(
            'hub', 'driver'
        ).order_by('-created_at')

        status_filter = self.request.query_params.get('status')
        hub_filter    = self.request.query_params.get('hub')
        store_filter  = self.request.query_params.get('store')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if hub_filter:
            qs = qs.filter(hub_id=hub_filter)
        if store_filter:
            qs = qs.filter(stores__id=store_filter)

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class LogisticsDeliveryDetailView(RetrieveUpdateAPIView):
    """Retrieve or update (status transition) a delivery."""
    permission_classes = [IsAuthenticated]
    serializer_class = DeliverySerializer
    queryset = Delivery.objects.prefetch_related('stores').select_related(
        'hub', 'driver'
    )

    def perform_update(self, serializer):
        serializer.save()


class LogisticsDeliveryKPIView(APIView):
    """Return deliveries KPI counts for the Overview dashboard."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        in_transit_count = Delivery.objects.filter(
            status__in=['in_transit', 'scheduled']
        ).count()
        return Response({'deliveriesInTransit': in_transit_count})


class LogisticsDriverListView(ListAPIView):
    """Return list of users that can be assigned as drivers."""
    permission_classes = [IsAuthenticated]
    serializer_class = DriverSerializer

    def get_queryset(self):
        # Return active non-superuser users as potential drivers.
        return User.objects.filter(
            is_active=True, is_superuser=False
        ).order_by('first_name', 'last_name')

