import requests
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from concurrent.futures import ThreadPoolExecutor, as_completed

from .models import StoreRegistry, SyncAuditLog, VisitingUserCache, Region
from .permissions import IsNodeAuthenticated, IsSuperUser


# ── Helpers ──────────────────────────────────────────────────────────────────

def _node_token_headers():
    """Returns the Authorization header dict for outbound inter-node requests."""
    return {
        'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}',
        'Content-Type': 'application/json',
    }


def _log(event_type, requesting_node, target_node, success,
         user_email='', data_types='', error=''):
    """Write one row to SyncAuditLog."""
    SyncAuditLog.objects.create(
        event_type=event_type,
        requesting_node=requesting_node,
        target_node=target_node,
        user_email=user_email,
        data_types=data_types,
        success=success,
        error_message=error,
    )


# ── Views ─────────────────────────────────────────────────────────────────────

class HubRegisterView(APIView):
    """
    POST /api/hub/register/
    Called by stores on startup to register themselves with their regional hub.

    Request body:
    {
        "store_id": 42,
        "store_name": "CodePop Logan #1",
        "region": "logan",
        "latitude": 41.7421,
        "longitude": -111.8070,
        "api_endpoint": "http://10.0.0.2:8000"
    }

    Response 200: {"status": "registered", "active_stores": [...]}
    Response 400: {"error": "..."}
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        data = request.data
        required = ['store_id', 'store_name', 'region', 'api_endpoint']
        for field in required:
            if not data.get(field):
                return Response({'error': f'Missing field: {field}'},
                                status=status.HTTP_400_BAD_REQUEST)

        region_obj = Region.objects.get(name=data['region'])
        StoreRegistry.objects.update_or_create(
            store_id=data['store_id'],
            defaults={
                'store_name':        data['store_name'],
                'region':            region_obj,
                'api_endpoint':      data['api_endpoint'],
                'latitude':          data.get('latitude'),
                'longitude':         data.get('longitude'),
                'status':            'active',
                'last_heartbeat':    timezone.now(),
                'missed_heartbeats': 0,
            }
        )

        _log('store_register',
             requesting_node=data['api_endpoint'],
             target_node='this-hub',
             success=True,
             data_types='registration')

        active_stores = list(
            StoreRegistry.objects.filter(status='active')
            .values('store_id', 'store_name', 'api_endpoint', 'latitude', 'longitude')
        )
        return Response({'status': 'registered', 'active_stores': active_stores})


class HubHeartbeatView(APIView):
    """
    POST /api/hub/heartbeat/
    Called by stores every 30 seconds (via Celery beat task).

    Request body: {"store_id": 42, "status": "active"}
    Response 200: {"status": "ok"}
    Response 404: store not registered
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        store_id = request.data.get('store_id')
        try:
            store = StoreRegistry.objects.get(store_id=store_id)
        except StoreRegistry.DoesNotExist:
            return Response({'error': 'Store not registered'},
                            status=status.HTTP_404_NOT_FOUND)

        store.last_heartbeat = timezone.now()
        store.missed_heartbeats = 0
        store.status = 'active'
        store.save(update_fields=['last_heartbeat', 'missed_heartbeats', 'status'])
        return Response({'status': 'ok'})


class HubUserLookupView(APIView):
    """
    POST /api/hub/user-lookup/
    Called by a store in this hub's region when it needs to find a user's home store.

    Flow:
    1. Check stores in THIS region by asking each active store directly
       (query each store's /api/inter-node/user-exists/ endpoint)
    2. If not found locally, broadcast to all OTHER hubs (cross-region)

    NOTE: This is intentionally synchronous for simplicity. In a high-traffic
    production system, use async fan-out. For this project's scale it is fine.

    Request body: {"email": "user@example.com", "requesting_store_id": 42}
    Response 200: {"status": "found", "home_store_id": 5, "home_store_endpoint": "..."}
    Response 404: {"status": "not_found"}
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        email = request.data.get('email')
        requesting_store_id = request.data.get('requesting_store_id')

        if not email:
            return Response({'error': 'email required'}, status=status.HTTP_400_BAD_REQUEST)

        # Step 1: Check stores in this region (parallel fan-out)
        active_stores = list(StoreRegistry.objects.filter(status='active'))

        def check_store(store):
            """Query one store for user existence. Returns (store, found) or None on error."""
            try:
                resp = requests.post(
                    f"{store.api_endpoint}/backend/api/inter-node/user-exists/",
                    json={'email': email},
                    headers=_node_token_headers(),
                    timeout=3,
                )
                if resp.status_code == 200 and resp.json().get('exists'):
                    return (store, True)
            except requests.RequestException:
                pass
            return None

        with ThreadPoolExecutor(max_workers=min(7, len(active_stores))) as executor:
            futures = {executor.submit(check_store, store): store for store in active_stores}
            for future in as_completed(futures):
                result = future.result()
                if result:
                    store, _ = result
                    _log('user_lookup', f'store-{requesting_store_id}',
                         store.api_endpoint, True, user_email=email,
                         data_types='home_store_endpoint')
                    return Response({
                        'status': 'found',
                        'home_store_id': store.store_id,
                        'home_store_endpoint': store.api_endpoint,
                    })

        # Step 2: Broadcast to all other hubs (parallel fan-out)
        def check_hub(region_name, hub_url):
            """Query one hub for user existence. Returns response data or None on error."""
            try:
                resp = requests.post(
                    f"{hub_url}/backend/api/hub/user-broadcast/",
                    json={'email': email, 'requesting_region': settings.REGION},
                    headers=_node_token_headers(),
                    timeout=5,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get('status') == 'found':
                        return (hub_url, data)
            except requests.RequestException:
                pass
            return None

        hubs = {region_name: hub_url for region_name, hub_url in settings.HUB_ENDPOINTS.items()
                if hub_url and region_name != settings.REGION}

        if hubs:
            with ThreadPoolExecutor(max_workers=min(6, len(hubs))) as executor:
                futures = {executor.submit(check_hub, region_name, hub_url): region_name
                          for region_name, hub_url in hubs.items()}
                for future in as_completed(futures):
                    result = future.result()
                    if result:
                        hub_url, data = result
                        _log('hub_broadcast', settings.REGION, hub_url,
                             True, user_email=email, data_types='home_store_endpoint')
                        return Response(data)

        _log('user_lookup', f'store-{requesting_store_id}', 'broadcast-all',
             False, user_email=email, error='not found in any region')
        return Response({'status': 'not_found'}, status=status.HTTP_404_NOT_FOUND)


class HubUserBroadcastView(APIView):
    """
    POST /api/hub/user-broadcast/
    Called by ANOTHER hub when it needs to find a user cross-region.
    This hub checks its own stores for the user.

    Request body: {"email": "user@example.com", "requesting_region": "newjersey"}
    Response 200: {"status": "found", "home_store_id": 5, "home_store_endpoint": "..."}
    Response 404: {"status": "not_found"}
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'email required'}, status=status.HTTP_400_BAD_REQUEST)

        active_stores = list(StoreRegistry.objects.filter(status='active'))

        def check_store(store):
            """Query one store for user existence. Returns (store, True) if found, None otherwise."""
            try:
                resp = requests.post(
                    f"{store.api_endpoint}/backend/api/inter-node/user-exists/",
                    json={'email': email},
                    headers=_node_token_headers(),
                    timeout=3,
                )
                if resp.status_code == 200 and resp.json().get('exists'):
                    return (store, True)
            except requests.RequestException:
                pass
            return None

        with ThreadPoolExecutor(max_workers=min(7, len(active_stores))) as executor:
            futures = {executor.submit(check_store, store): store for store in active_stores}
            for future in as_completed(futures):
                result = future.result()
                if result:
                    store, _ = result
                    return Response({
                        'status': 'found',
                        'home_store_id': store.store_id,
                        'home_store_endpoint': store.api_endpoint,
                    })

        return Response({'status': 'not_found'}, status=status.HTTP_404_NOT_FOUND)


class HubStoreRegistryView(APIView):
    """
    GET /api/hub/store-registry/
    Returns the list of active stores this hub knows about.
    Used by stores that need to discover peers after a cache miss.

    No auth required — store addresses are not sensitive, and the frontend
    needs to call this before it has an inter-node token.
    """
    permission_classes = []  # open endpoint

    def get(self, request):
        stores = StoreRegistry.objects.filter(status='active').values(
            'store_id', 'store_name', 'region__name', 'api_endpoint',
            'latitude', 'longitude', 'last_heartbeat'
        )
        return Response({'stores': list(stores)})


class HubRevenueView(APIView):
    """
    GET /api/hub/revenue/
    Called by the super admin national revenue aggregation.
    This hub queries each active store for its revenue total and returns a sum.

    Returns: {"hub_region": "logan", "total_revenue": 1234.56, "store_count": 3}
    """
    permission_classes = [IsNodeAuthenticated]

    def get(self, request):
        active_stores = list(StoreRegistry.objects.filter(status='active'))

        def fetch_store_revenue(store):
            """Query one store for revenue. Returns (revenue_total, success) tuple."""
            try:
                resp = requests.get(
                    f"{store.api_endpoint}/backend/revenues/",
                    headers=_node_token_headers(),
                    timeout=5,
                )
                if resp.status_code == 200:
                    records = resp.json()
                    total = sum(float(r.get('TotalAmount', 0)) for r in records)
                    return (total, True)
            except requests.RequestException:
                pass
            return (0.0, False)

        total = 0.0
        queried = 0

        with ThreadPoolExecutor(max_workers=min(7, len(active_stores))) as executor:
            futures = {executor.submit(fetch_store_revenue, store): store for store in active_stores}
            for future in as_completed(futures):
                revenue, success = future.result()
                total += revenue
                if success:
                    queried += 1

        return Response({
            'hub_region': settings.REGION,
            'total_revenue': round(total, 2),
            'store_count': queried,
        })
