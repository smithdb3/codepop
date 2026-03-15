"""
Clean distributed system Celery tasks.
- register_with_hub: on startup (stores only)
- heartbeat: every 30s (stores only)
- drain_event_queue: every 10s (all nodes)
- check_dead_nodes: every 2min (hubs only)
"""
import requests
import logging
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import StoreNode, EventQueue, SyncLog

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def register_with_hub(self):
    """
    Stores only: Register with regional hub on startup.
    Retries with exponential backoff until hub is reachable.
    Hubs skip this (no UPSTREAM_HUB_URL).
    """
    if not settings.UPSTREAM_HUB_URL:
        logger.info("Skipping hub registration (this node is a hub or standalone)")
        return

    hub_url = settings.UPSTREAM_HUB_URL
    endpoint = f"{hub_url}/backend/hub/register/"
    payload = {
        'store_id': settings.STORE_ID,
        'store_name': settings.STORE_NAME,
        'region': settings.REGION,
        'api_endpoint': settings.API_ENDPOINT,
    }
    headers = {
        'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}',
        'Content-Type': 'application/json',
        'X-Node-Role': 'store',
    }

    try:
        resp = requests.post(endpoint, json=payload, headers=headers, timeout=5)
        if resp.status_code == 201:
            logger.info(f"Successfully registered with hub {hub_url}")
            return
        else:
            logger.warning(f"Hub registration failed: {resp.status_code} {resp.text}")
    except Exception as e:
        logger.warning(f"Hub registration error: {str(e)}")

    # Exponential backoff: 2^n seconds, capped at 300s
    retry_count = self.request.retries
    countdown = min(2 ** retry_count, 300)
    logger.info(f"Retrying hub registration in {countdown}s (attempt {retry_count + 1})")
    raise self.retry(countdown=countdown, max_retries=None)


@shared_task(bind=True)
def heartbeat(self):
    """
    Stores only: Heartbeat to regional hub every 30s.
    Hubs skip this.
    """
    if not settings.UPSTREAM_HUB_URL:
        return

    hub_url = settings.UPSTREAM_HUB_URL
    endpoint = f"{hub_url}/backend/hub/heartbeat/"
    payload = {'store_id': settings.STORE_ID}
    headers = {
        'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}',
        'X-Node-Role': 'store',
    }

    try:
        resp = requests.post(endpoint, json=payload, headers=headers, timeout=5)
        if resp.status_code == 200:
            logger.debug(f"Heartbeat sent to hub {hub_url}")
        else:
            logger.warning(f"Heartbeat failed: {resp.status_code}")
    except Exception as e:
        logger.warning(f"Heartbeat error: {str(e)}")


@shared_task(bind=True)
def drain_event_queue(self):
    """
    All nodes: Process pending EventQueue items with exponential backoff.
    Skip locked items (concurrent processing safety).
    """
    from django.db import transaction
    from django.db.models import F

    pending = EventQueue.objects.filter(
        status='pending'
    ).select_for_update(skip_locked=True)[:10]

    if not pending:
        return

    for event in pending:
        try:
            event.status = 'processing'
            event.save()

            headers = {
                'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}',
                'X-Node-Role': 'hub' if settings.IS_HUB else 'store',
                'Content-Type': 'application/json',
            }

            resp = requests.post(
                event.target_url,
                json=event.payload,
                headers=headers,
                timeout=10
            )

            if 200 <= resp.status_code < 300:
                event.status = 'done'
                logger.debug(f"EventQueue {event.id} delivered to {event.target_url}")
                SyncLog.objects.create(
                    event_type=event.event_type,
                    source=f"store_{settings.STORE_ID}",
                    target=event.target_url,
                    status='success',
                )
            else:
                raise Exception(f"HTTP {resp.status_code}: {resp.text}")

        except Exception as e:
            event.attempts += 1
            if event.attempts >= 10:
                event.status = 'failed'
                logger.error(f"EventQueue {event.id} failed after 10 attempts: {str(e)}")
                SyncLog.objects.create(
                    event_type=event.event_type,
                    source=f"store_{settings.STORE_ID}",
                    target=event.target_url,
                    status='failed',
                    detail=str(e)[:500],
                )
            else:
                # Exponential backoff: 2^n seconds
                countdown = min(2 ** (event.attempts - 1), 300)
                event.next_attempt_at = timezone.now() + timedelta(seconds=countdown)
                event.status = 'pending'
                logger.warning(f"EventQueue {event.id} retry {event.attempts}/10 in {countdown}s")

        event.save()


@shared_task
def check_dead_nodes():
    """
    Hubs only: Mark StoreNode inactive if last_heartbeat > 5min or never heartbeated after 5+ min.
    Skips on non-hub nodes.
    """
    if not settings.IS_HUB:
        return

    threshold = timezone.now() - timedelta(minutes=5)

    # Mark stores as inactive if heartbeat is stale
    dead = StoreNode.objects.filter(
        is_active=True,
        last_heartbeat__lt=threshold
    )
    count = dead.update(is_active=False)
    if count > 0:
        logger.info(f"Marked {count} stores as inactive (no heartbeat in 5+ min)")

    # Mark stores registered >5 min ago but never heartbeated
    never_heartbeated = StoreNode.objects.filter(
        is_active=True,
        last_heartbeat__isnull=True,
        registered_at__lt=threshold
    )
    count2 = never_heartbeated.update(is_active=False)
    if count2 > 0:
        logger.info(f"Marked {count2} stores as inactive (never heartbeated after 5+ min)")
