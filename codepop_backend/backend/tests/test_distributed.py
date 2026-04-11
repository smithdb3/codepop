from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from unittest.mock import patch, MagicMock
from backend.models import (
    VisitingUserCache, PendingProfileUpdate, StoreRegistry,
    SyncAuditLog, Region
)
from django.utils import timezone
from datetime import timedelta


class InterNodeAuthTests(APITestCase):
    """
    Tests that all /api/hub/ and /api/inter-node/ endpoints reject
    requests without a valid NodeToken header.
    """
    def test_hub_register_rejects_no_token(self):
        resp = self.client.post('/backend/api/hub/register/', {'store_id': 1}, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_hub_register_rejects_wrong_token(self):
        self.client.credentials(HTTP_AUTHORIZATION='NodeToken wrong-secret')
        resp = self.client.post('/backend/api/hub/register/', {'store_id': 1}, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_user_sync_rejects_no_token(self):
        resp = self.client.post('/backend/api/inter-node/user-sync/', {'email': 'test@test.com'}, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_profile_update_rejects_no_token(self):
        resp = self.client.post('/backend/api/inter-node/profile-update/', {'user_id': 1}, format='json')
        self.assertEqual(resp.status_code, 401)


class StoreRegistryTests(APITestCase):
    """Tests hub store registration and heartbeat flows."""

    def setUp(self):
        from django.conf import settings
        settings.INTER_NODE_SECRET = 'test-secret'
        self.client.credentials(HTTP_AUTHORIZATION='NodeToken test-secret')
        # Create a Region instance for FK relationship
        self.region = Region.objects.create(name='logan', display_name='Logan, UT')

    def test_store_can_register(self):
        resp = self.client.post('/backend/api/hub/register/', {
            'store_id': 42,
            'store_name': 'Test Store',
            'region': 'logan',
            'api_endpoint': 'http://10.0.0.2:8000',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'registered')
        self.assertTrue(StoreRegistry.objects.filter(store_id=42).exists())

    def test_heartbeat_updates_timestamp(self):
        StoreRegistry.objects.create(
            store_id=42, store_name='Test', region=self.region,
            api_endpoint='http://10.0.0.2:8000', status='active',
        )
        resp = self.client.post('/backend/api/hub/heartbeat/', {'store_id': 42}, format='json')
        self.assertEqual(resp.status_code, 200)
        store = StoreRegistry.objects.get(store_id=42)
        self.assertEqual(store.missed_heartbeats, 0)


class VisitingUserCacheTests(APITestCase):
    """Tests the VisitingUserCache model and TTL behavior."""

    def test_cache_expires(self):
        cache = VisitingUserCache.objects.create(
            user_id=99, username='alice', email='alice@test.com',
            hashed_password='fakehash', role='customer',
            home_store_id=1, home_store_endpoint='http://home:8000',
            expires_at=timezone.now() - timedelta(hours=1),
        )
        self.assertTrue(cache.is_expired())

    def test_cache_not_expired(self):
        cache = VisitingUserCache.objects.create(
            user_id=99, username='alice', email='alice@test.com',
            hashed_password='fakehash', role='customer',
            home_store_id=1, home_store_endpoint='http://home:8000',
            expires_at=timezone.now() + timedelta(hours=23),
        )
        self.assertFalse(cache.is_expired())


class PendingProfileUpdateTests(APITestCase):
    """Tests the PendingProfileUpdate encryption and retry logic."""

    def test_encrypt_decrypt_roundtrip(self):
        from django.conf import settings
        settings.INTER_NODE_SECRET = 'test-key-for-encryption'
        original = {'preferences': ['Fruity', 'Sweet'], 'favorite_drink_ids': [1, 2]}
        encrypted = PendingProfileUpdate.encrypt(original)
        decrypted = PendingProfileUpdate.decrypt(encrypted)
        self.assertEqual(original, decrypted)

    def test_encrypted_blob_not_plaintext(self):
        from django.conf import settings
        settings.INTER_NODE_SECRET = 'test-key-for-encryption'
        original = {'preferences': ['Fruity']}
        encrypted = PendingProfileUpdate.encrypt(original)
        self.assertNotIn('Fruity', encrypted)


class UserReplicationTests(APITestCase):
    """
    Tests the distributed login flow using mocked outbound HTTP calls.
    We mock requests.post to avoid actual network calls in tests.
    """

    def setUp(self):
        from django.conf import settings
        settings.INTER_NODE_SECRET = 'test-secret'
        settings.STORE_ID = '42'
        settings.REGION = 'logan'
        settings.HUB_URL = 'http://hub:8000'

    @patch('backend.views.requests.post')
    def test_visiting_user_triggers_hub_lookup(self, mock_post):
        """Unknown user login should call hub user-lookup."""
        hub_response = MagicMock()
        hub_response.status_code = 200
        hub_response.json.return_value = {
            'status': 'found',
            'home_store_id': 1,
            'home_store_endpoint': 'http://home-store:8000',
        }
        sync_response = MagicMock()
        sync_response.status_code = 200
        from django.contrib.auth.hashers import make_password
        sync_response.json.return_value = {
            'user_id': 99, 'username': 'alice',
            'email': 'alice@test.com',
            'hashed_password': make_password('secret123'),
            'role': 'customer',
            'home_store_id': 1,
            'preferences': [], 'favorite_drink_ids': [],
        }
        mock_post.side_effect = [hub_response, sync_response]

        resp = self.client.post('/backend/auth/login/',
                                {'username': 'alice@test.com', 'password': 'secret123'})
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data.get('visiting'))
        self.assertTrue(VisitingUserCache.objects.filter(email='alice@test.com').exists())

    @patch('backend.views.requests.post')
    def test_home_store_unreachable_no_cache_returns_503(self, mock_post):
        """If hub returns found but home store is unreachable, return 503."""
        hub_response = MagicMock()
        hub_response.status_code = 200
        hub_response.json.return_value = {
            'status': 'found', 'home_store_id': 1,
            'home_store_endpoint': 'http://home-store:8000',
        }
        import requests as req
        mock_post.side_effect = [hub_response, req.ConnectionError('unreachable')]

        resp = self.client.post('/backend/auth/login/',
                                {'username': 'alice@test.com', 'password': 'secret123'})
        self.assertEqual(resp.status_code, 503)
        self.assertIn('home store', resp.data['error'].lower())
