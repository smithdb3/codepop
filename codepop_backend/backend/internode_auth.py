"""
Inter-Node Authentication

Provides NodeTokenAuthentication (DRF authentication class) and IsInterNodeRequest
(DRF permission class) for validating requests from other nodes in the distributed system.

Auth flow:
1. Incoming request has header: Authorization: NodeToken {secret}
2. NodeTokenAuthentication extracts the secret and validates it
3. For Sprint 3, falls back to settings.INTER_NODE_SECRET (simple shared secret)
4. Future: will validate against NodeCertificate table with JWT RS256 signatures
5. IsInterNodeRequest permission class ensures only inter-node requests proceed
"""

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import AuthenticationFailed
from backend.models import NodeCertificate


class NodeTokenAuthentication(BaseAuthentication):
    """
    Inter-node authentication using shared secrets.

    Sprint 3 (current): Validates against settings.INTER_NODE_SECRET
    Future: Will validate against NodeCertificate table with JWT RS256

    Header format: Authorization: NodeToken {secret}
    """

    keyword = "NodeToken"

    def get_authorization_header(self, request):
        """Extract Authorization header."""
        auth = get_authorization_header(request).split()
        if not auth or auth[0].lower() != self.keyword.lower().encode():
            return None
        if len(auth) == 1:
            raise AuthenticationFailed("Invalid token header. No credentials provided.")
        if len(auth) > 2:
            raise AuthenticationFailed("Invalid token header. Token string should not contain spaces.")
        return auth[1].decode()

    def authenticate(self, request):
        """
        Authenticate the request using NodeToken header.
        Returns (user, auth) tuple on success, None if no auth header, raises AuthenticationFailed on invalid token.
        """
        token = self.get_authorization_header(request)
        if token is None:
            # No NodeToken header - return None to let other authenticators handle it
            return None

        return self.authenticate_credentials(token)

    def authenticate_credentials(self, key):
        """
        Validate the token against NodeCertificate table or settings.INTER_NODE_SECRET.

        Returns (synthetic_user, token) tuple.
        Raises AuthenticationFailed if token is invalid.
        """
        # Sprint 3: First check against settings.INTER_NODE_SECRET (simple shared secret)
        if settings.INTER_NODE_SECRET and key == settings.INTER_NODE_SECRET:
            # Create a synthetic user object for DRF permission system
            from django.contrib.auth.models import AnonymousUser
            synthetic_user = AnonymousUser()
            synthetic_user.is_node = True  # Mark as inter-node request
            return (synthetic_user, key)

        # Future: Check against NodeCertificate table
        # For now, we skip this and only use the settings secret
        try:
            cert = NodeCertificate.objects.get(
                shared_secret=key,
                is_active=True,
                expires_at__gt=timezone.now(),
            )
            # Valid certificate found
            from django.contrib.auth.models import AnonymousUser
            synthetic_user = AnonymousUser()
            synthetic_user.is_node = True
            synthetic_user.node_id = cert.node_id
            return (synthetic_user, key)
        except NodeCertificate.DoesNotExist:
            pass

        # No valid token found
        raise AuthenticationFailed("Invalid or expired NodeToken.")

    def authenticate_header(self, request):
        """Return a string for the WWW-Authenticate header."""
        return self.keyword


class IsInterNodeRequest(BasePermission):
    """
    Permission class for inter-node communication endpoints.

    Only allows requests that have been authenticated via NodeTokenAuthentication.
    Checks that request.user.is_node == True (set by NodeTokenAuthentication).
    """

    message = "Inter-node authentication required."

    def has_permission(self, request, view):
        """Check if the request is from another node."""
        # NodeTokenAuthentication sets is_node=True on synthetic user
        return hasattr(request.user, "is_node") and request.user.is_node
