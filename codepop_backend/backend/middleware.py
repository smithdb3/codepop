"""
Node Identity Middleware

Reads node identity configuration from Django settings and attaches it to every request
so views can easily access node information without re-reading settings.
"""

from django.conf import settings


class NodeIdentityMiddleware:
    """
    Middleware that attaches node identity to every request.

    Provides request.node_identity dict with:
    - store_id: This node's store ID (int)
    - region: This node's region (str)
    - is_hub: Whether this node is a hub (bool)
    - is_master: Whether this node is the master hub (bool)
    - hub_url: URL of this node's regional hub (str, empty if this is a hub)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Attach node identity to request
        request.node_identity = {
            "store_id": int(settings.STORE_ID),
            "region": settings.REGION,
            "is_hub": settings.IS_HUB,
            "is_master": settings.IS_MASTER,
            "hub_url": settings.HUB_URL,
        }

        response = self.get_response(request)
        return response
