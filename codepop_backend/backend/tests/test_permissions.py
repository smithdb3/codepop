from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory, APITestCase
from rest_framework.request import Request
from backend.permissions import IsNodeAuthenticated, IsSuperUser, IsAdminUser
from django.contrib.auth.models import User, AnonymousUser


class PermissionTests(TestCase):
    """
    Unit tests for permission classes: IsNodeAuthenticated, IsSuperUser, IsAdminUser.
    These tests verify permission logic in isolation without routing through views.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.regular_user = User.objects.create_user(username='user', password='pass')
        self.staff_user = User.objects.create_user(username='staff', password='pass', is_staff=True)
        self.superuser = User.objects.create_user(username='super', password='pass', is_superuser=True)

    # ─────────────────────────────────────────────────────────────
    # IsNodeAuthenticated Tests
    # ─────────────────────────────────────────────────────────────

    @override_settings(INTER_NODE_SECRET='test-secret')
    def test_node_auth_valid_token(self):
        """Correct NodeToken should grant access."""
        request = self.factory.get('/')
        request.META['HTTP_AUTHORIZATION'] = 'NodeToken test-secret'
        permission = IsNodeAuthenticated()
        self.assertTrue(permission.has_permission(request, None))

    @override_settings(INTER_NODE_SECRET='test-secret')
    def test_node_auth_wrong_token(self):
        """Wrong token should deny access."""
        request = self.factory.get('/')
        request.META['HTTP_AUTHORIZATION'] = 'NodeToken wrong-secret'
        permission = IsNodeAuthenticated()
        self.assertFalse(permission.has_permission(request, None))

    @override_settings(INTER_NODE_SECRET='test-secret')
    def test_node_auth_missing_header(self):
        """Missing Authorization header should deny access."""
        request = self.factory.get('/')
        permission = IsNodeAuthenticated()
        self.assertFalse(permission.has_permission(request, None))

    @override_settings(INTER_NODE_SECRET='')
    def test_node_auth_unconfigured_secret(self):
        """Unconfigured INTER_NODE_SECRET should fail closed (deny all)."""
        request = self.factory.get('/')
        request.META['HTTP_AUTHORIZATION'] = 'NodeToken anything'
        permission = IsNodeAuthenticated()
        self.assertFalse(permission.has_permission(request, None))

    @override_settings(INTER_NODE_SECRET='test-secret')
    def test_node_auth_bad_header_format(self):
        """Malformed header (wrong prefix) should deny access."""
        request = self.factory.get('/')
        request.META['HTTP_AUTHORIZATION'] = 'Bearer test-secret'
        permission = IsNodeAuthenticated()
        self.assertFalse(permission.has_permission(request, None))

    # ─────────────────────────────────────────────────────────────
    # IsSuperUser Tests
    # ─────────────────────────────────────────────────────────────

    def test_superuser_allows_superuser(self):
        """User with is_superuser=True should be allowed."""
        request = self.factory.get('/')
        request.user = self.superuser
        permission = IsSuperUser()
        self.assertTrue(permission.has_permission(request, None))

    def test_superuser_blocks_staff_user(self):
        """Staff user (not superuser) should be denied."""
        request = self.factory.get('/')
        request.user = self.staff_user
        permission = IsSuperUser()
        self.assertFalse(permission.has_permission(request, None))

    def test_superuser_blocks_regular_user(self):
        """Regular user should be denied."""
        request = self.factory.get('/')
        request.user = self.regular_user
        permission = IsSuperUser()
        self.assertFalse(permission.has_permission(request, None))

    def test_superuser_blocks_unauthenticated(self):
        """Anonymous user should be denied."""
        request = self.factory.get('/')
        request.user = AnonymousUser()
        permission = IsSuperUser()
        self.assertFalse(permission.has_permission(request, None))

    # ─────────────────────────────────────────────────────────────
    # IsAdminUser Tests
    # ─────────────────────────────────────────────────────────────

    def test_admin_allows_superuser(self):
        """Superuser should be allowed."""
        request = self.factory.get('/')
        request.user = self.superuser
        permission = IsAdminUser()
        self.assertTrue(permission.has_permission(request, None))

    def test_admin_allows_staff(self):
        """Staff user should be allowed."""
        request = self.factory.get('/')
        request.user = self.staff_user
        permission = IsAdminUser()
        self.assertTrue(permission.has_permission(request, None))

    def test_admin_blocks_regular_user(self):
        """Regular user should be denied."""
        request = self.factory.get('/')
        request.user = self.regular_user
        permission = IsAdminUser()
        self.assertFalse(permission.has_permission(request, None))

    def test_admin_blocks_unauthenticated(self):
        """Anonymous user should be denied."""
        request = self.factory.get('/')
        request.user = AnonymousUser()
        permission = IsAdminUser()
        self.assertFalse(permission.has_permission(request, None))
