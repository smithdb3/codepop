from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import F
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
from .models import Preference, Drink, Inventory, Notification, Order, Revenue, UserCache, EventQueue, VisitingSession, HubRegistry, StoreRegistry
from datetime import datetime, timedelta, timezone as dt_timezone
from .serializers import CreateUserSerializer, GetUserSerializer, PreferenceSerializer, DrinkSerializer, InventorySerializer, NotificationSerializer, OrderSerializer, RevenueSerializer
from rest_framework.permissions import IsAuthenticated, IsAdminUser
import stripe
import requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views import View #maybe delete these three?
from django.utils.decorators import method_decorator
import json
from rest_framework.decorators import action
from django.utils.dateparse import parse_datetime
from .drinkAI import generate_soda
from rest_framework.permissions import BasePermission
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

# ============================================================================
# Helper Functions for Distributed System & Visiting User Auth
# ============================================================================

def _get_node_secret():
    """
    Return per-node secret from HubRegistry if available, else global INTER_NODE_SECRET.
    Falls back to global secret during bootstrap or if hub is not yet registered.
    """
    try:
        hub_reg = HubRegistry.objects.filter(is_active=True).first()
        if hub_reg and hub_reg.issued_secret:
            return hub_reg.issued_secret
    except Exception:
        pass
    return settings.INTER_NODE_SECRET


def _broadcast_user_lookup(email, requesting_store_id):
    """
    Broadcast a user-lookup POST to all peer hubs in parallel.
    Returns the first successful 'found' response payload, or None.
    One hub being down does not block the others (timeout=5s per hub).
    """
    if not settings.PEER_HUB_URLS:
        return None

    def query_one_hub(peer_url):
        try:
            resp = requests.post(
                f"{peer_url.rstrip('/')}/backend/internode/user-lookup/",
                json={"email": email, "requesting_store_id": requesting_store_id},
                headers={"Authorization": f"NodeToken {settings.INTER_NODE_SECRET}"},
                timeout=5,
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "found":
                    return data
        except Exception as e:
            logger.warning("Peer hub user-lookup failed (%s): %s", peer_url, e)
        return None

    with ThreadPoolExecutor(max_workers=len(settings.PEER_HUB_URLS)) as executor:
        futures = {executor.submit(query_one_hub, url): url for url in settings.PEER_HUB_URLS}
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                return result
    return None


def _broadcast_hub_store_location(email):
    """
    Broadcast a store-location GET to all peer hubs in parallel.
    Returns the first successful 'found' response payload, or None.
    """
    if not settings.PEER_HUB_URLS:
        return None

    def query_one_hub(peer_url):
        try:
            resp = requests.get(
                f"{peer_url.rstrip('/')}/backend/hub/store-location/",
                params={"email": email},
                headers={"Authorization": f"NodeToken {_get_node_secret()}"},
                timeout=5,
            )
            if resp.status_code == 200 and resp.json().get("status") == "found":
                return resp.json()
        except Exception as e:
            logger.warning("Peer hub store-location failed (%s): %s", peer_url, e)
        return None

    with ThreadPoolExecutor(max_workers=len(settings.PEER_HUB_URLS)) as executor:
        futures = {executor.submit(query_one_hub, url): url for url in settings.PEER_HUB_URLS}
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                return result
    return None


def _broadcast_hub_mesh_user_location(email):
    """
    Hub-to-hub: broadcast GET hub-mesh/user-location to all PEER_HUB_URLS.
    Returns first 'found' payload with store_id, api_endpoint, user_id, home_store_id, home_store_endpoint, or None.
    """
    if not getattr(settings, "PEER_HUB_URLS", None):
        return None

    def query_one(peer_url):
        try:
            resp = requests.get(
                f"{peer_url.rstrip('/')}/backend/hub-mesh/user-location/",
                params={"email": email},
                headers={"Authorization": f"NodeToken {_get_node_secret()}"},
                timeout=5,
            )
            if resp.status_code == 200 and resp.json().get("status") == "found":
                return resp.json()
        except Exception as e:
            logger.warning("Hub-mesh user-location failed (%s): %s", peer_url, e)
        return None

    with ThreadPoolExecutor(max_workers=len(settings.PEER_HUB_URLS)) as executor:
        futures = {executor.submit(query_one, url): url for url in settings.PEER_HUB_URLS}
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                return result
    return None


def _discover_home_store(email):
    """
    Discover the home store endpoint for a user email.
    Checks local UserCache first, then queries the hub.
    Returns home_store_endpoint string, or None if not found.
    """
    # Step 1: Check local routing cache
    try:
        entry = UserCache.objects.get(user_email=email, expires_at__gt=timezone.now())
        if entry.home_store_endpoint:
            return entry.home_store_endpoint
    except UserCache.DoesNotExist:
        pass

    # Step 2: Query hub for cross-region discovery
    if not settings.HUB_URL:
        return None

    try:
        resp = requests.post(
            f"{settings.HUB_URL.rstrip('/')}/backend/internode/user-lookup/",
            json={"email": email, "requesting_store_id": int(settings.STORE_ID)},
            headers={"Authorization": f"NodeToken {_get_node_secret()}"},
            timeout=5,
        )
        if resp.status_code == 200 and resp.json().get("status") == "found":
            data = resp.json()
            endpoint = data.get("home_store_endpoint")
            # Cache the routing pointer locally
            UserCache.objects.update_or_create(
                user_email=email,
                defaults={
                    "user_id": data.get("user_id"),
                    "home_store_id": data.get("home_store_id", 0),
                    "home_store_endpoint": endpoint,
                    "expires_at": timezone.now() + timedelta(hours=24),
                }
            )
            return endpoint
    except Exception:
        pass

    return None


class IsSuperUser(BasePermission):
    """
    Custom permission to allow access only to superusers.
    """

    def has_permission(self, request, view):
        # Check if the user is authenticated and a superuser
        return request.user and request.user.is_authenticated and request.user.is_superuser
    
#Custom login token endpoint with JWT support for visiting users
class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})

        # --- Step 1: Try local authentication (home store users) ---
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data['user']
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user_id': user.pk,
                'first_name': user.first_name,
                'is_admin': user.is_superuser,
                'is_manager': user.is_staff,
            })
        except Exception as e:
            pass  # Fall through to visiting-user path

        # --- Step 2: Visiting user path (email-based, JWT auth from home store) ---
        email = request.data.get('username')
        password = request.data.get('password')

        if not (email and '@' in str(email)):
            # Not an email login, re-raise original error
            serializer.is_valid(raise_exception=True)

        # Step 2a: Discover home store endpoint
        home_endpoint = _discover_home_store(email)
        if not home_endpoint:
            return Response(
                {'error': 'User not found or home store unreachable.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Step 2b: Forward to home store's verify-credentials (password checked only at home store)
        try:
            node_secret = _get_node_secret()
            resp = requests.post(
                f"{home_endpoint.rstrip('/')}/backend/internode/verify-credentials/",
                json={
                    'email': email,
                    'password': password,
                    'requesting_store_id': request.node_identity.get('store_id'),
                },
                headers={'Authorization': f'NodeToken {node_secret}'},
                timeout=5,
            )
        except requests.RequestException:
            return Response(
                {'error': 'Home store unreachable. Please try again later.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        if resp.status_code != 200 or not resp.json().get('jwt'):
            # Authentication failed at home store
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        data = resp.json()
        jwt_token = data['jwt']

        # Step 2c: Validate JWT locally
        from .internode_auth import jwt_verify
        try:
            payload = jwt_verify(jwt_token, settings.INTER_NODE_SECRET)
        except Exception:
            return Response(
                {'error': 'Home store issued invalid token.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Step 2d: Get or create shadow user locally (for DRF token compatibility)
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': payload.get('first_name', ''),
                'last_name': payload.get('last_name', ''),
            }
        )
        if created:
            user.set_unusable_password()
            user.save()

        # Step 2e: Create VisitingSession linking local DRF token to JWT
        token, _ = Token.objects.get_or_create(user=user)
        VisitingSession.objects.update_or_create(
            token=token,
            defaults={
                'canonical_user_id': payload['user_id'],
                'home_store_id': payload.get('home_store_id', 0),
                'home_store_endpoint': payload['home_store_endpoint'],
                'jwt_payload': payload,
                'jwt_expires_at': datetime.fromtimestamp(payload['exp'], tz=dt_timezone.utc),
            }
        )

        return Response({
            'token': token.key,
            'user_id': payload['user_id'],   # CANONICAL home-store pk
            'first_name': payload.get('first_name', ''),
            'is_admin': payload.get('is_admin', False),
            'is_manager': payload.get('is_manager', False),
        })

def _get_user_with_cache_fallback(user_id):
    """
    Lookup a user by canonical ID.
    - Local user → return User object (is_from_cache=False)
    - Visiting user with active VisitingSession → return jwt_payload dict (is_from_cache=True)
    - Not found → raise Http404
    """
    from django.http import Http404

    # Local user first
    try:
        return (User.objects.get(pk=user_id), False)
    except User.DoesNotExist:
        pass

    # Visiting user: find VisitingSession by canonical_user_id
    session = VisitingSession.objects.filter(
        canonical_user_id=user_id,
        jwt_expires_at__gt=timezone.now()
    ).select_related('token__user').first()
    if session:
        return (session.jwt_payload, True)

    raise Http404(f"User {user_id} not found")


def _refresh_user_cache(user):
    """
    Update the routing cache entry for a home-store user.
    This user is a home user at the current store, so cache a routing pointer to this store.
    """
    UserCache.objects.update_or_create(
        user_email=user.email,
        defaults={
            "user_id": user.pk,
            "home_store_id": int(settings.STORE_ID),
            "home_store_endpoint": settings.API_ENDPOINT,
            "expires_at": timezone.now() + timedelta(days=365 * 10),
        }
    )


#Code to create a user in the database
class CreateUserAPIView(CreateAPIView):
    serializer_class = CreateUserSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        # We create a token than will be used for future auth
        token = Token.objects.create(user=serializer.instance)
        token_data = {
            "token": token.key,
            "user_id": serializer.instance.pk,
            "first_name": serializer.instance.first_name,
        }

        # Auto-create UserCache entry for newly registered user
        _refresh_user_cache(serializer.instance)

        # Queue routing pointer sync to upstream hub (store→hub; HUB_URL is UPSTREAM_HUB_URL for stores)
        if getattr(settings, "UPSTREAM_HUB_URL", None):
            target = (getattr(settings, "UPSTREAM_HUB_URL", None)).rstrip("/")
            EventQueue.objects.create(
                event_type="user_sync",
                status="pending",
                target_node=f"{target}/backend/internode/user-sync/",
                payload={
                    "email": serializer.instance.email,
                    "user_id": serializer.instance.pk,
                    "home_store_id": int(settings.STORE_ID),
                    "home_store_endpoint": settings.API_ENDPOINT,
                },
            )

        return Response(
            {**serializer.data, **token_data},
            status=status.HTTP_201_CREATED,
            headers=headers
        )

class LogoutUserAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Delete the token to log out the user
        request.user.auth_token.delete()
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
    
class PreferencesOperations(viewsets.ModelViewSet):
    queryset = Preference.objects.all()
    serializer_class = PreferenceSerializer
    permission_classes = [IsAuthenticated]

    def _get_visiting_session(self, request):
        """Return VisitingSession if current user is visiting, else None."""
        try:
            return request.user.auth_token.visiting_session
        except (AttributeError, VisitingSession.DoesNotExist):
            return None

    def create(self, request, *args, **kwargs):
        session = self._get_visiting_session(request)
        if session and not session.is_expired():
            return self._proxy_preference_write(session, 'add', request.data)
        # Normal local write
        response = super().create(request, *args, **kwargs)
        preference_id = response.data.get('PreferenceID')
        if preference_id:
            pref = Preference.objects.get(PreferenceID=preference_id)
            _refresh_user_cache(pref.UserID)
        return response

    def destroy(self, request, *args, **kwargs):
        session = self._get_visiting_session(request)
        if session and not session.is_expired():
            pref = self.get_object()
            return self._proxy_preference_write(session, 'remove', {'Preference': pref.Preference})
        pref = self.get_object()
        user = pref.UserID
        response = super().destroy(request, *args, **kwargs)
        _refresh_user_cache(user)
        return response

    def _proxy_preference_write(self, session, action, preference_data):
        """Write-through: send preference change to home store; update VisitingSession JWT."""
        try:
            node_secret = _get_node_secret()
            resp = requests.post(
                f"{session.home_store_endpoint.rstrip('/')}/backend/internode/user-preferences/update/",
                json={
                    'email': session.jwt_payload['email'],
                    'action': action,
                    'preference': preference_data.get('Preference', ''),
                },
                headers={'Authorization': f'NodeToken {node_secret}'},
                timeout=5,
            )
        except requests.RequestException:
            return Response(
                {'error': 'Home store unreachable. Preferences can only be changed at your home store right now.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        if resp.status_code != 200:
            return Response({'error': 'Failed to update preference at home store.'}, status=resp.status_code)

        data = resp.json()
        # Update VisitingSession with refreshed JWT payload
        from .internode_auth import jwt_verify
        try:
            new_payload = jwt_verify(data['jwt'], settings.INTER_NODE_SECRET)
            session.jwt_payload = new_payload
            session.jwt_expires_at = datetime.fromtimestamp(new_payload['exp'], tz=dt_timezone.utc)
            session.save(update_fields=['jwt_payload', 'jwt_expires_at'])
        except Exception:
            pass  # JWT refresh failed; stale but not fatal

        return Response({'preferences': data.get('preferences', [])}, status=status.HTTP_200_OK)

class UserPreferenceLookup(ListAPIView):
    serializer_class = PreferenceSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        user_id = self.kwargs['user_id']

        # Check if this is a visiting user with an active session
        session = VisitingSession.objects.filter(
            canonical_user_id=user_id,
            jwt_expires_at__gt=timezone.now()
        ).first()

        if session:
            # Serve preferences from JWT payload (no DB call to home store needed)
            prefs = session.jwt_payload.get('preferences', [])
            return Response([
                {'PreferenceID': None, 'UserID': user_id, 'Preference': p}
                for p in prefs
            ])

        # Local user: normal DB query
        user = get_object_or_404(User, pk=user_id)
        queryset = Preference.objects.filter(UserID=user_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
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

    def get_permissions(self):
        """Public read (list/retrieve); authenticated write (create/update/destroy)."""
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated()]

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
        For visiting users, proxies favorite changes to home store.
        """
        favorite_to_add = request.data.get("addFavorite")
        favorite_to_remove = request.data.get("removeFavorite")
        affected_user_id = favorite_to_add or favorite_to_remove

        # If this is a favorite change for a visiting user, proxy to home store
        if affected_user_id:
            session = VisitingSession.objects.filter(
                canonical_user_id=affected_user_id,
                jwt_expires_at__gt=timezone.now()
            ).select_related('token').first()
            if session:
                action = 'add' if favorite_to_add else 'remove'
                drink = self.get_object()
                return self._proxy_favorite_write(session, action, drink.DrinkID)

        # Normal local path (home users)
        drink = self.get_object()
        serializer = self.get_serializer(drink, data=request.data)

        if serializer.is_valid():
            for field, value in request.data.items():
                if hasattr(drink, field):
                    setattr(drink, field, value)

            if favorite_to_add:
                drink.addFavorite(favorite_to_add)
                try:
                    _refresh_user_cache(User.objects.get(pk=favorite_to_add))
                except User.DoesNotExist:
                    pass
            if favorite_to_remove:
                drink.removeFavorite(favorite_to_remove)
                try:
                    _refresh_user_cache(User.objects.get(pk=favorite_to_remove))
                except User.DoesNotExist:
                    pass

            drink.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _proxy_favorite_write(self, session, action, drink_id):
        """Write-through: send favorite change to home store; update VisitingSession JWT."""
        try:
            resp = requests.post(
                f"{session.home_store_endpoint.rstrip('/')}/backend/internode/user-favorites/update/",
                json={
                    'email': session.jwt_payload['email'],
                    'action': action,
                    'drink_id': drink_id,
                },
                headers={'Authorization': f'NodeToken {_get_node_secret()}'},
                timeout=5,
            )
        except requests.RequestException:
            return Response({'error': 'Home store unreachable.'}, status=503)

        if resp.status_code != 200:
            return Response({'error': 'Failed to update favorite at home store.'}, status=resp.status_code)

        data = resp.json()
        from .internode_auth import jwt_verify
        try:
            new_payload = jwt_verify(data['jwt'], settings.INTER_NODE_SECRET)
            session.jwt_payload = new_payload
            session.jwt_expires_at = datetime.fromtimestamp(new_payload['exp'], tz=dt_timezone.utc)
            session.save(update_fields=['jwt_payload', 'jwt_expires_at'])
        except Exception:
            pass
        return Response({'favorite_drinks': data.get('favorite_drinks', [])}, status=200)

    def destroy(self, request, *args, **kwargs):
        # Custom logic for deleting a drink (optional for customization)
        return super().destroy(request, *args, **kwargs)

class UserDrinksLookup(ListAPIView):
    serializer_class = DrinkSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        user_id = self.kwargs['user_id']

        session = VisitingSession.objects.filter(
            canonical_user_id=user_id,
            jwt_expires_at__gt=timezone.now()
        ).first()

        if session:
            # Favorite drink IDs are from the home store's catalog.
            # Look up matching drinks in local catalog by DrinkID.
            favorite_ids = session.jwt_payload.get('favorite_drinks', [])
            queryset = Drink.objects.filter(DrinkID__in=favorite_ids)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        # Local user
        user = get_object_or_404(User, pk=user_id)
        queryset = Drink.objects.filter(Favorite=user_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


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

@method_decorator(csrf_exempt, name='dispatch')
class StripePaymentIntentView(View):
    
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            amount = int(data.get("amount") * 100)  # Stripe uses cents, so multiply dollars by 100
            if amount is None:
                return JsonResponse({'error': 'Amount is required.'}, status=400)

            # Create a new customer
            customer = stripe.Customer.create()

            # Create an ephemeral key for the customer
            ephemeral_key = stripe.EphemeralKey.create(
                customer=customer['id'],
                stripe_version='2024-09-30.acacia',
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
                'publishableKey': 'TODO: get a new publishable stripe key'
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
        """Generate AI drink for a registered user using their preferences."""
        user = get_object_or_404(User, pk=user_id)
        preferences = Preference.objects.filter(UserID=user)
        preferences_list = []

        if preferences.exists():
            for pref in preferences:
                preferences_list.append(pref.Preference)
        else:
            preferences_list = ["mango", "peach", "vanilla", "salted caramel", "orange", "lavender", "peppermint", "blue raspberry"]
        print("User") # Test code
        return self.generate_response_data(preferences_list, user_created=True)

    def generate_general_user(self):
        """Generate AI drink for a general user with hardcoded preferences."""
        preferences = ["mango", "peach", "vanilla", "salted caramel", "orange", "lavender", "peppermint", "blue raspberry"]
        print("General") # Test code
        return self.generate_response_data(preferences, user_created=False)

    def generate_response_data(self, preferences, user_created):
        """Helper function to generate response data."""
        result = generate_soda(preferences)
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
    permission_classes = [IsAuthenticated]

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
            data = json.loads(request.body)
            edits = data.get('edits', {})

            first_name = edits.get("firstName", None)
            last_name = edits.get("lastName", None)
            # Check for visiting user: by canonical_user_id (no local user) or by token session
            session = VisitingSession.objects.filter(
                canonical_user_id=user_id,
                jwt_expires_at__gt=timezone.now()
            ).select_related('token').first()
            if not session and request.user.is_authenticated:
                try:
                    token = request.user.auth_token
                    session = getattr(token, 'visiting_session', None)
                    if session and session.canonical_user_id != user_id:
                        session = None
                except Exception:
                    pass

            if session and not session.is_expired():
                # Write-through: proxy profile update to home store (first_name, last_name only)
                return self._proxy_profile_update(session, first_name, last_name)

            user = User.objects.get(id=user_id)
            username = edits.get("username", None)
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
        except User.DoesNotExist:
            # user_id might be canonical id; try proxy via session
            session = VisitingSession.objects.filter(
                canonical_user_id=user_id,
                jwt_expires_at__gt=timezone.now()
            ).first()
            if session and not session.is_expired():
                return self._proxy_profile_update(
                    session,
                    edits.get("firstName"),
                    edits.get("lastName"),
                )
            return JsonResponse({'Error': 'User not found'}, status=404)
        except Exception as e:
            return JsonResponse({'Error': str(e)}, status=400)

    def _proxy_profile_update(self, session, first_name, last_name):
        """Send profile (first_name, last_name) update to home store; refresh VisitingSession JWT."""
        if first_name == "unchanged":
            first_name = None
        if last_name == "unchanged":
            last_name = None
        if first_name is None and last_name is None:
            return JsonResponse({"message": "User edited successfully"}, status=status.HTTP_200_OK)
        payload = {'email': session.jwt_payload['email']}
        if first_name is not None:
            payload['first_name'] = first_name
        if last_name is not None:
            payload['last_name'] = last_name
        try:
            resp = requests.post(
                f"{session.home_store_endpoint.rstrip('/')}/backend/internode/user-profile/update/",
                json=payload,
                headers={'Authorization': f'NodeToken {_get_node_secret()}'},
                timeout=5,
            )
        except requests.RequestException:
            return JsonResponse(
                {'Error': 'Home store unreachable. Profile can only be updated at your home store right now.'},
                status=503,
            )
        if resp.status_code != 200:
            return JsonResponse({'Error': resp.json().get('error', 'Failed to update profile at home store')}, status=resp.status_code)
        data = resp.json()
        from .internode_auth import jwt_verify
        try:
            if data.get('jwt'):
                new_payload = jwt_verify(data['jwt'], settings.INTER_NODE_SECRET)
                session.jwt_payload = new_payload
                session.jwt_expires_at = datetime.fromtimestamp(new_payload['exp'], tz=dt_timezone.utc)
                session.save(update_fields=['jwt_payload', 'jwt_expires_at'])
        except Exception:
            pass
        return JsonResponse({"message": "User edited successfully"}, status=status.HTTP_200_OK)


# ============================================================================
# SPRINT 3: HUB & INTER-NODE COMMUNICATION ENDPOINTS
# ============================================================================

import secrets as secrets_module
from .internode_auth import IsHubMeshCaller, IsInterNodeRequest, IsStoreNode, NodeTokenAuthentication
from .models import StoreRegistry, UserCache, SyncRecord, SupplyRequest, Machine, NodeCertificate


# ============================================================================
# HUB ENDPOINTS (for hub nodes to manage registered stores)
# ============================================================================

class HubRegisterView(APIView):
    """
    POST /backend/hub/register/

    Stores call this endpoint when they start up to register with their regional hub.
    Requires inter-node authentication.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest, IsStoreNode]

    def post(self, request):
        try:
            store_id = request.data.get("store_id")
            store_name = request.data.get("store_name")
            region = request.data.get("region")
            latitude = request.data.get("latitude")
            longitude = request.data.get("longitude")
            api_endpoint = request.data.get("api_endpoint")
            public_key = request.data.get("public_key", "")

            if not all([store_id, store_name, region, latitude, longitude, api_endpoint]):
                return Response(
                    {"error": "Missing required fields"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create or update store registry entry
            store_registry, created = StoreRegistry.objects.update_or_create(
                store_id=store_id,
                defaults={
                    "store_name": store_name,
                    "region": region,
                    "latitude": latitude,
                    "longitude": longitude,
                    "api_endpoint": api_endpoint,
                    "public_key": public_key,
                    "is_active": True,
                    "last_heartbeat": timezone.now(),
                }
            )

            # Issue a unique per-node secret for this store
            cert_expires = timezone.now() + timedelta(days=90)
            node_secret = secrets_module.token_hex(32)
            NodeCertificate.objects.update_or_create(
                node_id=f"store-{store_id}",
                defaults={
                    "node_type": "store",
                    "shared_secret": node_secret,
                    "expires_at": cert_expires,
                    "is_active": True,
                }
            )

            # Also register ourselves (the hub) in HubRegistry on the registering store's behalf
            # So they know about us and can use our issued_secret for heartbeats
            from .models import HubRegistry
            HubRegistry.objects.update_or_create(
                hub_id=int(settings.STORE_ID),
                defaults={
                    "hub_name": settings.STORE_NAME,
                    "region": settings.REGION,
                    "api_endpoint": settings.API_ENDPOINT,
                    "is_active": True,
                    "issued_secret": node_secret,
                }
            )

            # Get sibling stores (all other active stores in this region)
            sibling_stores = StoreRegistry.objects.filter(
                region=region,
                is_active=True
            ).exclude(store_id=store_id).values("store_id", "store_name", "api_endpoint", "latitude", "longitude")

            return Response(
                {
                    "status": "registered",
                    "node_secret": node_secret,
                    "hub_id": int(settings.STORE_ID),
                    "hub_name": settings.STORE_NAME,
                    "region": settings.REGION,
                    "certificate_expires": cert_expires.isoformat(),
                    "sibling_stores": list(sibling_stores),
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class HubHeartbeatView(APIView):
    """
    POST /backend/hub/heartbeat/

    Stores send periodic heartbeats (every 30 seconds) to keep registration active.
    Requires inter-node authentication.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest, IsStoreNode]

    def post(self, request):
        try:
            store_id = request.data.get("store_id")
            if not store_id:
                return Response(
                    {"error": "store_id required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Update heartbeat timestamp using bulk update (efficient, single DB query)
            now = timezone.now()
            updated = StoreRegistry.objects.filter(store_id=store_id).update(
                last_heartbeat=now,
                is_active=True,
            )

            if not updated:
                return Response(
                    {"error": "Store not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            return Response(
                {
                    "status": "ok",
                    "timestamp": now.isoformat(),
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class HubStoresView(APIView):
    """
    GET /backend/hub/stores/

    Returns list of all active stores registered with this hub.
    Requires inter-node authentication.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    def get(self, request):
        try:
            stores = StoreRegistry.objects.filter(is_active=True).values(
                "store_id", "store_name", "region", "api_endpoint", "latitude", "longitude"
            )
            return Response(list(stores), status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class HubStoreLocationView(APIView):
    """
    GET /backend/hub/store-location/?email=user@example.com

    Cross-region user discovery: finds which store has a user profile.
    Checks UserCache (replicated profiles) and returns the source store.
    Requires inter-node authentication.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    def get(self, request):
        try:
            email = request.query_params.get("email")
            if not email:
                return Response(
                    {"error": "email query parameter required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check UserCache for this email (only non-expired entries)
            try:
                user_cache = UserCache.objects.get(user_email=email, expires_at__gt=timezone.now())
                # Found cached user; return source store info
                try:
                    source_store = StoreRegistry.objects.get(store_id=user_cache.home_store_id)
                    return Response(
                        {
                            "status": "found",
                            "store_id": source_store.store_id,
                            "api_endpoint": source_store.api_endpoint,
                        },
                        status=status.HTTP_200_OK
                    )
                except StoreRegistry.DoesNotExist:
                    # Store not in local registry — use endpoint directly
                    api_endpoint = user_cache.home_store_endpoint
                    if api_endpoint:
                        return Response(
                            {
                                "status": "found",
                                "store_id": user_cache.home_store_id,
                                "api_endpoint": api_endpoint,
                            },
                            status=status.HTTP_200_OK
                        )
                    return Response(
                        {"status": "not_found"},
                        status=status.HTTP_200_OK
                    )
            except UserCache.DoesNotExist:
                # Not in local cache — if we are a hub, broadcast to peer hubs via hub-mesh
                if getattr(settings, "IS_HUB", False) and getattr(settings, "PEER_HUB_URLS", None):
                    result = _broadcast_hub_mesh_user_location(email)
                    if result is not None:
                        return Response(
                            {"status": "found", "store_id": result.get("store_id"), "api_endpoint": result.get("api_endpoint")},
                            status=status.HTTP_200_OK,
                        )
                return Response(
                    {"status": "not_found"},
                    status=status.HTTP_200_OK
                )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# HUB-MESH ENDPOINTS (hub-to-hub only; for user routing and discovery)
# ============================================================================

class HubMeshUserLocationView(APIView):
    """
    GET /backend/hub-mesh/user-location/?email=...

    Hub-to-hub: answer "where is this user's home store?" from local UserCache.
    Returns status, store_id, api_endpoint, user_id, home_store_id, home_store_endpoint when found.
    Only hub nodes should expose this; callers are other hubs in the mesh.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest, IsHubMeshCaller]

    def get(self, request):
        if not request.node_identity.get("is_hub"):
            return Response({"error": "Hub-mesh endpoint only available on hub nodes"}, status=status.HTTP_403_FORBIDDEN)
        email = request.query_params.get("email")
        if not email:
            return Response({"error": "email query parameter required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user_cache = UserCache.objects.get(user_email=email, expires_at__gt=timezone.now())
            return Response(
                {
                    "status": "found",
                    "store_id": user_cache.home_store_id,
                    "api_endpoint": user_cache.home_store_endpoint,
                    "user_id": user_cache.user_id,
                    "home_store_id": user_cache.home_store_id,
                    "home_store_endpoint": user_cache.home_store_endpoint,
                },
                status=status.HTTP_200_OK,
            )
        except UserCache.DoesNotExist:
            return Response({"status": "not_found"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HubMeshUserSyncView(APIView):
    """
    POST /backend/hub-mesh/user-sync/

    Hub-to-hub: receive user routing from another hub. Upserts UserCache with TTL.
    Only hub nodes should expose this.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest, IsHubMeshCaller]

    def post(self, request):
        if not request.node_identity.get("is_hub"):
            return Response({"error": "Hub-mesh endpoint only available on hub nodes"}, status=status.HTTP_403_FORBIDDEN)
        try:
            email = request.data.get("email")
            user_id = request.data.get("user_id")
            home_store_id = request.data.get("home_store_id")
            home_store_endpoint = request.data.get("home_store_endpoint")
            if not email or user_id is None or not home_store_endpoint:
                return Response(
                    {"error": "email, user_id, and home_store_endpoint required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            expires_at = timezone.now() + timedelta(hours=24)
            UserCache.objects.update_or_create(
                user_email=email,
                defaults={
                    "user_id": user_id,
                    "home_store_id": home_store_id or 0,
                    "home_store_endpoint": home_store_endpoint,
                    "expires_at": expires_at,
                },
            )
            SyncRecord.objects.create(
                sync_type="user_pull",
                source_store_id=request.node_identity.get("store_id", 0),
                target_store_id=int(settings.STORE_ID),
                status="success",
                completed_at=timezone.now(),
            )
            return Response({"status": "cached", "expires_at": expires_at.isoformat()}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# INTER-NODE ENDPOINTS (peer-to-peer communication between all nodes)
# ============================================================================

class InterNodeHealthCheckView(APIView):
    """
    POST /backend/internode/health-check/

    Simple ping/pong between nodes. Verifies connectivity and returns node identity.
    Requires inter-node authentication.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    def post(self, request):
        try:
            requesting_store_id = request.data.get("requesting_store_id")
            return Response(
                {
                    "status": "ok",
                    "store_id": request.node_identity["store_id"],
                    "region": request.node_identity["region"],
                    "is_hub": request.node_identity["is_hub"],
                    "timestamp": timezone.now().isoformat(),
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class InterNodeStoreRegistryView(APIView):
    """
    GET /backend/internode/store-registry/

    Returns this hub's store registry (list of all registered stores).
    Used for peer discovery. Requires inter-node authentication.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    def get(self, request):
        try:
            stores = StoreRegistry.objects.filter(is_active=True).values(
                "store_id", "store_name", "region", "api_endpoint", "latitude", "longitude"
            )
            return Response(list(stores), status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class InterNodeUserLookupView(APIView):
    """
    POST /backend/internode/user-lookup/

    Peer store queries another store: "Do you have a user with this email?"
    Checks UserCache (replicated users) and local User table (home store).
    Requires inter-node authentication.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    def post(self, request):
        try:
            email = request.data.get("email")
            requesting_store_id = request.data.get("requesting_store_id") or 0

            if not email:
                return Response(
                    {"error": "email required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check cached users (UserCache) — only non-expired entries
            try:
                user_cache = UserCache.objects.get(user_email=email, expires_at__gt=timezone.now())
                # Refresh TTL on cache hit if close to expiry (within 6 hours).
                # Skips home-store entries (10-year TTL) since they're never close.
                if user_cache.expires_at < timezone.now() + timedelta(hours=6):
                    user_cache.expires_at = timezone.now() + timedelta(hours=24)
                    user_cache.save(update_fields=['expires_at'])
                SyncRecord.objects.create(
                    sync_type="user_pull",
                    source_store_id=requesting_store_id,
                    status="success",
                    completed_at=timezone.now(),
                )
                return Response(
                    {
                        "status": "found",
                        "user_id": user_cache.user_id,
                        "home_store_id": user_cache.home_store_id,
                        "home_store_endpoint": user_cache.home_store_endpoint,
                    },
                    status=status.HTTP_200_OK
                )
            except UserCache.DoesNotExist:
                pass

            # Check local users (home store)
            try:
                user = User.objects.get(email=email)
                SyncRecord.objects.create(
                    sync_type="user_pull",
                    source_store_id=requesting_store_id,
                    status="success",
                    completed_at=timezone.now(),
                )
                return Response(
                    {
                        "status": "found",
                        "user_id": user.pk,
                        "home_store_id": int(settings.STORE_ID),
                        "home_store_endpoint": settings.API_ENDPOINT,
                    },
                    status=status.HTTP_200_OK
                )
            except User.DoesNotExist:
                pass

            # Stage 3: If we are a hub, broadcast to peer hubs via hub-mesh user-location
            if getattr(settings, "IS_HUB", False) and getattr(settings, "PEER_HUB_URLS", None):
                hub_data = _broadcast_hub_mesh_user_location(email)
                if hub_data is not None:
                    # Cache the routing pointer locally for faster future lookups
                    UserCache.objects.update_or_create(
                        user_email=email,
                        defaults={
                            "user_id": hub_data.get("user_id"),
                            "home_store_id": hub_data.get("home_store_id", 0),
                            "home_store_endpoint": hub_data.get("home_store_endpoint", ""),
                            "expires_at": timezone.now() + timedelta(hours=24),
                        }
                    )
                    return Response(
                        {
                            "status": "found",
                            "user_id": hub_data.get("user_id"),
                            "home_store_id": hub_data.get("home_store_id", 0),
                            "home_store_endpoint": hub_data.get("home_store_endpoint", ""),
                        },
                        status=status.HTTP_200_OK,
                    )

            # User not found anywhere — do not record as successful sync
            return Response(
                {"status": "not_found"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class InterNodeUserSyncView(APIView):
    """
    POST /backend/internode/user-sync/

    Peer store receives a routing pointer for a user from another store.
    Saves to UserCache (routing-only) with 24-hour expiration.
    Requires inter-node authentication.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    def post(self, request):
        try:
            email = request.data.get("email")
            user_id = request.data.get("user_id")
            home_store_id = request.data.get("home_store_id")
            home_store_endpoint = request.data.get("home_store_endpoint")

            if not email or user_id is None or not home_store_endpoint:
                return Response(
                    {"error": "email, user_id, and home_store_endpoint required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            expires_at = timezone.now() + timedelta(hours=24)

            # Create or update user cache (routing table only, no profile data)
            user_cache, created = UserCache.objects.update_or_create(
                user_email=email,
                defaults={
                    "user_id": user_id,
                    "home_store_id": home_store_id or 0,
                    "home_store_endpoint": home_store_endpoint,
                    "expires_at": expires_at,
                }
            )

            # If this node is a hub, queue user_sync to all peer hubs via hub-mesh (cross-region discovery).
            # Only queue if this is a new entry (not an update), to avoid duplicate events.
            if created and getattr(settings, "IS_HUB", False) and getattr(settings, "PEER_HUB_URLS", None):
                for peer_url in settings.PEER_HUB_URLS:
                    EventQueue.objects.create(
                        event_type="user_sync",
                        status="pending",
                        target_node=f"{peer_url.rstrip('/')}/backend/hub-mesh/user-sync/",
                        payload={
                            "email": email,
                            "user_id": user_id,
                            "home_store_id": home_store_id,
                            "home_store_endpoint": home_store_endpoint,
                        },
                    )

            SyncRecord.objects.create(
                sync_type="user_pull",
                source_store_id=request.node_identity.get("store_id", 0) if hasattr(request, 'node_identity') else 0,
                target_store_id=int(settings.STORE_ID),
                status="success",
                completed_at=timezone.now(),
            )

            return Response(
                {
                    "status": "cached",
                    "expires_at": expires_at.isoformat(),
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class InterNodeIssueTokenView(APIView):
    """
    POST /backend/internode/issue-token/ or /backend/internode/verify-credentials/

    Verify-credentials flow: only the home store verifies the password.
    Visiting stores forward email+password here; we validate with User.check_password,
    then build JWT and return it. Visiting store never stores the password.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    def post(self, request):
        from .internode_auth import jwt_sign

        email = request.data.get('email')
        password = request.data.get('password')
        requesting_store_id = request.data.get('requesting_store_id')
        if not email or not password:
            return Response({'error': 'email and password required'}, status=400)

        # Rate limiting: 5 attempts per minute per IP+email combination
        from django.core.cache import cache
        client_ip = request.META.get('REMOTE_ADDR', 'unknown')
        rate_key = f"issue_token:{client_ip}:{email}"
        attempts = cache.get(rate_key, 0)
        if attempts >= 5:
            return Response({'error': 'Too many attempts.'}, status=429)
        cache.set(rate_key, attempts + 1, 60)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials.'}, status=401)

        if not user.check_password(password):
            return Response({'error': 'Invalid credentials.'}, status=401)

        # Build full profile for JWT payload
        preferences = list(Preference.objects.filter(UserID=user).values_list('Preference', flat=True))
        favorite_drink_ids = list(Drink.objects.filter(Favorite=user).values_list('DrinkID', flat=True))

        payload = {
            'user_id': user.pk,
            'email': user.email,
            'home_store_id': int(settings.STORE_ID),
            'home_store_endpoint': settings.API_ENDPOINT,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'preferences': preferences,
            'favorite_drinks': favorite_drink_ids,
            'is_admin': user.is_superuser,
            'is_manager': user.is_staff,
        }

        jwt_token = jwt_sign(payload, settings.INTER_NODE_SECRET, expires_in_hours=24)

        # Audit: source = visiting store (if provided), target = this home store
        SyncRecord.objects.create(
            sync_type='credential_check',
            source_store_id=requesting_store_id if requesting_store_id is not None else int(settings.STORE_ID),
            target_store_id=int(settings.STORE_ID),
            status='success',
            completed_at=timezone.now(),
        )

        return Response({'jwt': jwt_token, **payload})


class InterNodeUserPreferencesUpdateView(APIView):
    """
    POST /backend/internode/user-preferences/update/

    Called by visiting stores when a visiting user changes a preference.
    Applies the change locally and returns a refreshed JWT with updated profile.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    def post(self, request):
        from .internode_auth import jwt_sign

        email = request.data.get('email')
        action = request.data.get('action')   # 'add' or 'remove'
        preference_text = request.data.get('preference', '').strip()

        if not email or action not in ('add', 'remove') or not preference_text:
            return Response({'error': 'email, action (add|remove), and preference required'}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        if action == 'add':
            Preference.objects.get_or_create(UserID=user, Preference=preference_text)
        else:
            Preference.objects.filter(UserID=user, Preference=preference_text).delete()

        # Rebuild profile and issue fresh JWT
        preferences = list(Preference.objects.filter(UserID=user).values_list('Preference', flat=True))
        favorite_drink_ids = list(Drink.objects.filter(Favorite=user).values_list('DrinkID', flat=True))

        payload = {
            'user_id': user.pk,
            'email': user.email,
            'home_store_id': int(settings.STORE_ID),
            'home_store_endpoint': settings.API_ENDPOINT,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'preferences': preferences,
            'favorite_drinks': favorite_drink_ids,
            'is_admin': user.is_superuser,
            'is_manager': user.is_staff,
        }
        jwt_token = jwt_sign(payload, settings.INTER_NODE_SECRET, expires_in_hours=24)

        # Also refresh local UserCache routing entry
        _refresh_user_cache(user)

        return Response({'jwt': jwt_token, 'preferences': preferences})


class InterNodeUserFavoritesUpdateView(APIView):
    """
    POST /backend/internode/user-favorites/update/

    Called by visiting stores when a visiting user adds/removes a favorite drink.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    def post(self, request):
        from .internode_auth import jwt_sign

        email = request.data.get('email')
        action = request.data.get('action')   # 'add' or 'remove'
        drink_id = request.data.get('drink_id')

        if not email or action not in ('add', 'remove') or not drink_id:
            return Response({'error': 'email, action (add|remove), and drink_id required'}, status=400)

        try:
            user = User.objects.get(email=email)
            drink = Drink.objects.get(DrinkID=drink_id)
        except (User.DoesNotExist, Drink.DoesNotExist) as ex:
            return Response({'error': str(ex)}, status=404)

        if action == 'add':
            drink.Favorite.add(user)
        else:
            drink.Favorite.remove(user)

        favorite_drink_ids = list(Drink.objects.filter(Favorite=user).values_list('DrinkID', flat=True))
        preferences = list(Preference.objects.filter(UserID=user).values_list('Preference', flat=True))

        payload = {
            'user_id': user.pk,
            'email': user.email,
            'home_store_id': int(settings.STORE_ID),
            'home_store_endpoint': settings.API_ENDPOINT,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'preferences': preferences,
            'favorite_drinks': favorite_drink_ids,
            'is_admin': user.is_superuser,
            'is_manager': user.is_staff,
        }
        jwt_token = jwt_sign(payload, settings.INTER_NODE_SECRET, expires_in_hours=24)
        _refresh_user_cache(user)

        return Response({'jwt': jwt_token, 'favorite_drinks': favorite_drink_ids})


class InterNodeUserProfileUpdateView(APIView):
    """
    POST /backend/internode/user-profile/update/

    Called by visiting stores when a visiting user updates their profile (name, etc).
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    def post(self, request):
        from .internode_auth import jwt_sign

        email = request.data.get('email')
        if not email:
            return Response({'error': 'email required'}, status=status.HTTP_400_BAD_REQUEST)

        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        user.save(update_fields=['first_name', 'last_name'])

        preferences = list(Preference.objects.filter(UserID=user).values_list('Preference', flat=True))
        favorite_drink_ids = list(Drink.objects.filter(Favorite=user).values_list('DrinkID', flat=True))

        payload = {
            'user_id': user.pk, 'email': user.email,
            'home_store_id': int(settings.STORE_ID),
            'home_store_endpoint': settings.API_ENDPOINT,
            'first_name': user.first_name, 'last_name': user.last_name,
            'preferences': preferences, 'favorite_drinks': favorite_drink_ids,
            'is_admin': user.is_superuser, 'is_manager': user.is_staff,
        }
        jwt_token = jwt_sign(payload, settings.INTER_NODE_SECRET, expires_in_hours=24)
        return Response({'jwt': jwt_token})


class InterNodeStatusUpdateView(APIView):
    """
    POST /backend/internode/status-update/

    Store sends machine status update to hub. Updates Machine record and logs sync.
    Requires inter-node authentication.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    def post(self, request):
        try:
            machine_id = request.data.get("machine_id")
            status_value = request.data.get("status")
            repair_notes = request.data.get("repair_notes", "")

            if not machine_id or not status_value:
                return Response(
                    {"error": "machine_id and status required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate state machine transition before applying
            machine = Machine.objects.get(machine_id=machine_id)
            current_status = machine.status
            valid_next = Machine.VALID_TRANSITIONS.get(current_status, [])

            if status_value not in valid_next:
                return Response(
                    {
                        "error": f"Invalid state transition: {current_status} -> {status_value}. "
                                f"Valid next states: {valid_next}"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Update machine status
            machine.status = status_value
            if repair_notes:
                machine.repair_notes = repair_notes
            machine.save()

            SyncRecord.objects.create(
                sync_type="status_update",
                source_store_id=request.node_identity["store_id"],
                status="success",
                completed_at=timezone.now(),
            )

            return Response(
                {"status": "updated"},
                status=status.HTTP_200_OK
            )
        except Machine.DoesNotExist:
            return Response(
                {"error": "Machine not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class InterNodeSupplyRequestView(APIView):
    """
    POST /backend/internode/supply-request/

    Store sends supply request to hub. Creates SupplyRequest record in hub's DB.
    Requires inter-node authentication.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    def post(self, request):
        try:
            store_id = request.data.get("store_id")
            item_name = request.data.get("item_name")
            item_type = request.data.get("item_type")
            quantity_requested = request.data.get("quantity_requested")
            notes = request.data.get("notes", "")

            if not all([store_id, item_name, item_type, quantity_requested]):
                return Response(
                    {"error": "store_id, item_name, item_type, quantity_requested required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create supply request
            supply_request = SupplyRequest.objects.create(
                store_id=store_id,
                item_name=item_name,
                item_type=item_type,
                quantity_requested=quantity_requested,
                status="pending",
                notes=notes,
            )

            return Response(
                {
                    "status": "received",
                    "request_id": supply_request.id,
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



class HubSupplyRequestListView(APIView):
    """
    GET /backend/hub/supply-requests/

    List supply requests on this hub. Accepts optional ?status= query param
    (pending, approved, denied, fulfilled). Returns all if omitted.
    Requires inter-node authentication.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    def get(self, request):
        qs = SupplyRequest.objects.all().order_by('-created_at')
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        data = list(qs.values(
            'id', 'store_id', 'item_name', 'item_type',
            'quantity_requested', 'status', 'created_at', 'resolved_at', 'notes'
        ))
        return Response(data, status=status.HTTP_200_OK)


class HubSupplyRequestActionView(APIView):
    """
    POST /backend/hub/supply-requests/<pk>/approve/
    POST /backend/hub/supply-requests/<pk>/deny/
    POST /backend/hub/supply-requests/<pk>/fulfill/

    Transition a supply request through its workflow:
      pending  -> approved  (approve)
      pending  -> denied    (deny)
      approved -> fulfilled (fulfill)

    Requires inter-node authentication.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    VALID_TRANSITIONS = {
        'approve':  ('pending',  'approved'),
        'deny':     ('pending',  'denied'),
        'fulfill':  ('approved', 'fulfilled'),
    }

    def post(self, request, pk, action):
        if action not in self.VALID_TRANSITIONS:
            return Response(
                {"error": f"Unknown action '{action}'. Valid actions: approve, deny, fulfill"},
                status=status.HTTP_400_BAD_REQUEST
            )

        required_status, new_status = self.VALID_TRANSITIONS[action]

        try:
            supply_req = SupplyRequest.objects.get(pk=pk)
        except SupplyRequest.DoesNotExist:
            return Response({"error": "Supply request not found"}, status=status.HTTP_404_NOT_FOUND)

        if supply_req.status != required_status:
            return Response(
                {"error": f"Cannot {action} a request with status '{supply_req.status}'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        supply_req.status = new_status
        if new_status in ('denied', 'fulfilled'):
            supply_req.resolved_at = timezone.now()
        supply_req.save()

        return Response(
            {"status": new_status, "request_id": supply_req.id},
            status=status.HTTP_200_OK
        )
