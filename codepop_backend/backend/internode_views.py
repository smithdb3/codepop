import os
import requests
from django.contrib.auth.models import User
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import VisitingUserCache, PendingProfileUpdate, SyncAuditLog, Preference
from .permissions import IsNodeAuthenticated


# Safe fields to include in inter-node user transfers.
# NEVER add: password (raw), stripe_customer_id, payment_method, card details.
ALLOWED_USER_FIELDS = ['id', 'username', 'email', 'password', 'first_name', 'last_name']
ALLOWED_USER_DATA_TYPES = 'username,email,hashed_password,preferences,favorite_drinks,role'


def _log(event_type, requesting_node, target_node, success,
         user_email='', data_types='', error=''):
    SyncAuditLog.objects.create(
        event_type=event_type,
        requesting_node=requesting_node,
        target_node=target_node,
        user_email=user_email,
        data_types=data_types,
        success=success,
        error_message=error,
    )


def _build_user_payload(user: User) -> dict:
    """
    Constructs the safe, minimal user payload for inter-node transfer.
    Uses Django's internal hashed password (PBKDF2) — never raw password.
    Includes full drink objects for cross-store portability.
    """
    from .models import Drink
    prefs = list(Preference.objects.filter(UserID=user).values_list('Preference', flat=True))
    favorite_drinks = [
        {
            "home_drink_id": d.DrinkID,
            "Name": d.Name,
            "SodaUsed": d.SodaUsed or [],
            "SyrupsUsed": d.SyrupsUsed or [],
            "AddIns": d.AddIns or [],
            "Ice": d.Ice,
            "Price": float(d.Price),
            "Size": d.Size,
        }
        for d in Drink.objects.filter(Favorite=user)
    ]
    role = 'admin' if user.is_superuser else ('manager' if user.is_staff else 'customer')
    return {
        'user_id':            user.pk,
        'username':           user.username,
        'email':              user.email,
        'hashed_password':    user.password,  # Django PBKDF2 hash — safe to transfer
        'first_name':         user.first_name,
        'last_name':          user.last_name,
        'preferences':        prefs,
        'favorite_drinks':    favorite_drinks,  # full drink objects (replaces broken favorite_drink_ids)
        'role':               role,
        'home_store_id':      int(settings.STORE_ID),
        'home_store_endpoint': os.getenv('MY_API_ENDPOINT', ''),  # this store's own direct URL
    }


class InterNodeUserExistsView(APIView):
    """
    POST /api/inter-node/user-exists/
    Called by hubs (during HubUserLookupView) to ask: "Does this user live here?"
    Returns only a boolean — no user data transferred.

    Request: {"email": "user@example.com"}
    Response: {"exists": true/false}
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        email = request.data.get('email')
        exists = User.objects.filter(email=email).exists()
        return Response({'exists': exists})


class InterNodeUserSyncView(APIView):
    """
    POST /api/inter-node/user-sync/
    Called by a visiting store directly on the home store (P2P) after the hub
    told it where the user lives.

    The home store returns the safe user payload. The visiting store will
    cache this in VisitingUserCache.

    Request: {"email": "user@example.com", "requesting_store_id": 42}
    Response 200: {user_id, username, email, hashed_password, preferences, ...}
    Response 404: user not found
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        email = request.data.get('email')
        requesting_store_id = request.data.get('requesting_store_id', 'unknown')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            _log('user_sync', f'store-{requesting_store_id}', f'store-{settings.STORE_ID}',
                 False, user_email=email, error='user not found on this node')
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        payload = _build_user_payload(user)
        _log('user_sync', f'store-{requesting_store_id}', f'store-{settings.STORE_ID}',
             True, user_email=email, data_types=ALLOWED_USER_DATA_TYPES)
        return Response(payload)


class InterNodeProfileUpdateView(APIView):
    """
    POST /api/inter-node/profile-update/
    Called by a visiting store when a visiting user updates their profile.
    This store is the home store — it applies the change and returns confirmed data.

    Request:
    {
        "user_id": 5,
        "changes": {
            "preferences": ["Fruity", "Sweet"],
            "favorite_drink_ids": [42, 87, 110]
        },
        "timestamp": "2026-03-15T10:30:00Z"
    }

    Response 200: confirmed user payload (same format as user-sync)
    Response 404: user not found
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        user_id   = request.data.get('user_id')
        changes   = request.data.get('changes', {})
        requesting = request.META.get('HTTP_X_STORE_ID', 'unknown')

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Apply preference changes
        if 'preferences' in changes:
            Preference.objects.filter(UserID=user).delete()
            for pref in changes['preferences']:
                Preference.objects.create(UserID=user, Preference=pref)

        # Apply favorite drink changes (new format with full drink objects)
        if 'favorite_drinks' in changes:
            from .models import Drink
            # Remove user from all existing favorite drinks
            for d in Drink.objects.filter(Favorite=user):
                d.Favorite.remove(user)
            updated = []
            for drink_data in changes['favorite_drinks']:
                home_id = drink_data.get('home_drink_id')
                if home_id:
                    # Existing drink — re-add to favorites
                    try:
                        drink = Drink.objects.get(pk=home_id)
                        drink.Favorite.add(user)
                        updated.append({**drink_data, 'home_drink_id': drink.DrinkID})
                    except Drink.DoesNotExist:
                        pass  # drink deleted on home store; skip
                else:
                    # New drink created at visiting store — create it here
                    drink = Drink.objects.create(
                        Name=drink_data.get('Name', 'Saved Drink'),
                        SodaUsed=drink_data.get('SodaUsed') or [],
                        SyrupsUsed=drink_data.get('SyrupsUsed') or [],
                        AddIns=drink_data.get('AddIns') or [],
                        Price=float(drink_data.get('Price', 2.00)),
                        Size=drink_data.get('Size', '24oz'),
                        Ice=drink_data.get('Ice', 'regular'),
                        User_Created=True,
                    )
                    drink.Favorite.add(user)
                    updated.append({**drink_data, 'home_drink_id': drink.DrinkID})
            # Rebuild payload with confirmed home_drink_ids
            payload = _build_user_payload(user)
            payload['favorite_drinks'] = updated
            _log('profile_update', f'store-{requesting}', f'store-{settings.STORE_ID}',
                 True, user_email=user.email, data_types='preferences,favorite_drinks')
            return Response(payload)

        # Apply favorite drink changes (legacy format with IDs only)
        if 'favorite_drink_ids' in changes:
            from .models import Drink
            user_drinks = Drink.objects.filter(Favorite=user)
            for d in user_drinks:
                d.Favorite.remove(user)
            for drink_id in changes['favorite_drink_ids']:
                try:
                    drink = Drink.objects.get(pk=drink_id)
                    drink.Favorite.add(user)
                except Drink.DoesNotExist:
                    pass  # drink not on this store; skip

        _log('profile_update', f'store-{requesting}', f'store-{settings.STORE_ID}',
             True, user_email=user.email, data_types='preferences,favorite_drinks')
        return Response(_build_user_payload(user))


class InterNodeHealthCheckView(APIView):
    """
    POST /api/inter-node/health-check/
    Simple availability check. Returns 200 if this node is alive and can talk back.
    Used before attempting a user-sync to confirm home store is reachable.

    Response: {"status": "ok", "store_id": 42, "region": "logan"}
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        return Response({
            'status':   'ok',
            'store_id': settings.STORE_ID,
            'region':   settings.REGION,
        })
