import requests
import logging
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .node_utils import register_with_hub

logger = logging.getLogger(__name__)


def _node_headers():
    return {
        'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}',
        'Content-Type': 'application/json',
    }


@shared_task(name='backend.tasks.send_heartbeat', ignore_result=True)
def send_heartbeat():
    """
    Sends a heartbeat POST to this store's regional hub every 30 seconds.
    Scheduled via Celery Beat (see celery.py beat_schedule).

    Why: Hub uses heartbeats to track which stores are alive. After 3 missed
    heartbeats (90 seconds), hub marks the store 'unreachable' and mobile clients
    are redirected away from it.

    Only runs on STORE nodes (IS_HUB=False).
    """
    if settings.IS_HUB:
        return  # Hubs don't send heartbeats to themselves

    hub_url = settings.HUB_URL
    if not hub_url:
        logger.warning('send_heartbeat: no HUB_URL configured for region %s', settings.REGION)
        return

    try:
        resp = requests.post(
            f"{hub_url}/backend/api/hub/heartbeat/",
            json={'store_id': settings.STORE_ID, 'status': 'active'},
            headers=_node_headers(),
            timeout=5,
        )
        if resp.status_code == 200:
            return
        if resp.status_code == 404:
            logger.warning('Heartbeat got 404 — store not registered; triggering re-registration')
            register_with_hub()
        else:
            logger.warning('Heartbeat rejected by hub: %s', resp.text)
    except requests.RequestException as e:
        logger.error('Heartbeat failed (hub unreachable): %s', e)


@shared_task(name='backend.tasks.process_pending_updates', ignore_result=True)
def process_pending_updates():
    """
    Retries delivery of queued profile updates to offline home stores.
    Scheduled every 60 seconds via Celery Beat.

    Exponential backoff: delay doubles after each failed attempt (1s, 2s, 4s, 8s, ...)
    Maximum retry period: 24 hours from creation.
    After max period: mark failed, user should be notified via frontend polling.

    Why encrypted: PendingProfileUpdate stores user preference data encrypted at
    rest (AES-256 via Fernet). If the VM is compromised, queued data is unreadable.
    """
    from .models import PendingProfileUpdate

    now = timezone.now()
    pending = PendingProfileUpdate.objects.filter(
        status='pending',
        next_retry_at__lte=now,
    )

    for update in pending:
        # Check if max retry period has expired
        if now > update.max_retry_until:
            update.status = 'failed'
            update.last_error = 'Max retry period exceeded (24h)'
            update.save(update_fields=['status', 'last_error'])
            logger.warning('PendingProfileUpdate %s expired for user %s',
                           update.id, update.user_id)
            continue

        try:
            changes = PendingProfileUpdate.decrypt(update.changes_encrypted)
            resp = requests.post(
                f"{update.home_store_endpoint}/backend/api/inter-node/profile-update/",
                json={'user_id': update.user_id, 'changes': changes,
                      'timestamp': now.isoformat()},
                headers=_node_headers(),
                timeout=8,
            )
            if resp.status_code == 200:
                update.status = 'delivered'
                update.save(update_fields=['status'])
                logger.info('PendingProfileUpdate %s delivered successfully', update.id)
            else:
                _schedule_retry(update)
        except requests.RequestException as e:
            update.last_error = str(e)
            _schedule_retry(update)


def _schedule_retry(update):
    """Doubles the retry delay (exponential backoff, max 1 hour between retries)."""
    backoff_seconds = min(2 ** update.retry_count, 3600)
    update.retry_count += 1
    update.next_retry_at = timezone.now() + timedelta(seconds=backoff_seconds)
    update.save(update_fields=['retry_count', 'next_retry_at', 'last_error'])


@shared_task(name='backend.tasks.cleanup_expired_visiting_cache', ignore_result=True)
def cleanup_expired_visiting_cache():
    """
    Deletes VisitingUserCache rows that have passed their 24h TTL.
    Scheduled every 15 minutes via Celery Beat.

    Why: Automatic deletion is a privacy and security requirement.
    Visiting user data must not persist beyond 24 hours.
    Also deletes shadow auth.User rows (and their DRF Tokens via CASCADE).
    """
    from .models import VisitingUserCache
    from django.contrib.auth.models import User as DjangoUser

    expired = VisitingUserCache.objects.filter(expires_at__lte=timezone.now())
    for entry in expired:
        shadow_username = f"visiting_{entry.user_id}_{entry.home_store_id}"
        DjangoUser.objects.filter(username=shadow_username).delete()
    count, _ = expired.delete()
    if count:
        logger.info('Deleted %d expired VisitingUserCache records (and shadow users)', count)


@shared_task(name='backend.tasks.check_missed_heartbeats', ignore_result=True)
def check_missed_heartbeats():
    """
    Hub-only task: scans StoreRegistry for stores that have not sent a heartbeat
    in 90 seconds (3 missed heartbeats at 30-second intervals) and marks them
    'unreachable'. Scheduled every 60 seconds via Celery Beat.

    Only meaningful on hub nodes (IS_HUB=True).
    """
    if not settings.IS_HUB:
        return

    from .models import StoreRegistry

    cutoff = timezone.now() - timedelta(seconds=90)
    stale = StoreRegistry.objects.filter(
        status='active',
        last_heartbeat__lt=cutoff,
    )
    for store in stale:
        store.missed_heartbeats += 1
        if store.missed_heartbeats >= 3:
            store.status = 'unreachable'
        store.save(update_fields=['missed_heartbeats', 'status'])
        logger.warning('Store %s marked unreachable (no heartbeat since %s)',
                       store.store_id, store.last_heartbeat)
