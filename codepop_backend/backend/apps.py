import os
import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class BackendConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'backend'

    def ready(self):
        """
        Called once when Django starts. Triggers store registration with the hub.
        Skip during migrations (manage.py migrate) or when running management commands
        to avoid unnecessary network calls.
        """
        import sys
        # Don't register during migrations, shell, or other management commands
        if any(cmd in sys.argv for cmd in ['migrate', 'makemigrations', 'shell',
                                           'test', 'collectstatic']):
            return

        from django.conf import settings
        if not settings.IS_HUB:
            # Stores register with their hub; hubs don't self-register
            from .node_utils import register_with_hub
            register_with_hub()
