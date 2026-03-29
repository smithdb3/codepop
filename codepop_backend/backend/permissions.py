from rest_framework.permissions import BasePermission
from django.conf import settings


class IsNodeAuthenticated(BasePermission):
    """
    Allows access only to inter-node requests that include the correct
    Authorization header: "NodeToken <INTER_NODE_SECRET>"

    This is the Sprint 3 shared-secret approach. The JWT RS256 upgrade
    path is documented in the architecture LLD.

    Usage:
        class MyHubView(APIView):
            permission_classes = [IsNodeAuthenticated]
    """
    message = 'Inter-node authentication required. Include Authorization: NodeToken <secret>'

    def has_permission(self, request, view):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('NodeToken '):
            return False
        provided_token = auth_header[len('NodeToken '):]
        expected_token = settings.INTER_NODE_SECRET
        if not expected_token:
            # Fail closed: if INTER_NODE_SECRET is not configured, deny all
            return False
        return provided_token == expected_token


class IsSuperUser(BasePermission):
    """
    Allows access only to authenticated Django superusers (is_superuser=True).
    Used by NationalRevenueView.
    """
    message = 'Superuser access required.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsAdminUser(BasePermission):
    """
    Allows access only to authenticated users who are staff or superusers.
    Used by admin dashboard API endpoints.
    """
    message = 'Admin access required.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser))
