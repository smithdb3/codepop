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

        Correct lookup order:
        1. Check NodeCertificate table first (per-node secrets issued during registration)
        2. Fall back to settings.INTER_NODE_SECRET (bootstrap/global fallback)
        3. Raise AuthenticationFailed if neither match

        Returns (synthetic_user, token) tuple with node_id and node_type set.
        Raises AuthenticationFailed if token is invalid.
        """
        from django.contrib.auth.models import AnonymousUser

        # Step 1: Check NodeCertificate table for per-node secrets
        try:
            cert = NodeCertificate.objects.get(
                shared_secret=key,
                is_active=True,
                expires_at__gt=timezone.now(),
            )
            # Valid per-node certificate found
            synthetic_user = AnonymousUser()
            synthetic_user.is_node = True
            synthetic_user.node_id = cert.node_id
            synthetic_user.node_type = cert.node_type
            return (synthetic_user, key)
        except NodeCertificate.DoesNotExist:
            pass

        # Step 2: Fall back to global INTER_NODE_SECRET (bootstrap only)
        if settings.INTER_NODE_SECRET and key == settings.INTER_NODE_SECRET:
            synthetic_user = AnonymousUser()
            synthetic_user.is_node = True
            synthetic_user.node_id = "global"  # Indicates global fallback was used
            synthetic_user.node_type = None
            return (synthetic_user, key)

        # Step 3: No valid token found
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


def get_node_id_from_request(request):
    """
    Extract the node_id from an inter-node authenticated request.

    Returns the node_id if available (from NodeCertificate), or "global" if
    the global INTER_NODE_SECRET was used for auth.

    Useful for audit logging and tracking which node made the request.
    """
    if hasattr(request.user, "node_id"):
        return request.user.node_id
    return "unknown"


# ============================================================================
# JWT Token Helpers for Visiting User Authentication
# ============================================================================

import jwt as pyjwt


def jwt_sign(payload: dict, secret: str, expires_in_hours: int = 24) -> str:
    """
    Sign a payload as HMAC-SHA256 JWT. Adds iat and exp claims automatically.

    Args:
        payload: Dictionary to encode in the JWT
        secret: Shared secret for HMAC-SHA256 signing
        expires_in_hours: Token lifetime in hours (default 24h)

    Returns:
        Signed JWT token as string
    """
    import time
    now = int(time.time())
    payload_with_claims = {
        **payload,
        "iat": now,
        "exp": now + (expires_in_hours * 3600),
    }
    return pyjwt.encode(payload_with_claims, secret, algorithm="HS256")


def jwt_verify(token: str, secret: str) -> dict:
    """
    Decode and verify a JWT. Returns the payload dict on success.

    Args:
        token: JWT token string
        secret: Shared secret for HMAC-SHA256 verification

    Returns:
        Decoded payload dictionary

    Raises:
        jwt.ExpiredSignatureError: Token has expired
        jwt.InvalidTokenError: Token signature or format is invalid
    """
    return pyjwt.decode(token, secret, algorithms=["HS256"])
