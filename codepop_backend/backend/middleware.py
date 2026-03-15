"""
Node Identity Middleware

Reads node identity configuration from Django settings and attaches it to every request
so views can easily access node information without re-reading settings.
"""

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


class NodeIdentityMiddleware:
    """
    Middleware that attaches node identity to every request.

    Provides request.node_identity dict with:
    - store_id: This node's store ID (int)
    - region: This node's region (str)
    - is_hub: Whether this node is a hub (bool)
    - is_master: Whether this node is the master hub (bool)
    - hub_url: URL of this node's regional hub (str, empty if this is a hub)

    Validates critical settings at startup (fail-fast if configuration is incomplete).
    """

    def __init__(self, get_response):
        self.get_response = get_response

        # Cache coerced values for performance
        self.store_id = int(settings.STORE_ID) if settings.STORE_ID else 0
        self.region = settings.REGION
        self.is_hub = settings.IS_HUB
        self.is_master = settings.IS_MASTER
        self.hub_url = settings.HUB_URL

        # Fail-fast validation: if this node participates in distributed system,
        # ensure critical config is present
        if self.is_hub or self.hub_url:
            if not self.store_id:
                raise ImproperlyConfigured("STORE_ID must be set for hub or store nodes")
            if not self.region:
                raise ImproperlyConfigured("REGION must be set for hub or store nodes")
            if not settings.API_ENDPOINT:
                raise ImproperlyConfigured("API_ENDPOINT must be set for hub or store nodes")

    def __call__(self, request):
        # Attach cached node identity to request
        request.node_identity = {
            "store_id": self.store_id,
            "region": self.region,
            "is_hub": self.is_hub,
            "is_master": self.is_master,
            "hub_url": self.hub_url,
        }

        response = self.get_response(request)
        return response
