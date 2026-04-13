from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from unittest.mock import patch

from backend.models import Preference, Drink, VisitingUserCache, SyncAuditLog
from django.conf import settings
from django.utils import timezone


class InterNodeUserExistsViewTest(TestCase):
    """Test InterNodeUserExistsView — checking if user exists at this node."""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/backend/api/inter-node/user-exists/'
        self.client.credentials(HTTP_AUTHORIZATION=f'NodeToken {settings.INTER_NODE_SECRET}')

    def test_user_exists_true(self):
        """Test that user existence check returns true for existing user."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )

        data = {'email': 'test@example.com'}
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['exists'])

    def test_user_exists_false(self):
        """Test that user existence check returns false for non-existent user."""
        data = {'email': 'nonexistent@example.com'}
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['exists'])

    def test_user_exists_requires_auth(self):
        """Test that endpoint requires authentication."""
        self.client.credentials()
        data = {'email': 'test@example.com'}
        response = self.client.post(self.endpoint, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_exists_case_sensitivity(self):
        """Test email lookup handles case sensitivity correctly."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )

        # Django email lookup is case-insensitive by default
        data = {'email': 'TEST@EXAMPLE.COM'}
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['exists'])


class InterNodeUserSyncViewTest(TestCase):
    """Test InterNodeUserSyncView — syncing user data to visiting stores."""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/backend/api/inter-node/user-sync/'
        self.client.credentials(HTTP_AUTHORIZATION=f'NodeToken {settings.INTER_NODE_SECRET}')

    def test_user_sync_success(self):
        """Test successful user sync returns complete user payload."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            first_name='John',
            last_name='Doe',
            password='password123'
        )

        # Add preferences
        Preference.objects.create(UserID=user, Preference='Sweet')
        Preference.objects.create(UserID=user, Preference='Fruity')

        data = {'email': 'test@example.com', 'requesting_store_id': 42}
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data

        # Verify user data
        self.assertEqual(payload['username'], 'testuser')
        self.assertEqual(payload['email'], 'test@example.com')
        self.assertEqual(payload['first_name'], 'John')
        self.assertEqual(payload['last_name'], 'Doe')

        # Verify preferences included
        self.assertIn('preferences', payload)
        self.assertIn('Sweet', payload['preferences'])
        self.assertIn('Fruity', payload['preferences'])

    def test_user_sync_not_found(self):
        """Test user sync fails when user doesn't exist."""
        data = {'email': 'nonexistent@example.com', 'requesting_store_id': 42}
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    def test_user_sync_includes_favorite_drinks(self):
        """Test that user sync includes favorite drinks."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )

        drink = Drink.objects.create(
            Name='Test Drink',
            SodaUsed=['Coke'],
            SyrupsUsed=['Vanilla'],
            AddIns=['Cream'],
            Price=2.50,
            Size='16oz',
            User_Created=False,
        )
        drink.Favorite.add(user)

        data = {'email': 'test@example.com', 'requesting_store_id': 42}
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data

        self.assertIn('favorite_drinks', payload)
        self.assertEqual(len(payload['favorite_drinks']), 1)
        self.assertEqual(payload['favorite_drinks'][0]['Name'], 'Test Drink')

    def test_user_sync_role_detection(self):
        """Test that user role is correctly detected (customer/manager/admin)."""
        # Admin user
        admin = User.objects.create_user(
            username='role_test_admin',
            email='admin@example.com',
            password='password123'
        )
        admin.is_superuser = True
        admin.save()

        data = {'email': 'admin@example.com'}
        response = self.client.post(self.endpoint, data, format='json')
        self.assertEqual(response.data['role'], 'admin')

        # Manager user
        manager = User.objects.create_user(
            username='role_test_manager',
            email='manager@example.com',
            password='password123'
        )
        manager.is_staff = True
        manager.save()

        data = {'email': 'manager@example.com'}
        response = self.client.post(self.endpoint, data, format='json')
        self.assertEqual(response.data['role'], 'manager')

        # Regular customer
        customer = User.objects.create_user(
            username='customer',
            email='customer@example.com',
            password='password123'
        )

        data = {'email': 'customer@example.com'}
        response = self.client.post(self.endpoint, data, format='json')
        self.assertEqual(response.data['role'], 'customer')

    def test_user_sync_creates_audit_log(self):
        """Test that audit log is created on successful sync."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )

        data = {'email': 'test@example.com', 'requesting_store_id': 42}
        response = self.client.post(self.endpoint, data, format='json')

        log = SyncAuditLog.objects.filter(event_type='user_sync', success=True).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.user_email, 'test@example.com')


class InterNodeProfileUpdateViewTest(TestCase):
    """Test InterNodeProfileUpdateView — updating user profile from visiting store."""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/backend/api/inter-node/profile-update/'
        self.client.credentials(HTTP_AUTHORIZATION=f'NodeToken {settings.INTER_NODE_SECRET}')

    def test_update_preferences(self):
        """Test updating user preferences."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )

        # Add initial preference
        Preference.objects.create(UserID=user, Preference='Sweet')

        data = {
            'user_id': user.pk,
            'changes': {
                'preferences': ['Fruity', 'Sour']
            }
        }
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify preferences updated
        prefs = Preference.objects.filter(UserID=user).values_list('Preference', flat=True)
        self.assertNotIn('Sweet', prefs)
        self.assertIn('Fruity', prefs)
        self.assertIn('Sour', prefs)

    def test_update_favorite_drinks_new_drinks(self):
        """Test adding new favorite drinks created at visiting store."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )

        data = {
            'user_id': user.pk,
            'changes': {
                'favorite_drinks': [
                    {
                        'home_drink_id': None,  # New drink
                        'Name': 'Custom Drink',
                        'SodaUsed': ['Coke'],
                        'SyrupsUsed': ['Vanilla'],
                        'AddIns': [],
                        'Price': 2.50,
                        'Size': '16oz',
                        'Ice': 'regular',
                    }
                ]
            }
        }
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify drink was created
        drinks = Drink.objects.filter(Favorite=user)
        self.assertEqual(drinks.count(), 1)
        self.assertEqual(drinks.first().Name, 'Custom Drink')

    def test_update_favorite_drinks_existing(self):
        """Test updating existing favorite drinks."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )

        drink = Drink.objects.create(
            Name='Original Drink',
            SodaUsed=['Coke'],
            SyrupsUsed=['Vanilla'],
            Price=2.50,
            User_Created=False,
        )
        drink.Favorite.add(user)

        # Update to have this drink as favorite still
        data = {
            'user_id': user.pk,
            'changes': {
                'favorite_drinks': [
                    {
                        'home_drink_id': drink.pk,
                        'Name': 'Original Drink',
                        'SodaUsed': ['Coke'],
                        'SyrupsUsed': ['Vanilla'],
                        'Price': 2.50,
                    }
                ]
            }
        }
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Drink should still be favorite
        self.assertTrue(drink.Favorite.filter(pk=user.pk).exists())

    def test_update_nonexistent_user(self):
        """Test profile update fails for non-existent user."""
        data = {
            'user_id': 999,
            'changes': {'preferences': ['Sweet']}
        }
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_profile_update_creates_audit_log(self):
        """Test that audit log is created on profile update."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )

        data = {
            'user_id': user.pk,
            'changes': {'preferences': ['Sweet']}
        }
        response = self.client.post(self.endpoint, data, format='json')

        log = SyncAuditLog.objects.filter(event_type='profile_update', success=True).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.user_email, 'test@example.com')


class InterNodeTokenVerifyViewTest(TestCase):
    """Test InterNodeTokenVerifyView — verifying auth tokens across nodes."""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/backend/api/inter-node/token-verify/'
        self.client.credentials(HTTP_AUTHORIZATION=f'NodeToken {settings.INTER_NODE_SECRET}')

    def test_token_verify_success(self):
        """Test successful token verification returns user payload."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )
        token = Token.objects.create(user=user)

        data = {'token': token.key, 'requesting_store_id': 42}
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertEqual(response.data['email'], 'test@example.com')

    def test_token_verify_invalid_token(self):
        """Test token verification fails with invalid token."""
        data = {'token': 'invalid_token_xyz', 'requesting_store_id': 42}
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', response.data)

    def test_token_verify_missing_token(self):
        """Test token verification fails when token not provided."""
        data = {'requesting_store_id': 42}
        response = self.client.post(self.endpoint, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_verify_requires_auth(self):
        """Test that endpoint requires inter-node authentication."""
        self.client.credentials()
        user = User.objects.create_user(username='testuser', email='test@example.com')
        token = Token.objects.create(user=user)

        data = {'token': token.key}
        response = self.client.post(self.endpoint, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class InterNodeHealthCheckViewTest(TestCase):
    """Test InterNodeHealthCheckView — checking node availability."""

    def setUp(self):
        self.client = APIClient()
        self.endpoint = '/backend/api/inter-node/health-check/'
        self.client.credentials(HTTP_AUTHORIZATION=f'NodeToken {settings.INTER_NODE_SECRET}')

    def test_health_check_success(self):
        """Test that health check returns node info."""
        response = self.client.post(self.endpoint, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ok')
        self.assertIn('store_id', response.data)
        self.assertIn('region', response.data)

    def test_health_check_requires_auth(self):
        """Test that health check requires authentication."""
        self.client.credentials()
        response = self.client.post(self.endpoint, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_health_check_includes_region(self):
        """Test that health check includes region information."""
        response = self.client.post(self.endpoint, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['region'], settings.REGION)


class InterNodeIntegrationTest(TestCase):
    """Integration tests for inter-node user sync workflow."""

    def setUp(self):
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'NodeToken {settings.INTER_NODE_SECRET}')

    def test_user_sync_workflow(self):
        """Test complete user sync workflow: exists -> sync -> profile update."""
        # 1. Create user at home store
        user = User.objects.create_user(
            username='traveler',
            email='traveler@example.com',
            password='password123'
        )
        Preference.objects.create(UserID=user, Preference='Sweet')

        # 2. Visiting store checks if user exists
        response = self.client.post(
            '/backend/api/inter-node/user-exists/',
            {'email': 'traveler@example.com'},
            format='json'
        )
        self.assertTrue(response.data['exists'])

        # 3. Visiting store syncs user data
        response = self.client.post(
            '/backend/api/inter-node/user-sync/',
            {'email': 'traveler@example.com', 'requesting_store_id': 2},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'traveler')

        # 4. Visiting user updates preferences on visiting store
        response = self.client.post(
            '/backend/api/inter-node/profile-update/',
            {
                'user_id': user.pk,
                'changes': {'preferences': ['Sweet', 'Fruity']}
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 5. Verify preferences were updated at home store
        prefs = Preference.objects.filter(UserID=user).values_list('Preference', flat=True)
        self.assertEqual(set(prefs), {'Sweet', 'Fruity'})
