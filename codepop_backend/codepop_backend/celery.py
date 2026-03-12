"""
Celery App Configuration

Celery is configured to use Django settings and autodiscover tasks from all INSTALLED_APPS.
This module must be imported in codepop_backend/__init__.py to initialize Celery with Django.
"""

import os
from celery import Celery

# Set default Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "codepop_backend.settings")

# Create Celery app instance
app = Celery("codepop_backend")

# Load configuration from Django settings (all settings starting with CELERY_)
app.config_from_object("django.conf:settings", namespace="CELERY")

# Autodiscover tasks from all INSTALLED_APPS
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    """Simple debug task for testing Celery."""
    print(f"Request: {self.request!r}")
