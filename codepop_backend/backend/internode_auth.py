"""
Clean inter-node authentication using shared secrets.
Single global INTER_NODE_SECRET for all nodes in the network.
"""
import hmac
import hashlib
import json
import base64
import time
from rest_framework.authentication import BaseAuthentication
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings


class NodeTokenAuthentication(BaseAuthentication):
    """
    Validates Authorization: NodeToken <token> header against INTER_NODE_SECRET.
    Returns a synthetic AnonymousUser with is_node=True for authorized requests.
    """
    keyword = 'NodeToken'

    def authenticate(self, request):
        auth = request.META.get('HTTP_AUTHORIZATION', '').split()

        if not auth or auth[0].lower() != self.keyword.lower():
            return None

        if len(auth) != 2:
            raise AuthenticationFailed('Invalid NodeToken header')

        token = auth[1]
        if not self._verify_token(token):
            raise AuthenticationFailed('Invalid NodeToken')

        user = request.user.__class__()
        user.is_node = True
        user.is_authenticated = True
        return (user, token)

    def _verify_token(self, token):
        """Verify token matches INTER_NODE_SECRET."""
        expected = settings.INTER_NODE_SECRET
        return hmac.compare_digest(token, expected)


class IsInterNodeRequest(BasePermission):
    """
    Allow only inter-node requests (authenticated via NodeToken).
    """
    message = 'Only inter-node requests allowed'

    def has_permission(self, request, view):
        return getattr(request.user, 'is_node', False) is True


class IsHubRequest(BasePermission):
    """
    Allow only requests from hub nodes (via X-Node-Role: hub header).
    Requires NodeTokenAuthentication.
    """
    message = 'Only hub nodes allowed'

    def has_permission(self, request, view):
        if not getattr(request.user, 'is_node', False):
            return False
        node_role = request.META.get('HTTP_X_NODE_ROLE', '').lower()
        return node_role == 'hub'


def b64_encode(data):
    """Encode to base64url without padding."""
    return base64.urlsafe_b64encode(
        json.dumps(data, separators=(',', ':')).encode()
    ).rstrip(b'=').decode()


def b64_decode(s):
    """Decode from base64url with auto-padding."""
    padding = 4 - (len(s) % 4)
    s += '=' * padding
    return json.loads(base64.urlsafe_b64decode(s))


def jwt_sign(payload, secret, hours=24):
    """
    Sign a payload as HMAC-SHA256 JWT.
    Returns: "header.payload.signature"
    """
    header = {'alg': 'HS256', 'typ': 'JWT'}
    claims = {
        **payload,
        'iat': int(time.time()),
        'exp': int(time.time()) + (hours * 3600),
    }

    msg = b64_encode(header) + '.' + b64_encode(claims)
    sig = hmac.new(
        secret.encode() if isinstance(secret, str) else secret,
        msg.encode(),
        hashlib.sha256
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).rstrip(b'=').decode()

    return msg + '.' + sig_b64


def jwt_verify(token, secret):
    """
    Verify and decode a JWT. Raises AuthenticationFailed on invalid/expired token.
    Returns: decoded payload dict
    """
    try:
        parts = token.split('.')
        if len(parts) != 3:
            raise Exception('Invalid token format')

        header, payload_b64, sig_b64 = parts
        payload = b64_decode(payload_b64)

        # Verify signature
        msg = header + '.' + payload_b64
        expected_sig = hmac.new(
            secret.encode() if isinstance(secret, str) else secret,
            msg.encode(),
            hashlib.sha256
        ).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).rstrip(b'=').decode()

        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            raise Exception('Invalid signature')

        # Check expiration
        if payload.get('exp', 0) < time.time():
            raise Exception('Token expired')

        return payload
    except Exception as e:
        raise AuthenticationFailed(f'Invalid JWT: {str(e)}')
