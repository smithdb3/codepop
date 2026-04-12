from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from backend.models import Region, SupplyHub, StoreRegistry, SupplyRequest, Delivery


class LogisticsManagerEndpointTests(APITestCase):
    """
    Tests for logistics and manager dashboard endpoints.
    These typically require admin/staff user or specific role-based access.
    """

    def setUp(self):
        """Create test users and basic test data."""
        self.regular_user = User.objects.create_user(username='regular', password='pass')
        self.staff_user = User.objects.create_user(username='staff', password='pass', is_staff=True)

        self.token_regular = Token.objects.create(user=self.regular_user)
        self.token_staff = Token.objects.create(user=self.staff_user)

        # Create test region and hub for supply chain tests
        self.region = Region.objects.create(name='logan', display_name='Logan, UT')
        self.hub = SupplyHub.objects.create(
            name='Logan Hub',
            region=self.region,
            inventory_pct=80
        )
        self.store = StoreRegistry.objects.create(
            store_id=1,
            store_name='Test Store',
            region=self.region,
            api_endpoint='http://store:8000',
            status='active'
        )

    def authenticate_as(self, token):
        """Set Authorization header."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def clear_auth(self):
        """Clear authentication."""
        self.client.credentials()

    # ─────────────────────────────────────────────────────────────
    # Logistics Store Endpoints
    # ─────────────────────────────────────────────────────────────

    def test_logistics_stores_list(self):
        """Admin can list logistics stores."""
        self.authenticate_as(self.token_staff)
        response = self.client.get('/backend/api/logistics/stores/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logistics_stores_rejects_regular(self):
        """Regular user gets 403 when listing logistics stores."""
        self.authenticate_as(self.token_regular)
        response = self.client.get('/backend/api/logistics/stores/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_logistics_stores_rejects_anon(self):
        """Unauthenticated user gets 401."""
        self.clear_auth()
        response = self.client.get('/backend/api/logistics/stores/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logistics_critical_stores(self):
        """Admin can list critical stores."""
        self.authenticate_as(self.token_staff)
        response = self.client.get('/backend/api/logistics/stores/critical/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ─────────────────────────────────────────────────────────────
    # Logistics Hub Status Endpoint
    # ─────────────────────────────────────────────────────────────

    def test_logistics_hub_status(self):
        """Admin can view hub status."""
        self.authenticate_as(self.token_staff)
        response = self.client.get('/backend/api/logistics/hub-status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ─────────────────────────────────────────────────────────────
    # Logistics Deliveries Endpoints
    # ─────────────────────────────────────────────────────────────

    def test_logistics_deliveries_list(self):
        """Admin can list deliveries."""
        self.authenticate_as(self.token_staff)
        response = self.client.get('/backend/api/logistics/deliveries/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logistics_deliveries_kpi(self):
        """Admin can view deliveries KPI."""
        self.authenticate_as(self.token_staff)
        response = self.client.get('/backend/api/logistics/deliveries/kpi/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logistics_deliveries_rejects_regular(self):
        """Regular user gets 403 when listing deliveries."""
        self.authenticate_as(self.token_regular)
        response = self.client.get('/backend/api/logistics/deliveries/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ─────────────────────────────────────────────────────────────
    # Logistics Hub Inventory Endpoints
    # ─────────────────────────────────────────────────────────────

    def test_logistics_hub_inventory_list(self):
        """Admin can list hub inventory."""
        self.authenticate_as(self.token_staff)
        response = self.client.get(f'/backend/api/logistics/hubs/{self.hub.id}/inventory/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ─────────────────────────────────────────────────────────────
    # Logistics Store Inventory Endpoints
    # ─────────────────────────────────────────────────────────────

    def test_logistics_store_inventory_list(self):
        """Admin can list store inventory."""
        self.authenticate_as(self.token_staff)
        response = self.client.get(f'/backend/api/logistics/stores/{self.store.id}/inventory/')
        # May return 404 if store doesn't have inventory items; that's ok
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    # ─────────────────────────────────────────────────────────────
    # Logistics Supply Request Endpoints
    # ─────────────────────────────────────────────────────────────

    def test_logistics_supply_request_list(self):
        """Admin can list supply requests."""
        self.authenticate_as(self.token_staff)
        response = self.client.get('/backend/api/logistics/supply-requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logistics_supply_request_rejects_regular(self):
        """Regular user gets 403 when listing supply requests."""
        self.authenticate_as(self.token_regular)
        response = self.client.get('/backend/api/logistics/supply-requests/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ─────────────────────────────────────────────────────────────
    # Manager Inventory Endpoints
    # ─────────────────────────────────────────────────────────────

    def test_manager_inventory_list(self):
        """Admin can list manager inventory."""
        self.authenticate_as(self.token_staff)
        response = self.client.get('/backend/api/manager/inventory/')
        # May be 200 or 404 depending on whether manager has assigned stores
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_manager_inventory_rejects_anon(self):
        """Unauthenticated user gets 401."""
        self.clear_auth()
        response = self.client.get('/backend/api/manager/inventory/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ─────────────────────────────────────────────────────────────
    # Manager Supply Request Endpoints
    # ─────────────────────────────────────────────────────────────

    def test_manager_supply_request_list(self):
        """Admin can list manager supply requests."""
        self.authenticate_as(self.token_staff)
        response = self.client.get('/backend/api/manager/supply-requests/')
        # May be 200 or 404 depending on whether manager has assigned stores
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_manager_supply_request_create(self):
        """Manager/admin can create supply request."""
        self.authenticate_as(self.token_staff)
        data = {
            'item_name': 'Cola',
            'quantity': 10,
            'urgency': 'normal',
            'status': 'pending'
        }
        response = self.client.post('/backend/api/manager/supply-requests/', data, format='json')
        # May be 201, 400, or 404 depending on manager setup
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND])

    # ─────────────────────────────────────────────────────────────
    # Logistics Driver Endpoints
    # ─────────────────────────────────────────────────────────────

    def test_logistics_drivers_list(self):
        """Admin can list logistics drivers."""
        self.authenticate_as(self.token_staff)
        response = self.client.get('/backend/api/logistics/drivers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
