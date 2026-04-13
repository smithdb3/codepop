from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
import json

from backend.models import StoreRegistry, SyncAuditLog, Region
from django.conf import settings


class HubRegisterViewTest(TestCase):
    """Test HubRegisterView — stores registering with the hub."""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/backend/api/hub/register/'
        # Create a region for testing
        self.region = Region.objects.create(name='logan')
        # Set up inter-node secret for authentication
        self.client.credentials(HTTP_AUTHORIZATION=f'NodeToken {settings.INTER_NODE_SECRET}')

    def test_register_store_success(self):
        """Test successful store registration."""
        data = {
            'store_id': 42,
            'store_name': 'CodePop Logan #1',
            'region': 'logan',
            'api_endpoint': 'http://10.0.0.2:8000',
            'latitude': 41.7421,
            'longitude': -111.8070,
        }
        response = self.client.post(self.endpoint, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'registered')

        # Verify store was created in registry
        store = StoreRegistry.objects.get(store_id=42)
        self.assertEqual(store.store_name, 'CodePop Logan #1')
        self.assertEqual(store.status, 'active')
        self.assertIsNotNone(store.last_heartbeat)

    def test_register_store_missing_required_field(self):
        """Test registration fails when required field is missing."""
        data = {
            'store_id': 42,
            'store_name': 'CodePop Logan #1',
            # Missing 'region'
            'api_endpoint': 'http://10.0.0.2:8000',
        }
        response = self.client.post(self.endpoint, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_register_store_update_existing(self):
        """Test that registering an existing store updates it."""
        # Create initial store
        StoreRegistry.objects.create(
            store_id=42,
            store_name='Old Name',
            region=self.region,
            api_endpoint='http://old.endpoint:8000',
            status='inactive',
        )

        # Register same store with new data
        data = {
            'store_id': 42,
            'store_name': 'New Name',
            'region': 'logan',
            'api_endpoint': 'http://new.endpoint:8000',
        }
        response = self.client.post(self.endpoint, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify update
        store = StoreRegistry.objects.get(store_id=42)
        self.assertEqual(store.store_name, 'New Name')
        self.assertEqual(store.api_endpoint, 'http://new.endpoint:8000')
        self.assertEqual(store.status, 'active')

    def test_register_store_returns_active_stores(self):
        """Test that registration response includes all active stores."""
        # Create some existing active stores
        self.region2 = Region.objects.create(name='jersey')
        StoreRegistry.objects.create(
            store_id=1,
            store_name='Store 1',
            region=self.region,
            api_endpoint='http://store1:8000',
            status='active',
        )
        StoreRegistry.objects.create(
            store_id=2,
            store_name='Store 2',
            region=self.region2,
            api_endpoint='http://store2:8000',
            status='inactive',
        )

        # Register new store
        data = {
            'store_id': 3,
            'store_name': 'Store 3',
            'region': 'logan',
            'api_endpoint': 'http://store3:8000',
        }
        response = self.client.post(self.endpoint, data, format='json')

        # Should include stores 1 and 3, not 2 (inactive)
        active_stores = response.data['active_stores']
        store_ids = [s['store_id'] for s in active_stores]
        self.assertIn(1, store_ids)
        self.assertIn(3, store_ids)
        self.assertNotIn(2, store_ids)

    def test_register_without_auth_fails(self):
        """Test that registration fails without proper auth."""
        self.client.credentials()  # Clear auth
        data = {
            'store_id': 42,
            'store_name': 'CodePop',
            'region': 'logan',
            'api_endpoint': 'http://store:8000',
        }
        response = self.client.post(self.endpoint, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_audit_log_created_on_registration(self):
        """Test that a sync audit log entry is created on successful registration."""
        data = {
            'store_id': 42,
            'store_name': 'CodePop',
            'region': 'logan',
            'api_endpoint': 'http://10.0.0.2:8000',
        }
        self.client.post(self.endpoint, data, format='json')

        log = SyncAuditLog.objects.filter(event_type='store_register').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.requesting_node, 'http://10.0.0.2:8000')
        self.assertTrue(log.success)


class HubHeartbeatViewTest(TestCase):
    """Test HubHeartbeatView — stores sending heartbeats."""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/backend/api/hub/heartbeat/'
        self.region = Region.objects.create(name='logan')
        self.client.credentials(HTTP_AUTHORIZATION=f'NodeToken {settings.INTER_NODE_SECRET}')

    def test_heartbeat_updates_status(self):
        """Test that heartbeat updates store status and timestamp."""
        store = StoreRegistry.objects.create(
            store_id=42,
            store_name='Store',
            region=self.region,
            api_endpoint='http://store:8000',
            status='inactive',
            missed_heartbeats=5,
        )
        old_time = store.last_heartbeat

        data = {'store_id': 42, 'status': 'active'}
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify update
        store.refresh_from_db()
        self.assertEqual(store.status, 'active')
        self.assertEqual(store.missed_heartbeats, 0)
        self.assertGreater(store.last_heartbeat, old_time)

    def test_heartbeat_unregistered_store(self):
        """Test heartbeat from unregistered store fails."""
        data = {'store_id': 999, 'status': 'active'}
        response = self.client.post(self.endpoint, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    def test_multiple_heartbeats(self):
        """Test that multiple heartbeats update the timestamp each time."""
        store = StoreRegistry.objects.create(
            store_id=42,
            store_name='Store',
            region=self.region,
            api_endpoint='http://store:8000',
        )

        for i in range(3):
            data = {'store_id': 42, 'status': 'active'}
            response = self.client.post(self.endpoint, data, format='json')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

            store.refresh_from_db()
            self.assertEqual(store.missed_heartbeats, 0)


class HubUserLookupViewTest(TestCase):
    """Test HubUserLookupView — finding users across stores."""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/backend/api/hub/user-lookup/'
        self.region = Region.objects.create(name='logan')
        self.client.credentials(HTTP_AUTHORIZATION=f'NodeToken {settings.INTER_NODE_SECRET}')

    def test_user_lookup_missing_email(self):
        """Test that user lookup fails without email."""
        data = {'requesting_store_id': 1}
        response = self.client.post(self.endpoint, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('backend.hub_views.requests.post')
    def test_user_lookup_found_locally(self, mock_post):
        """Test user lookup that finds user in local region stores."""
        # Setup store
        store = StoreRegistry.objects.create(
            store_id=1,
            store_name='Store 1',
            region=self.region,
            api_endpoint='http://store1:8000',
            status='active',
        )

        # Mock the store's user-exists endpoint to return true
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'exists': True}
        mock_post.return_value = mock_response

        data = {'email': 'user@example.com', 'requesting_store_id': 2}
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'found')
        self.assertEqual(response.data['home_store_id'], 1)
        self.assertEqual(response.data['home_store_endpoint'], 'http://store1:8000')

    @patch('backend.hub_views.requests.post')
    def test_user_lookup_not_found(self, mock_post):
        """Test user lookup when user is not found anywhere."""
        # No stores registered
        data = {'email': 'user@example.com', 'requesting_store_id': 1}
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['status'], 'not_found')

    @patch('backend.hub_views.requests.post')
    def test_user_lookup_creates_audit_log_on_success(self, mock_post):
        """Test that audit log is created on successful user lookup."""
        store = StoreRegistry.objects.create(
            store_id=1,
            store_name='Store 1',
            region=self.region,
            api_endpoint='http://store1:8000',
            status='active',
        )

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'exists': True}
        mock_post.return_value = mock_response

        data = {'email': 'user@example.com', 'requesting_store_id': 2}
        self.client.post(self.endpoint, data, format='json')

        log = SyncAuditLog.objects.filter(event_type='user_lookup', success=True).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.user_email, 'user@example.com')


class HubUserBroadcastViewTest(TestCase):
    """Test HubUserBroadcastView — finding users across regions."""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/backend/api/hub/user-broadcast/'
        self.region = Region.objects.create(name='logan')
        self.client.credentials(HTTP_AUTHORIZATION=f'NodeToken {settings.INTER_NODE_SECRET}')

    def test_broadcast_user_found(self):
        """Test successful user broadcast when user exists in this region."""
        store = StoreRegistry.objects.create(
            store_id=1,
            store_name='Store 1',
            region=self.region,
            api_endpoint='http://store1:8000',
            status='active',
        )

        with patch('backend.hub_views.requests.post') as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {'exists': True}
            mock_post.return_value = mock_response

            data = {'email': 'user@example.com', 'requesting_region': 'jersey'}
            response = self.client.post(self.endpoint, data, format='json')

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['status'], 'found')

    def test_broadcast_user_not_found(self):
        """Test broadcast when no active stores in this region."""
        data = {'email': 'user@example.com', 'requesting_region': 'jersey'}
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['status'], 'not_found')

    def test_broadcast_missing_email(self):
        """Test broadcast fails without email."""
        data = {'requesting_region': 'jersey'}
        response = self.client.post(self.endpoint, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class HubStoreRegistryViewTest(TestCase):
    """Test HubStoreRegistryView — discovering stores."""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/backend/api/hub/store-registry/'
        self.region = Region.objects.create(name='logan')

    def test_get_active_stores(self):
        """Test retrieving list of active stores."""
        store1 = StoreRegistry.objects.create(
            store_id=1,
            store_name='Store 1',
            region=self.region,
            api_endpoint='http://store1:8000',
            status='active',
            latitude=41.7421,
            longitude=-111.8070,
        )
        store2 = StoreRegistry.objects.create(
            store_id=2,
            store_name='Store 2',
            region=self.region,
            api_endpoint='http://store2:8000',
            status='inactive',
        )

        response = self.client.get(self.endpoint)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stores = response.data['stores']

        # Should only include active store
        self.assertEqual(len(stores), 1)
        self.assertEqual(stores[0]['store_id'], 1)
        self.assertEqual(stores[0]['store_name'], 'Store 1')

    def test_get_empty_registry(self):
        """Test retrieving registry when no active stores exist."""
        response = self.client.get(self.endpoint)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['stores']), 0)

    def test_registry_endpoint_no_auth_required(self):
        """Test that registry endpoint doesn't require authentication."""
        # This should work without credentials
        store = StoreRegistry.objects.create(
            store_id=1,
            store_name='Store 1',
            region=self.region,
            api_endpoint='http://store1:8000',
            status='active',
        )

        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class HubRevenueViewTest(TestCase):
    """Test HubRevenueView — aggregating revenue across stores."""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/backend/api/hub/revenue/'
        self.region = Region.objects.create(name='logan')
        self.client.credentials(HTTP_AUTHORIZATION=f'NodeToken {settings.INTER_NODE_SECRET}')

    def test_revenue_no_stores(self):
        """Test revenue when no active stores exist."""
        response = self.client.get(self.endpoint)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_revenue'], 0.0)
        self.assertEqual(response.data['store_count'], 0)

    @patch('backend.hub_views.requests.get')
    def test_revenue_aggregation(self, mock_get):
        """Test revenue aggregation from multiple stores."""
        # Create stores
        for i in range(2):
            StoreRegistry.objects.create(
                store_id=i+1,
                store_name=f'Store {i+1}',
                region=self.region,
                api_endpoint=f'http://store{i+1}:8000',
                status='active',
            )

        # Mock store revenue responses
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {'TotalAmount': 100.50},
            {'TotalAmount': 50.25},
        ]
        mock_get.return_value = mock_response

        response = self.client.get(self.endpoint)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Each store returns 150.75 total, 2 stores = 301.50
        self.assertEqual(response.data['total_revenue'], 301.50)
        self.assertEqual(response.data['store_count'], 2)

    @patch('backend.hub_views.requests.get')
    def test_revenue_store_failure(self, mock_get):
        """Test that failed stores are handled gracefully."""
        store = StoreRegistry.objects.create(
            store_id=1,
            store_name='Store 1',
            region=self.region,
            api_endpoint='http://store1:8000',
            status='active',
        )

        # Mock timeout
        mock_get.side_effect = Exception('Connection timeout')

        response = self.client.get(self.endpoint)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_revenue'], 0.0)
        self.assertEqual(response.data['store_count'], 0)

    def test_revenue_requires_auth(self):
        """Test that revenue endpoint requires authentication."""
        self.client.credentials()
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
