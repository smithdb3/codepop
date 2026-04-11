from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from backend.models import Permission, Role, AuditLog


class AdminEndpointTests(APITestCase):
    """
    Tests for admin dashboard endpoints. All endpoints require IsAdminUser permission.
    Verifies that:
    - Admin/staff users receive 200/201 responses
    - Regular users receive 403 Forbidden
    - Unauthenticated users receive 401 Unauthorized
    """

    def setUp(self):
        """Create test users: regular user and staff user."""
        self.regular_user = User.objects.create_user(username='regular', password='pass')
        self.staff_user = User.objects.create_user(username='staff', password='pass', is_staff=True)

        self.token_regular = Token.objects.create(user=self.regular_user)
        self.token_staff = Token.objects.create(user=self.staff_user)

    def authenticate_as(self, token):
        """Set Authorization header for subsequent requests."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def clear_auth(self):
        """Clear authentication."""
        self.client.credentials()

    # ─────────────────────────────────────────────────────────────
    # Permission Endpoints
    # ─────────────────────────────────────────────────────────────

    def test_list_permissions_as_admin(self):
        """Admin can list permissions."""
        self.authenticate_as(self.token_staff)
        response = self.client.get('/backend/api/admin/permissions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_permissions_rejects_regular(self):
        """Regular user gets 403 when listing permissions."""
        self.authenticate_as(self.token_regular)
        response = self.client.get('/backend/api/admin/permissions/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_permissions_rejects_anon(self):
        """Unauthenticated user gets 401 when listing permissions."""
        self.clear_auth()
        response = self.client.get('/backend/api/admin/permissions/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ─────────────────────────────────────────────────────────────
    # User Endpoints
    # ─────────────────────────────────────────────────────────────

    def test_list_users_as_admin(self):
        """Admin can list users."""
        self.authenticate_as(self.token_staff)
        response = self.client.get('/backend/api/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_user_as_admin(self):
        """Admin can create a new user."""
        self.authenticate_as(self.token_staff)
        data = {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'pass123',
            'is_staff': False
        }
        response = self.client.post('/backend/api/admin/users/create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_create_user_rejects_regular(self):
        """Regular user gets 403 when creating a user."""
        self.authenticate_as(self.token_regular)
        data = {
            'username': 'another',
            'email': 'another@test.com',
            'password': 'pass123'
        }
        response = self.client.post('/backend/api/admin/users/create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_user_detail_as_admin(self):
        """Admin can get a specific user's details."""
        self.authenticate_as(self.token_staff)
        response = self.client.get(f'/backend/api/admin/users/{self.regular_user.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_disable_user_as_admin(self):
        """Admin can disable a user."""
        self.authenticate_as(self.token_staff)
        response = self.client.post(f'/backend/api/admin/users/{self.regular_user.id}/disable/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.regular_user.refresh_from_db()
        self.assertFalse(self.regular_user.is_active)

    def test_enable_user_as_admin(self):
        """Admin can enable a user."""
        # First disable the user
        self.regular_user.is_active = False
        self.regular_user.save()

        self.authenticate_as(self.token_staff)
        response = self.client.post(f'/backend/api/admin/users/{self.regular_user.id}/enable/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.regular_user.refresh_from_db()
        self.assertTrue(self.regular_user.is_active)

    # ─────────────────────────────────────────────────────────────
    # Role Endpoints
    # ─────────────────────────────────────────────────────────────

    def test_list_roles_as_admin(self):
        """Admin can list roles."""
        self.authenticate_as(self.token_staff)
        response = self.client.get('/backend/api/admin/roles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_role_as_admin(self):
        """Admin can create a new role."""
        self.authenticate_as(self.token_staff)
        data = {
            'name': 'CustomRole',
            'permissions': [],
            'is_builtin': False
        }
        response = self.client.post('/backend/api/admin/roles/', data, format='json')
        # Response may be 200 or 201 depending on view implementation
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    # ─────────────────────────────────────────────────────────────
    # Audit Log Endpoints
    # ─────────────────────────────────────────────────────────────

    def test_list_audit_logs_as_admin(self):
        """Admin can list audit logs."""
        self.authenticate_as(self.token_staff)
        response = self.client.get('/backend/api/admin/audit-logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_audit_logs_rejects_regular(self):
        """Regular user gets 403 when listing audit logs."""
        self.authenticate_as(self.token_regular)
        response = self.client.get('/backend/api/admin/audit-logs/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ─────────────────────────────────────────────────────────────
    # Admin KPI Endpoint
    # ─────────────────────────────────────────────────────────────

    def test_admin_kpi_as_admin(self):
        """Admin can access KPI dashboard."""
        self.authenticate_as(self.token_staff)
        response = self.client.get('/backend/api/admin/kpi/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_kpi_rejects_regular(self):
        """Regular user gets 403 when accessing KPI dashboard."""
        self.authenticate_as(self.token_regular)
        response = self.client.get('/backend/api/admin/kpi/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
