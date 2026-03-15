import os
from django.apps import AppConfig


class BackendConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'backend'

    def ready(self):
        """
        Store nodes: fire register_with_hub once on startup (exponential backoff until hub is reachable).
        Hubs skip (no UPSTREAM_HUB_URL). RUN_MAIN guard prevents double-firing in dev reloader.
        """
        if os.environ.get('RUN_MAIN'):
            return
        try:
            from django.conf import settings
            if not getattr(settings, "UPSTREAM_HUB_URL", None):
                return  # Hub or local dev: no registration
            from .tasks import register_with_hub
            register_with_hub.delay()
        except Exception:
            pass  # Celery or DB not ready
