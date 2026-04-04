import os
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def register_with_hub():
    """
    Attempt to register this store with its regional hub.
    Retries with exponential backoff (1s, 2s, 4s, 8s).
    Safe to call multiple times — hub uses update_or_create.
    Only meaningful on store nodes (IS_HUB=False).
    """
    hub_url = settings.HUB_URL
    if not hub_url:
        logger.warning('Cannot register: HUB_URL not configured for region %s', settings.REGION)
        return

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
                headers={
                    'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}',
                    'Content-Type': 'application/json',
                },
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
