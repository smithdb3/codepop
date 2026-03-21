import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'codepop_backend.settings')

app = Celery('codepop_backend')

# Read config from Django settings, using the CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps (finds backend/tasks.py)
app.autodiscover_tasks()

# Beat schedule — periodic tasks
app.conf.beat_schedule = {
    # Stores ping their hub every 30 seconds
    'store-heartbeat': {
        'task': 'backend.tasks.send_heartbeat',
        'schedule': 30.0,
    },
    # Retry pending profile updates every 60 seconds
    'retry-pending-updates': {
        'task': 'backend.tasks.process_pending_updates',
        'schedule': 60.0,
    },
    # Delete expired VisitingUserCache records every 15 minutes
    'cleanup-visiting-cache': {
        'task': 'backend.tasks.cleanup_expired_visiting_cache',
        'schedule': 900.0,
    },
    # Hub-only: mark stores unreachable after 3 missed heartbeats (every 60 seconds)
    'check-missed-heartbeats': {
        'task': 'backend.tasks.check_missed_heartbeats',
        'schedule': 60.0,
    },
}
