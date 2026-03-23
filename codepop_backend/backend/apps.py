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
            self._register_with_hub()

    def _register_with_hub(self):
        import requests
        from django.conf import settings

        hub_url = settings.HUB_URL
        if not hub_url:
            logger.warning('Cannot register: HUB_URL not configured for region %s', settings.REGION)
            return

        # Store name: use custom STORE_NAME env var if provided, else auto-generate
        store_name = os.getenv('STORE_NAME') or f'CodePop {settings.REGION.title()} #{settings.STORE_ID}'

        payload = {
            'store_id':     settings.STORE_ID,
            'store_name':   store_name,
            'region':       settings.REGION,
            'api_endpoint': os.getenv('MY_API_ENDPOINT', ''),
            'latitude':     float(os.getenv('LATITUDE', 0)) if os.getenv('LATITUDE') else None,
            'longitude':    float(os.getenv('LONGITUDE', 0)) if os.getenv('LONGITUDE') else None,
        }

        for attempt, delay in enumerate([1, 2, 4, 8]):
            try:
                resp = requests.post(
                    f"{hub_url}/backend/api/hub/register/",
                    json=payload,
                    headers={'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}',
                             'Content-Type': 'application/json'},
                    timeout=5,
                )
                if resp.status_code == 200:
                    logger.info('Registered with hub at %s', hub_url)
                    return
                logger.warning('Hub registration returned %s', resp.status_code)
            except requests.RequestException as e:
                logger.warning('Hub registration attempt %d failed: %s', attempt + 1, e)
                import time; time.sleep(delay)

        logger.error('Could not register with hub after 4 attempts. '
                     'Store will operate in degraded mode (no cross-store user lookup).')
