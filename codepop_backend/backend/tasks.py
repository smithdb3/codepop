"""
Celery Tasks for Distributed System

Implements periodic tasks:
- heartbeat_task: Every 30 seconds, stores send heartbeat to their hub
- process_event_queue: Every 10 seconds, process queued inter-node events with exponential backoff
"""

import logging
import requests
from django.conf import settings
from django.utils import timezone
from celery import shared_task
from .models import EventQueue, StoreRegistry, SyncRecord

logger = logging.getLogger(__name__)


@shared_task
def register_with_hub():
    """
    Auto-register this node with its upstream hub.

    Fires immediately on first celery-beat startup (no history in DB),
    then every 5 minutes as a safety net for hub restarts.

    Skips if this is the master hub or if HUB_URL / API_ENDPOINT are not set.
    Registration is idempotent on the hub side (update_or_create).
    """
    if settings.IS_MASTER or not settings.HUB_URL or not settings.API_ENDPOINT:
        return

    hub_url = settings.HUB_URL.rstrip('/')
    endpoint = f"{hub_url}/backend/hub/register/"
    headers = {
        "Authorization": f"NodeToken {settings.INTER_NODE_SECRET}",
        "Content-Type": "application/json",
    }
    payload = {
        "store_id": int(settings.STORE_ID),
        "store_name": settings.STORE_NAME,
        "region": settings.REGION,
        "latitude": settings.LATITUDE,
        "longitude": settings.LONGITUDE,
        "api_endpoint": settings.API_ENDPOINT,
        "public_key": "",
    }

    try:
        response = requests.post(endpoint, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        logger.info(f"Registered with hub at {endpoint} (store_id={settings.STORE_ID})")
    except requests.RequestException as e:
        logger.warning(f"Hub registration failed: {e} — will retry in 5 minutes")


@shared_task(bind=True, max_retries=1)
def heartbeat_task(self):
    """
    Periodic task: Every 30 seconds, send heartbeat to upstream hub.

    - Stores heartbeat to their regional hub (HUB_URL)
    - Regional hubs heartbeat to the master hub (HUB_URL)
    - Master hub skips (nothing upstream to report to)
    - Skip if HUB_URL not configured (local dev mode)
    """
    if settings.IS_MASTER or not settings.HUB_URL:
        return

    try:
        hub_url = settings.HUB_URL.rstrip('/')
        endpoint = f"{hub_url}/backend/hub/heartbeat/"
        headers = {
            "Authorization": f"NodeToken {settings.INTER_NODE_SECRET}",
            "Content-Type": "application/json",
        }
        payload = {
            "store_id": int(settings.STORE_ID),
        }

        response = requests.post(endpoint, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        logger.info(f"Heartbeat sent successfully to {endpoint}")
    except requests.RequestException as e:
        logger.warning(f"Heartbeat failed: {e}")
        # Don't retry — fail silently and try again in 30 seconds


@shared_task(bind=True)
def process_event_queue(self):
    """
    Periodic task: Every 10 seconds, process pending events from EventQueue.

    For each pending event:
    1. Check if it's time to retry (exponential backoff: 1s, 2s, 4s, 8s)
    2. POST the event payload to the target_node
    3. On success: set status='sent'
    4. On failure: increment attempts, update last_attempt, set status='failed' after max retries
    """
    try:
        pending_events = EventQueue.objects.filter(status='pending', attempts__lt=4)

        for event in pending_events:
            # Check exponential backoff: if we've tried before, wait before retrying
            if event.last_attempt:
                retry_delay = 2 ** event.attempts  # 1s, 2s, 4s, 8s
                next_retry_time = event.last_attempt + timezone.timedelta(seconds=retry_delay)
                if timezone.now() < next_retry_time:
                    continue  # Not time to retry yet

            try:
                headers = {
                    "Authorization": f"NodeToken {settings.INTER_NODE_SECRET}",
                    "Content-Type": "application/json",
                }

                response = requests.post(
                    event.target_node,
                    json=event.payload,
                    headers=headers,
                    timeout=10
                )
                response.raise_for_status()

                # Success: mark event as sent
                event.status = 'sent'
                event.attempts += 1
                event.last_attempt = timezone.now()
                event.save()
                logger.info(f"Event {event.id} delivered to {event.target_node}")

            except requests.RequestException as e:
                # Failure: increment attempts, update last_attempt
                event.attempts += 1
                event.last_attempt = timezone.now()

                if event.attempts >= 4:
                    # Max retries exceeded: mark as failed and write audit record
                    event.status = 'failed'
                    logger.error(f"Event {event.id} failed after 4 attempts: {e}")
                    SyncRecord.objects.create(
                        sync_type="status_update",
                        source_store_id=0,
                        target_store_id=None,
                        status="failed",
                        completed_at=timezone.now(),
                        error_message=f"EventQueue {event.id} ({event.event_type}) → {event.target_node}: {e}",
                    )
                else:
                    # Will retry on next task execution
                    logger.warning(f"Event {event.id} failed (attempt {event.attempts}/4): {e}")

                event.save()

    except Exception as e:
        logger.error(f"Error processing event queue: {e}")


@shared_task
def check_dead_stores():
    """
    Hub-only periodic task: Mark stores as inactive if they haven't sent a heartbeat
    in the last 5 minutes. Runs every 2 minutes via Celery Beat.

    Two cases are handled:
    - Stores that sent a heartbeat at some point but it's now stale
    - Stores that registered but never sent any heartbeat
    """
    if not (settings.IS_HUB or settings.IS_MASTER):
        return

    threshold = timezone.now() - timezone.timedelta(minutes=5)

    # Stores with a stale heartbeat
    stale = StoreRegistry.objects.filter(
        is_active=True,
        last_heartbeat__lt=threshold,
    ).update(is_active=False)

    # Stores that registered but never heartbeated
    never_heartbeated = StoreRegistry.objects.filter(
        is_active=True,
        last_heartbeat__isnull=True,
        registered_at__lt=threshold,
    ).update(is_active=False)

    total = stale + never_heartbeated
    if total > 0:
        logger.warning(f"Dead store detection: marked {total} store(s) as inactive")
    else:
        logger.debug("Dead store detection: all stores healthy")
