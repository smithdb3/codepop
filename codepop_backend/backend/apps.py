import os
from django.apps import AppConfig


class BackendConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'backend'

    def ready(self):
        """
        Fire register_with_hub task on app startup (not on beat schedule).

        The RUN_MAIN guard prevents double-firing in Django's dev server reloader.
        In production (gunicorn), ready() fires exactly once.
        """
        if not os.environ.get('RUN_MAIN'):
            try:
                from .tasks import register_with_hub
                register_with_hub.delay()
            except Exception:
                # Silently ignore if Celery is not yet initialized or DB is not ready
                pass
