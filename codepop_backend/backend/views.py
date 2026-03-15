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
from .models import Preference, Drink, Inventory, Notification, Order, Revenue, UserCache, EventQueue
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

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

class IsSuperUser(BasePermission):
    """
    Custom permission to allow access only to superusers.
    """

    def has_permission(self, request, view):
        # Check if the user is authenticated and a superuser
        return request.user and request.user.is_authenticated and request.user.is_superuser
    
#Custom login to so that it get's a token but also the user's first name and the user id
class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})

        # Try local authentication first
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data['user']
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user_id': user.pk,
                'first_name': user.first_name,
                'is_admin' : user.is_superuser,
                'is_manager' : user.is_staff,
            })
        except Exception as e:
            # Local auth failed — check if user exists in cache (visiting user from another store)
            email = request.data.get('username')  # Username can be email
            if email and '@' in str(email):  # Looks like an email
                try:
                    cache_entry = UserCache.objects.get(
                        user_email=email,
                        expires_at__gt=timezone.now()
                    )
                    # Found user in cache — recreate locally for this store
                    user_data = cache_entry.user_data
                    user, created = User.objects.get_or_create(
                        email=email,
                        defaults={
                            'username': email,
                            'first_name': user_data.get('first_name', ''),
                            'last_name': user_data.get('last_name', ''),
                        }
                    )
                    # Note: password is not synced (users use separate auth per store for now)
                    # Set an unusable password to prevent password-based login
                    if created:
                        user.set_unusable_password()
                        user.save()

                    token, created = Token.objects.get_or_create(user=user)
                    return Response({
                        'token': token.key,
                        'user_id': user.pk,
                        'first_name': user.first_name,
                        'is_admin': user.is_superuser,
                        'is_manager': user.is_staff,
                    })
                except UserCache.DoesNotExist:
                    pass  # Fall through to original error

            # Re-raise original auth error
            raise e

def _get_user_with_cache_fallback(user_id):
    """
    Lookup a user by PK, with fallback to UserCache for visiting users.
    Returns (user, is_from_cache) tuple, or raises Http404 if not found.
    """
    try:
        # Try local lookup first
        user = User.objects.get(pk=user_id)
        return (user, False)
    except User.DoesNotExist:
        # Check UserCache for visiting users
        cache_entries = UserCache.objects.filter(
            expires_at__gt=timezone.now()
        ).values_list('user_data', flat=True)

        for user_data in cache_entries:
            if user_data.get('user_id') == user_id:
                # Found in cache — return the cached data wrapped as a user-like object
                return (user_data, True)

        # Not found anywhere
        from django.http import Http404
        raise Http404(f"User with id {user_id} not found")


def _refresh_user_cache(user):
    """Rebuild the UserCache entry for a user after preferences or favorites change."""
    try:
        cache_entry = UserCache.objects.get(user_email=user.email)
    except UserCache.DoesNotExist:
        return
    preferences = list(Preference.objects.filter(UserID=user).values_list('Preference', flat=True))
    favorite_drink_ids = list(Drink.objects.filter(Favorite=user).values_list('DrinkID', flat=True))
    cache_entry.user_data = {
        "user_id": user.pk,
        "email": user.email,
        "preferences": preferences,
        "favorite_drinks": favorite_drink_ids,
    }
    cache_entry.save()


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
        token_data = {"token": token.key}

        # Auto-create UserCache entry for newly registered user
        UserCache.objects.update_or_create(
            user_email=serializer.instance.email,
            defaults={
                "user_data": {
                    "user_id": serializer.instance.pk,
                    "email": serializer.instance.email,
                    "preferences": [],
                    "favorite_drinks": [],
                },
                "source_store_id": int(settings.STORE_ID),
                "expires_at": timezone.now() + timezone.timedelta(days=365 * 10),
            }
        )

        # Queue routing pointer sync to upstream hub
        if settings.HUB_URL and not settings.IS_MASTER:
            EventQueue.objects.create(
                event_type="user_sync",
                status="pending",
                target_node=f"{settings.HUB_URL.rstrip('/')}/backend/internode/user-sync/",
                payload={
                    "user_data": {
                        "user_id": serializer.instance.pk,
                        "email": serializer.instance.email,
                        "preferences": [],
                        "favorite_drinks": [],
                    },
                    "source_store_id": int(settings.STORE_ID),
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

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        preference_id = response.data.get('PreferenceID')
        if preference_id:
            pref = Preference.objects.get(PreferenceID=preference_id)
            _refresh_user_cache(pref.UserID)
        return response

    def update(self, request, *args, **kwargs):
        # Get the preference object before update to know which user to refresh
        pref = self.get_object()
        user = pref.UserID
        response = super().update(request, *args, **kwargs)
        _refresh_user_cache(user)
        return response

    def destroy(self, request, *args, **kwargs):
        pref = self.get_object()
        user = pref.UserID
        response = super().destroy(request, *args, **kwargs)
        _refresh_user_cache(user)
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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Retrieve drinks that are marked as favorites by the provided user ID.
        """
        user_id = self.kwargs['user_id']  # Retrieve the 'user_id' from the URL
        user = get_object_or_404(User, pk=user_id)
        return Drink.objects.filter(Favorite=user_id)


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


# ============================================================================
# SPRINT 3: HUB & INTER-NODE COMMUNICATION ENDPOINTS
# ============================================================================

import secrets as secrets_module
from .internode_auth import IsInterNodeRequest, NodeTokenAuthentication
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
    permission_classes = [IsInterNodeRequest]

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
            cert_expires = timezone.now() + timezone.timedelta(days=90)
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

            # Get sibling stores (all other active stores in this region)
            sibling_stores = StoreRegistry.objects.filter(
                region=region,
                is_active=True
            ).exclude(store_id=store_id).values("store_id", "store_name", "api_endpoint", "latitude", "longitude")

            return Response(
                {
                    "status": "registered",
                    "node_secret": node_secret,
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
    permission_classes = [IsInterNodeRequest]

    def post(self, request):
        try:
            store_id = request.data.get("store_id")
            if not store_id:
                return Response(
                    {"error": "store_id required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Update heartbeat timestamp
            store_registry = StoreRegistry.objects.get(store_id=store_id)
            store_registry.last_heartbeat = timezone.now()
            store_registry.is_active = True
            store_registry.save()

            return Response(
                {
                    "status": "ok",
                    "timestamp": timezone.now().isoformat(),
                },
                status=status.HTTP_200_OK
            )
        except StoreRegistry.DoesNotExist:
            return Response(
                {"error": "Store not found"},
                status=status.HTTP_404_NOT_FOUND
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
                    source_store = StoreRegistry.objects.get(store_id=user_cache.source_store_id)
                    return Response(
                        {
                            "status": "found",
                            "store_id": source_store.store_id,
                            "api_endpoint": source_store.api_endpoint,
                        },
                        status=status.HTTP_200_OK
                    )
                except StoreRegistry.DoesNotExist:
                    # User cached but source store no longer registered
                    return Response(
                        {"status": "not_found"},
                        status=status.HTTP_200_OK
                    )
            except UserCache.DoesNotExist:
                # User not found in cache
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
                    "is_master": request.node_identity["is_master"],
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
                if user_cache.expires_at < timezone.now() + timezone.timedelta(hours=6):
                    user_cache.expires_at = timezone.now() + timezone.timedelta(hours=24)
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
                        "user": user_cache.user_data,
                        "located_at_store_id": user_cache.source_store_id,
                    },
                    status=status.HTTP_200_OK
                )
            except UserCache.DoesNotExist:
                pass

            # Check local users (home store)
            try:
                user = User.objects.get(email=email)
                # Construct user profile response
                user_profile = {
                    "user_id": user.pk,
                    "email": user.email,
                    "preferences": list(
                        Preference.objects.filter(UserID=user).values_list("Preference", flat=True)
                    ),
                    "favorite_drinks": list(
                        Drink.objects.filter(Favorite=user).values_list("DrinkID", flat=True)
                    ),
                }
                SyncRecord.objects.create(
                    sync_type="user_pull",
                    source_store_id=requesting_store_id,
                    status="success",
                    completed_at=timezone.now(),
                )
                return Response(
                    {
                        "status": "found",
                        "user": user_profile,
                        "located_at_store_id": request.node_identity["store_id"],
                    },
                    status=status.HTTP_200_OK
                )
            except User.DoesNotExist:
                pass

            # Stage 3: Forward to upstream hub (enables cross-region discovery)
            if settings.HUB_URL and not settings.IS_MASTER:
                try:
                    hub_url = settings.HUB_URL.rstrip('/')
                    hub_resp = requests.post(
                        f"{hub_url}/backend/internode/user-lookup/",
                        json={"email": email, "requesting_store_id": int(settings.STORE_ID)},
                        headers={"Authorization": f"NodeToken {settings.INTER_NODE_SECRET}"},
                        timeout=5,
                    )
                    if hub_resp.status_code == 200:
                        hub_data = hub_resp.json()
                        if hub_data.get("status") == "found":
                            # Cache the result locally for faster future lookups
                            user_data = hub_data.get("user", {})
                            UserCache.objects.update_or_create(
                                user_email=email,
                                defaults={
                                    "user_data": user_data,
                                    "source_store_id": hub_data.get("located_at_store_id", requesting_store_id),
                                    "expires_at": timezone.now() + timezone.timedelta(hours=24),
                                }
                            )
                            return Response(hub_data, status=status.HTTP_200_OK)
                except Exception as e:
                    logger.error("Hub forward failed during user lookup for %s: %s", email, str(e))
                    # fall through to not_found

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

    Peer store receives user profile replicated from another store.
    Saves to UserCache with 24-hour expiration. Requires inter-node authentication.
    """
    authentication_classes = [NodeTokenAuthentication]
    permission_classes = [IsInterNodeRequest]

    def post(self, request):
        try:
            user_data = request.data.get("user_data")
            source_store_id = request.data.get("source_store_id")

            if not user_data or not user_data.get("email"):
                return Response(
                    {"error": "user_data with email required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            email = user_data["email"]
            expires_at = timezone.now() + timezone.timedelta(hours=24)

            # Create or update user cache
            user_cache, created = UserCache.objects.update_or_create(
                user_email=email,
                defaults={
                    "user_data": user_data,
                    "source_store_id": source_store_id,
                    "expires_at": expires_at,
                }
            )

            SyncRecord.objects.create(
                sync_type="user_pull",
                source_store_id=source_store_id,
                target_store_id=request.node_identity["store_id"],
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

            # Update machine status
            machine = Machine.objects.get(machine_id=machine_id)
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
