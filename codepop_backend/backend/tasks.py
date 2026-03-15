"""
Celery Tasks for Distributed System (hub mesh + regional stores)

- register_with_hub: Store registers with its upstream hub (once on startup via apps.py).
- heartbeat_task: Every 30s, stores send heartbeat to their upstream hub.
- process_event_queue: Every 10s, process queued inter-node events (user_sync, etc.) with backoff.
- check_dead_stores: Hub-only; every 2 min, mark stores with stale heartbeats as inactive.

No master hub: stores talk only to UPSTREAM_HUB_URL; hubs do not register or heartbeat elsewhere.
"""

import logging
import requests
from django.conf import settings
from django.utils import timezone
from celery import shared_task
from .models import EventQueue, StoreRegistry, SyncRecord, HubRegistry, NodeCertificate

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def register_with_hub(self):
    """
    Store registers with its upstream (regional) hub.

    Called once on app startup from apps.py (store nodes only) with exponential backoff
    until the hub is reachable. Hubs skip (no upstream).

    On success: saves node_secret to HubRegistry and NodeCertificate for heartbeat/auth.
    Skips if UPSTREAM_HUB_URL or API_ENDPOINT not set (hub node or local dev).
    """
    if not getattr(settings, "UPSTREAM_HUB_URL", None) or not settings.API_ENDPOINT:
        logger.info("Skipping registration: no UPSTREAM_HUB_URL or API_ENDPOINT (hub or local dev)")
        return

    hub_url = settings.UPSTREAM_HUB_URL.rstrip('/')
    endpoint = f"{hub_url}/backend/hub/register/"
    headers = {
        "Authorization": f"NodeToken {settings.INTER_NODE_SECRET}",
        "Content-Type": "application/json",
    }
    payload = {
        "store_id": int(settings.STORE_ID),
        "store_name": settings.STORE_NAME,
        "region": settings.REGION,
        "latitude": float(settings.LATITUDE) if settings.LATITUDE else 0.0,
        "longitude": float(settings.LONGITUDE) if settings.LONGITUDE else 0.0,
        "api_endpoint": settings.API_ENDPOINT,
        "public_key": "",
    }

    try:
        response = requests.post(endpoint, json=payload, headers=headers, timeout=10)
        response.raise_for_status()

        # Success: parse response and save issued secret
        data = response.json()
        node_secret = data.get("node_secret", "")

        if node_secret:
            # Save to HubRegistry so heartbeat/event tasks can use it
            HubRegistry.objects.update_or_create(
                hub_id=int(data.get("hub_id", 0)),
                defaults={
                    "hub_name": data.get("hub_name", ""),
                    "region": data.get("region", settings.REGION),
                    "api_endpoint": hub_url,
                    "is_active": True,
                    "issued_secret": node_secret,
                }
            )

            # Also update/create NodeCertificate for this node with the issued secret
            NodeCertificate.objects.update_or_create(
                node_id=f"store-{settings.STORE_ID}",
                defaults={
                    "node_type": "store",
                    "shared_secret": node_secret,
                    "expires_at": timezone.now() + timezone.timedelta(days=90),
                    "is_active": True,
                }
            )

        logger.info(f"Successfully registered with hub at {endpoint} (store_id={settings.STORE_ID})")

    except requests.RequestException as e:
        # Exponential backoff: 2^attempt seconds, capped at 5 minutes (300s)
        countdown = min(2 ** self.request.retries, 300)
        logger.warning(f"Hub registration failed (attempt {self.request.retries + 1}): {e} — retrying in {countdown}s")
        raise self.retry(countdown=countdown, max_retries=None)
    except Exception as e:
        logger.error(f"Unexpected error during hub registration: {e}")
        countdown = min(2 ** self.request.retries, 300)
        raise self.retry(countdown=countdown, max_retries=None)


@shared_task(bind=True, max_retries=1)
def heartbeat_task(self):
    """
    Periodic task: Every 30 seconds, store sends heartbeat to its upstream hub.

    Only store nodes have UPSTREAM_HUB_URL; hubs skip. Uses per-node secret from
    HubRegistry.issued_secret if available, else INTER_NODE_SECRET (bootstrap).
    """
    if not getattr(settings, "UPSTREAM_HUB_URL", None):
        return

    try:
        hub_url = settings.UPSTREAM_HUB_URL.rstrip('/')
        endpoint = f"{hub_url}/backend/hub/heartbeat/"

        # Try to use per-node secret from HubRegistry; fall back to global secret
        node_secret = settings.INTER_NODE_SECRET
        try:
            hub_reg = HubRegistry.objects.filter(is_active=True).first()
            if hub_reg and hub_reg.issued_secret:
                node_secret = hub_reg.issued_secret
        except Exception:
            pass

        headers = {
            "Authorization": f"NodeToken {node_secret}",
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
    1. Check if it's time to retry (exponential backoff, capped at 5 minutes)
    2. POST the event payload to the target_node
    3. On success: set status='sent'
    4. On failure: increment attempts, update last_attempt, set status='failed' after 10 attempts

    Max 10 attempts before permanent failure (vs 4 in old code).
    Backoff is capped at 5 minutes between retries.
    """
    try:
        pending_events = EventQueue.objects.filter(status='pending', attempts__lt=10)

        for event in pending_events:
            # Check exponential backoff: if we've tried before, wait before retrying
            if event.last_attempt:
                # Exponential: 2^0=1s, 2^1=2s, ..., capped at 300s (5 min)
                retry_delay = min(2 ** event.attempts, 300)
                next_retry_time = event.last_attempt + timezone.timedelta(seconds=retry_delay)
                if timezone.now() < next_retry_time:
                    continue  # Not time to retry yet

            try:
                # Use per-node secret if available, fall back to global
                node_secret = settings.INTER_NODE_SECRET
                try:
                    hub_reg = HubRegistry.objects.filter(is_active=True).first()
                    if hub_reg and hub_reg.issued_secret:
                        node_secret = hub_reg.issued_secret
                except Exception:
                    pass

                headers = {
                    "Authorization": f"NodeToken {node_secret}",
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

                if event.attempts >= 10:
                    # Max retries exceeded: mark as failed and write audit record
                    event.status = 'failed'
                    logger.error(f"Event {event.id} failed after 10 attempts: {e}")
                    SyncRecord.objects.create(
                        sync_type="status_update",
                        source_store_id=int(settings.STORE_ID),
                        target_store_id=None,
                        status="failed",
                        completed_at=timezone.now(),
                        error_message=f"EventQueue {event.id} ({event.event_type}) → {event.target_node}: {e}",
                    )
                else:
                    # Will retry on next task execution
                    logger.warning(f"Event {event.id} failed (attempt {event.attempts}/10): {e}")

                event.save()

    except Exception as e:
        logger.error(f"Error processing event queue: {e}")


@shared_task
def check_dead_stores():
    """
    Hub-only: mark stores in StoreRegistry as inactive if no heartbeat in 5 minutes.
    Runs every 2 minutes via Celery Beat. Store nodes skip (no StoreRegistry).
    """
    if not getattr(settings, "IS_HUB", False):
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
