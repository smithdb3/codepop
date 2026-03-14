"""
Node Identity Middleware

Reads node identity from Django settings (hub mesh + regional stores)
and attaches it to every request so views can access node info without re-reading settings.
"""

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


class NodeIdentityMiddleware:
    """
    Middleware that attaches node identity to every request.

    Provides request.node_identity dict with:
    - store_id: This node's store ID (int)
    - store_name: Human-readable name (str)
    - region: This node's region (str)
    - api_endpoint: This node's base URL (str)
    - node_role: 'hub' or 'store' (str)
    - is_hub: True if node_role == 'hub' (bool)
    - upstream_hub_url: For stores, URL of regional hub; for hubs, empty (str)
    - hub_url: Same as upstream_hub_url (backward compat)

    Validates critical settings at startup when node participates in the distributed system.
    """

    def __init__(self, get_response):
        self.get_response = get_response

        # Cache coerced values for performance
        try:
            self.store_id = int(settings.STORE_ID) if str(settings.STORE_ID).strip() else 0
        except (TypeError, ValueError):
            self.store_id = 0
        self.store_name = settings.STORE_NAME or f"Store {self.store_id}"
        self.region = settings.REGION or ""
        self.api_endpoint = settings.API_ENDPOINT or ""
        self.node_role = getattr(settings, "NODE_ROLE", "store")
        self.is_hub = getattr(settings, "IS_HUB", self.node_role == "hub")
        self.upstream_hub_url = getattr(settings, "UPSTREAM_HUB_URL", "") or getattr(settings, "HUB_URL", "")
        self.hub_url = self.upstream_hub_url

        # Fail-fast validation when this node participates (hub or store with upstream)
        participates = self.is_hub or bool(self.upstream_hub_url)
        if participates:
            if str(settings.STORE_ID).strip() == "":
                raise ImproperlyConfigured("STORE_ID must be set for hub or store nodes")
            if not self.region:
                raise ImproperlyConfigured("REGION must be set for hub or store nodes")
            if not self.api_endpoint:
                raise ImproperlyConfigured("API_ENDPOINT must be set for hub or store nodes")

    def __call__(self, request):
        request.node_identity = {
            "store_id": self.store_id,
            "store_name": self.store_name,
            "region": self.region,
            "api_endpoint": self.api_endpoint,
            "node_role": self.node_role,
            "is_hub": self.is_hub,
            "upstream_hub_url": self.upstream_hub_url,
            "hub_url": self.hub_url,
        }
        response = self.get_response(request)
        return response
