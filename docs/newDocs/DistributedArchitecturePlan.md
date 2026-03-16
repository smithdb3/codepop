# CodePop Distributed System — Implementation Plan

## Purpose

This document is the complete, ordered implementation guide for transforming CodePop
from a single-store centralized application into a flat hub-mesh distributed system.
Any developer or AI agent should be able to follow this plan from start to finish.

## Architecture Summary (What We Are Building)

- **7 equal regional supply hubs** (flat mesh, no master) — Logan UT, Atlanta GA, Chicago IL,
  New Jersey NY, Dallas TX, Phoenix AZ, Seattle WA
- **~50 stores**, each running its own independent Django + PostgreSQL + Redis stack
- **Stores communicate P2P** for user data; hubs are user directories + supply coordinators
- **Hub discovery is hardcoded** — all hub endpoints stored in each node's `.env` file
- **Each user has one permanent home store** — visiting stores cache data for 24h then delete
- **Profile updates at visiting stores** propagate back to the home store immediately, with
  encrypted local queueing and exponential-backoff retry if home store is offline

## Current State (as of implementation start)

All Sprint 3 distributed work was reverted. The codebase is clean:
- Backend: 6 models (Preference, Drink, Inventory, Notification, Order, Revenue)
- No migrations (only `__init__.py` in migrations dir)
- No celery.py source file
- No tasks.py
- No inter-node or hub endpoints
- `settings.py` has `IS_MASTER` (to be removed) but no `INTER_NODE_SECRET`
- GitHub Actions deploys to: Logan Hub, Logan Store 1, Logan Store 2, Atlanta Hub,
  Atlanta Store 1, Atlanta Store 2
- Frontend: single hardcoded IP in `ip_address.js`, no multi-store, no distributed login

## Phases Overview

| Phase | What | Files |
|-------|------|-------|
| 1 | Configuration & Infrastructure | settings.py, .env.example, celery.py, docker-compose.yml, requirements.txt |
| 2 | Database Models | models.py, migrations |
| 3 | Inter-Node Authentication | permissions.py |
| 4 | Hub API Endpoints | hub_views.py, urls.py |
| 5 | Inter-Node API Endpoints | internode_views.py, urls.py |
| 6 | Distributed Login Flow | views.py |
| 7 | Profile Update Propagation | views.py |
| 8 | Celery Tasks | tasks.py |
| 9 | Startup Registration | apps.py |
| 10 | Revenue Aggregation | views.py, urls.py |
| 11 | Admin Registration | admin.py |
| 12 | Tests | tests.py |
| 13 | Frontend | AuthPage.js, PreferencesPage.js, StoreSelectionPage.js, App.js, ip_address.js |
| 14 | Deployment | .github/workflows/deploy.yml |

---

## Phase 1 — Configuration & Infrastructure

### Step 1.1 — Update `settings.py`

**File:** `codepop_backend/codepop_backend/settings.py`

**Why:** Remove the now-obsolete `IS_MASTER` concept (there is no master hub), add the
`INTER_NODE_SECRET` for node authentication, and add hub endpoint config. Stores only need
`HUB_URL` (their own hub); hubs additionally get `HUB_ENDPOINTS` (all hub addresses for the
hub-to-hub mesh). Each VM reads its own `.env` file, so no IPs are committed to source control.

**What to change:**

1. **Remove** the `IS_MASTER` line:
   ```python
   # DELETE this line:
   IS_MASTER = os.getenv('IS_MASTER', 'False') == 'True'
   ```

2. **Add** after the existing distributed config block:
   ```python
   # --- Distributed System Config ---
   STORE_ID     = os.getenv('STORE_ID', '0')
   REGION       = os.getenv('REGION', 'logan')
   IS_HUB       = os.getenv('IS_HUB', 'False') == 'True'
   NODE_TYPE    = 'hub' if IS_HUB else 'store'  # convenience property

   # Shared secret for all inter-node requests.
   # Each node has its own secret. In production, rotate this periodically.
   INTER_NODE_SECRET = os.getenv('INTER_NODE_SECRET', '')

   # URL of this node's own regional hub.
   # Stores use this for registration, heartbeat, and user-lookup.
   # Hubs set this to their own public address (used as self-reference).
   HUB_URL = os.getenv('HUB_URL', '')

   # Hub-to-hub mesh — only meaningful when IS_HUB=True.
   # Stores do NOT need these; they only ever talk to their own hub.
   # Values are read from .env so IPs never appear in source code.
   # Logan and Atlanta are active. Remaining 5 are provisioned later.
   HUB_ENDPOINTS = {
       'logan':      os.getenv('HUB_LOGAN_URL',      ''),  # Active
       'atlanta':    os.getenv('HUB_ATLANTA_URL',     ''),  # Active
       'chicago':    os.getenv('HUB_CHICAGO_URL',     ''),  # Provision later
       'newjersey':  os.getenv('HUB_NEWJERSEY_URL',   ''),  # Provision later
       'dallas':     os.getenv('HUB_DALLAS_URL',      ''),  # Provision later
       'phoenix':    os.getenv('HUB_PHOENIX_URL',     ''),  # Provision later
       'seattle':    os.getenv('HUB_SEATTLE_URL',     ''),  # Provision later
   }
   ```

3. **Add** rate limiting config (for Step 3.1):
   ```python
   # Rate limiting — inter-node endpoints only
   RATELIMIT_ENABLE = True
   RATELIMIT_USE_CACHE = 'default'
   ```

4. **Add** cache config (needed for rate limiting and VisitingUserCache TTL tracking):
   ```python
   CACHES = {
       'default': {
           'BACKEND': 'django.core.cache.backends.redis.RedisCache',
           'LOCATION': os.getenv('REDIS_URL', 'redis://redis:6379/0'),
       }
   }
   ```

5. **Add** Celery broker config (required — without this Celery cannot connect to Redis):
   ```python
   # Celery
   CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://redis:6379/0')
   CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://redis:6379/0')
   CELERY_ACCEPT_CONTENT = ['json']
   CELERY_TASK_SERIALIZER = 'json'
   ```

---

### Step 1.2 — Update `.env.example`

**File:** `codepop_backend/.env.example`

**Why:** Every developer and every new VM needs to know which env vars to configure.
This file is the canonical reference for what goes in each VM's `.env`.

**Replace the entire file with:**

```env
# ── Core Django ──────────────────────────────────────────
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=*

# ── Database (PostgreSQL) ─────────────────────────────────
DB_NAME=codepop
DB_USER=codepop_user
DB_PASSWORD=password
DB_HOST=db
DB_PORT=5432

# ── Redis (Celery broker + cache) ─────────────────────────
REDIS_URL=redis://redis:6379/0

# ── Stripe ───────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# ── Mapbox ───────────────────────────────────────────────
MAPBOX_ACCESS_TOKEN=your_mapbox_token_here

# ── Distributed System: Node Identity ────────────────────
# Unique ID for this store/hub node (integer)
STORE_ID=0

# Geographic region this node belongs to
# One of: logan, atlanta, chicago, newjersey, dallas, phoenix, seattle
REGION=logan

# Set True if this node is a regional supply hub (not a store)
IS_HUB=False

# Per-node shared secret for inter-node authentication.
# All requests to /api/hub/ and /api/inter-node/ must include:
#   Authorization: NodeToken <INTER_NODE_SECRET>
# CHANGE THIS before production. Each node should have a unique secret.
INTER_NODE_SECRET=change-this-secret-before-prod

# ── Distributed System: Own Hub ───────────────────────────
# URL of this node's own regional hub.
# Stores use this for registration, heartbeat, and user-lookup.
# Hubs set this to their own public address.
HUB_URL=http://<MY_REGION_HUB_IP>:8000

# ── Distributed System: Hub Mesh (HUB nodes only) ─────────
# Only configure these on hub VMs (IS_HUB=True).
# Stores should leave these blank — they only talk to their own hub.
HUB_LOGAN_URL=http://<LOGAN_HUB_IP>:8000
HUB_ATLANTA_URL=http://<ATLANTA_HUB_IP>:8000
HUB_CHICAGO_URL=
HUB_NEWJERSEY_URL=
HUB_DALLAS_URL=
HUB_PHOENIX_URL=
HUB_SEATTLE_URL=
```

**Important:** On each deployed VM, copy `.env.example` to `.env` and fill in:
- `HUB_URL` with this node's own regional hub IP (from GitHub secrets)
- **Hub VMs only:** also fill in `HUB_LOGAN_URL`, `HUB_ATLANTA_URL`, etc. for the hub mesh
- A strong random `INTER_NODE_SECRET` unique to that node
- The correct `STORE_ID`, `REGION`, and `IS_HUB` for that node

---

### Step 1.3 — Create `celery.py`

**File:** `codepop_backend/codepop_backend/celery.py`  *(create new file)*

**Why:** Celery is installed and configured in settings but the source file was deleted
during the reverts. This file bootstraps the Celery application that all tasks use.

```python
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
```

---

### Step 1.4 — Update `__init__.py` for Celery

**File:** `codepop_backend/codepop_backend/__init__.py`

**Why:** This ensures the Celery app is loaded when Django starts, which is required
for periodic tasks and the `@shared_task` decorator to work correctly.

**Replace entire file with:**

```python
from .celery import app as celery_app

__all__ = ('celery_app',)
```

---

### Step 1.5 — Update `docker-compose.yml`

**File:** `codepop_backend/docker-compose.yml`

**Why:** Celery tasks (heartbeat, profile update retry, cache cleanup) run in a separate
worker process. Without this service, no background tasks execute even if Celery is configured.
We also add `celery-beat` for the periodic task scheduler.

**Add two new services** after the `redis` service definition:

```yaml
  celery-worker:
    build: .
    command: celery -A codepop_backend worker --loglevel=info --concurrency=2
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - huggingface_cache:/app/.cache/huggingface
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  celery-beat:
    build: .
    command: celery -A codepop_backend beat --loglevel=info
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
    restart: always
```

Also add `django-celery-beat` to the `web` service's `depends_on` is not needed — but you
**must** run `python manage.py migrate` after adding `django_celery_beat` to INSTALLED_APPS
(Step 2 below handles this).

---

### Step 1.6 — Update `requirements.txt`

**File:** `codepop_backend/requirements.txt`

**Why:** We need two new packages:
- `django-ratelimit` — rate limiting for inter-node endpoints
- `django-celery-beat` — database-backed periodic task scheduler
- `cryptography` — AES-256 encryption for PendingProfileUpdate queue at rest

**Add these lines** to requirements.txt:

```
django-ratelimit==4.1.0
django-celery-beat==2.7.0
cryptography==43.0.3
```

---

### Step 1.7 — Update `INSTALLED_APPS` in `settings.py`

**File:** `codepop_backend/codepop_backend/settings.py`

**Add** `django_celery_beat` and `django_ratelimit` to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    # ... existing apps ...
    'django_celery_beat',
]
```

Note: `django_ratelimit` does NOT need to be in `INSTALLED_APPS` — it's used as
a decorator/middleware only.

---

## Phase 2 — Database Models

### Step 2.1 — Add New Models to `models.py`

**File:** `codepop_backend/backend/models.py`

**Why:** The distributed system requires new tables to:
1. Track which stores are registered at each hub (`StoreRegistry`)
2. Cache visiting users temporarily with TTL (`VisitingUserCache`)
3. Queue encrypted profile updates for offline home stores (`PendingProfileUpdate`)
4. Audit all inter-node data transfers (`SyncAuditLog`)
5. Handle supply requests from stores to hubs (`SupplyRequest`)
6. Model regional metadata (`Region`)
7. Model robotic machine state (`Machine`)
8. Model repair staff schedules (`Schedule`)
9. Extend User model for repair staff and logistics managers

**Add the following to the END of `models.py`:**

```python
# ─────────────────────────────────────────────
# DISTRIBUTED SYSTEM MODELS
# ─────────────────────────────────────────────

import uuid
from cryptography.fernet import Fernet


class Region(models.Model):
    """
    Represents one of the 7 regional supply hubs.
    Created by fixture/migration seed data; not user-created.
    """
    REGION_CHOICES = [
        ('logan',     'Logan, UT'),
        ('atlanta',   'Atlanta, GA'),
        ('chicago',   'Chicago, IL'),
        ('newjersey', 'New Jersey, NY'),
        ('dallas',    'Dallas, TX'),
        ('phoenix',   'Phoenix, AZ'),
        ('seattle',   'Seattle, WA'),
    ]
    name         = models.CharField(max_length=50, choices=REGION_CHOICES, unique=True)
    display_name = models.CharField(max_length=100)
    hub_api_endpoint = models.URLField(blank=True)  # e.g. http://10.0.0.1:8000

    def __str__(self):
        return self.display_name


class StoreRegistry(models.Model):
    """
    Used by hubs (IS_HUB=True) to track all registered stores in their region.
    Stores register on startup via POST /api/hub/register/.
    Status is updated by heartbeat and timeout logic.
    """
    STATUS_CHOICES = [
        ('active',       'Active'),
        ('unreachable',  'Unreachable'),  # missed 3 heartbeats
        ('deregistered', 'Deregistered'),
    ]
    store_id     = models.IntegerField(unique=True)
    store_name   = models.CharField(max_length=255)
    region       = models.CharField(max_length=50)
    api_endpoint = models.URLField()           # e.g. http://10.0.0.2:8000
    latitude     = models.FloatField(null=True, blank=True)
    longitude    = models.FloatField(null=True, blank=True)
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    registered_at    = models.DateTimeField(auto_now_add=True)
    last_heartbeat   = models.DateTimeField(null=True, blank=True)
    missed_heartbeats = models.IntegerField(default=0)

    def __str__(self):
        return f"Store {self.store_id} ({self.store_name}) — {self.status}"


class VisitingUserCache(models.Model):
    """
    Stores a temporary copy of a user's profile when they visit this store.
    This is SEPARATE from auth.User — it is a cache only, NOT the source of truth.

    Why separate table:
    - Prevents home users and visiting users from ever being mixed in a query
    - Cache can be bulk-deleted by expiry without touching real user accounts
    - Clear audit boundary: visiting users can only do what their cache allows

    TTL: 24 hours from cached_at. Celery cleanup task deletes expired rows.
    On next login after expiry, store re-fetches from home store.
    """
    user_id       = models.IntegerField()          # ID from home store
    username      = models.CharField(max_length=150)
    email         = models.EmailField()
    hashed_password = models.CharField(max_length=255)  # PBKDF2 hash only, NEVER plaintext
    role          = models.CharField(max_length=50, default='customer')
    home_store_id = models.IntegerField()          # Which store owns this user
    home_store_endpoint = models.URLField()        # Where to send profile updates

    # Preferences and favorites stored as JSON for portability
    preferences   = models.JSONField(default=list)     # e.g. ["Fruity", "Sweet"]
    favorite_drink_ids = models.JSONField(default=list) # e.g. [42, 87, 105]

    cached_at     = models.DateTimeField(auto_now_add=True)
    expires_at    = models.DateTimeField()  # cached_at + 24h; set on create

    class Meta:
        unique_together = ('user_id', 'home_store_id')
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['expires_at']),  # for cleanup task
        ]

    def __str__(self):
        return f"VisitingUser {self.username} (home: store {self.home_store_id}, expires: {self.expires_at})"

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() >= self.expires_at


class PendingProfileUpdate(models.Model):
    """
    Queue for profile updates that could not be delivered to the home store
    because it was unreachable at the time of the update.

    Security: `changes_encrypted` stores AES-256 encrypted JSON. Never store
    plaintext user data here — if the VM is compromised, this data must be
    unreadable without the encryption key.

    Retry logic: Celery `process_pending_updates` task retries with exponential
    backoff (1s, 2s, 4s, 8s, ...). Max retry period is 24 hours from created_at.
    After that, the record is marked `failed` and the user is notified.

    Encryption key: Stored in INTER_NODE_SECRET (derived, not raw). In production,
    use a dedicated ENCRYPTION_KEY env var.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed — max retries exceeded'),
    ]
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id          = models.IntegerField()
    home_store_id    = models.IntegerField()
    home_store_endpoint = models.URLField()
    changes_encrypted = models.TextField()  # AES-256 encrypted JSON blob
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at       = models.DateTimeField(auto_now_add=True)
    retry_count      = models.IntegerField(default=0)
    next_retry_at    = models.DateTimeField()    # when to attempt next delivery
    max_retry_until  = models.DateTimeField()    # created_at + 24h; give up after this
    last_error       = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'next_retry_at']),
        ]

    def __str__(self):
        return f"PendingUpdate {self.id} for user {self.user_id} → store {self.home_store_id} ({self.status})"

    @staticmethod
    def encrypt(data_dict: dict) -> str:
        """Encrypt a dict to a base64 Fernet token."""
        from django.conf import settings
        import json, base64, hashlib
        key_bytes = hashlib.sha256(settings.INTER_NODE_SECRET.encode()).digest()
        f = Fernet(base64.urlsafe_b64encode(key_bytes))
        return f.encrypt(json.dumps(data_dict).encode()).decode()

    @staticmethod
    def decrypt(token: str) -> dict:
        """Decrypt a Fernet token back to a dict."""
        from django.conf import settings
        import json, base64, hashlib
        key_bytes = hashlib.sha256(settings.INTER_NODE_SECRET.encode()).digest()
        f = Fernet(base64.urlsafe_b64encode(key_bytes))
        return json.loads(f.decrypt(token.encode()).decode())


class SyncAuditLog(models.Model):
    """
    Immutable audit log of every inter-node data transfer.
    Retained for 30 days minimum. Used for security forensics.

    Written by:
    - hub_views.py when a hub receives a user-lookup or broadcast
    - internode_views.py when a store processes user-sync or profile-update
    """
    EVENT_CHOICES = [
        ('user_lookup',       'User Lookup (store → hub)'),
        ('hub_broadcast',     'Hub Broadcast (hub → hubs)'),
        ('user_sync',         'User Sync (visiting store ← home store)'),
        ('profile_update',    'Profile Update (visiting store → home store)'),
        ('store_register',    'Store Registration'),
        ('heartbeat',         'Heartbeat'),
    ]
    timestamp         = models.DateTimeField(auto_now_add=True)
    event_type        = models.CharField(max_length=30, choices=EVENT_CHOICES)
    requesting_node   = models.CharField(max_length=255)  # IP or node ID of requester
    target_node       = models.CharField(max_length=255)  # IP or endpoint of target
    user_email        = models.EmailField(blank=True)      # user involved (if any)
    data_types        = models.CharField(max_length=255)   # comma-separated: "email,preferences,role"
    success           = models.BooleanField()
    error_message     = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['event_type']),
        ]

    def __str__(self):
        status = '✓' if self.success else '✗'
        return f"[{status}] {self.event_type} by {self.requesting_node} at {self.timestamp}"


class SupplyRequest(models.Model):
    """
    A restocking request from a store to its regional hub.
    Submitted via POST /api/hub/supply-request/ (not yet implemented — Phase 10 extension).
    """
    STATUS_CHOICES = [
        ('pending',   'Pending'),
        ('approved',  'Approved'),
        ('denied',    'Denied'),
        ('fulfilled', 'Fulfilled'),
    ]
    store_id     = models.IntegerField()
    region       = models.CharField(max_length=50)
    item_name    = models.CharField(max_length=100)
    quantity     = models.PositiveIntegerField()
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)
    notes        = models.TextField(blank=True)

    def __str__(self):
        return f"SupplyRequest store {self.store_id}: {self.quantity}x {self.item_name} ({self.status})"


class Machine(models.Model):
    """
    Represents one robotic drink-dispensing machine at a store.
    Status follows a defined state machine (see Architecture docs).
    Machine status is LOCAL — it does not replicate to other stores.
    Repair staff and hub dashboards query this directly.
    """
    STATUS_CHOICES = [
        ('NORMAL',           'Normal'),
        ('WARNING',          'Warning'),
        ('ERROR',            'Error'),
        ('OUT_OF_ORDER',     'Out of Order'),
        ('SCHEDULE_SERVICE', 'Service Scheduled'),
        ('REPAIR_START',     'Repair In Progress'),
        ('REPAIR_END',       'Repair Complete — Testing'),
    ]
    machine_id   = models.CharField(max_length=50, unique=True)
    name         = models.CharField(max_length=100)
    location     = models.CharField(max_length=100, blank=True)  # e.g. "Bay 3"
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NORMAL')
    last_status_change = models.DateTimeField(auto_now=True)
    notes        = models.TextField(blank=True)

    def __str__(self):
        return f"Machine {self.machine_id} ({self.name}) — {self.status}"


class Schedule(models.Model):
    """
    Repair staff schedule. Supports CSV upload by logistics managers.
    Tied to Machine and auth.User (repair staff member).
    """
    machine      = models.ForeignKey(Machine, on_delete=models.CASCADE, related_name='schedules')
    assigned_to  = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    scheduled_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    description  = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Schedule for {self.machine} at {self.scheduled_at}"


class RepairStaffProfile(models.Model):
    """
    Extends auth.User for repair staff members.
    One-to-one with User. Created when admin assigns role='repair_staff'.
    """
    user             = models.OneToOneField('auth.User', on_delete=models.CASCADE,
                                            related_name='repair_profile')
    region           = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True)
    assigned_store_id = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"RepairStaff: {self.user.username} (region: {self.region})"


class LogisticsManagerProfile(models.Model):
    """
    Extends auth.User for logistics managers.
    One-to-one with User. Created when admin assigns role='logistics_manager'.
    Logistics managers can view regional revenue, approve supply requests,
    and manage repair schedules for their region.
    """
    user   = models.OneToOneField('auth.User', on_delete=models.CASCADE,
                                  related_name='logistics_profile')
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"LogisticsManager: {self.user.username} (region: {self.region})"
```

---

### Step 2.2 — Create and Run Migrations

**Why:** Django needs migration files to know what SQL to run against the database.

**Commands (run inside the Docker web container or locally with venv active):**

```bash
# Generate migrations from the new models
docker compose run --rm web python manage.py makemigrations

# Apply migrations (also creates django_celery_beat tables from Step 1.7)
docker compose run --rm web python manage.py migrate
```

**Expected output:** A new file `backend/migrations/0001_initial.py` (or the next number
if prior migrations exist). Verify it includes all 10 new model tables.

**Troubleshoot:** If `makemigrations` says "No changes detected", confirm that the
`backend` app is in `INSTALLED_APPS` and that the new model code has no syntax errors.

---

## Phase 3 — Inter-Node Authentication

### Step 3.1 — Create `permissions.py`

**File:** `codepop_backend/backend/permissions.py`  *(create new file)*

**Why:** Every endpoint under `/api/hub/` and `/api/inter-node/` must reject requests
without a valid `Authorization: NodeToken <secret>` header. This DRF permission class
handles that check. Using a DRF permission (not middleware) means it integrates cleanly
with the existing DRF auth system and can be tested with APIClient.

```python
from rest_framework.permissions import BasePermission
from django.conf import settings


class IsNodeAuthenticated(BasePermission):
    """
    Allows access only to inter-node requests that include the correct
    Authorization header: "NodeToken <INTER_NODE_SECRET>"

    This is the Sprint 3 shared-secret approach. The JWT RS256 upgrade
    path is documented in the architecture LLD.

    Usage:
        class MyHubView(APIView):
            permission_classes = [IsNodeAuthenticated]
    """
    message = 'Inter-node authentication required. Include Authorization: NodeToken <secret>'

    def has_permission(self, request, view):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('NodeToken '):
            return False
        provided_token = auth_header[len('NodeToken '):]
        expected_token = settings.INTER_NODE_SECRET
        if not expected_token:
            # Fail closed: if INTER_NODE_SECRET is not configured, deny all
            return False
        return provided_token == expected_token


class IsSuperUser(BasePermission):
    """
    Allows access only to authenticated Django superusers (is_superuser=True).
    Used by NationalRevenueView.
    """
    message = 'Superuser access required.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)
```

Also update the import in `hub_views.py` (Step 4.1) to include `IsSuperUser`:
```python
from .permissions import IsNodeAuthenticated, IsSuperUser
```

---

## Phase 4 — Hub API Endpoints

These endpoints are only meaningful when `IS_HUB=True` in the node's environment.
Store nodes should never need to call these on themselves — they call them on the hub
at `settings.HUB_URL`.

### Step 4.1 — Create `hub_views.py`

**File:** `codepop_backend/backend/hub_views.py`  *(create new file)*

**Why each endpoint exists:**

| Endpoint | Called by | Purpose |
|----------|-----------|---------|
| `POST /api/hub/register/` | Store on startup | Hub learns about the store |
| `POST /api/hub/heartbeat/` | Store every 30s | Hub knows store is alive |
| `POST /api/hub/user-lookup/` | Store needing to find a visiting user's home store | Hub checks regional directory; broadcasts if not found |
| `POST /api/hub/user-broadcast/` | Another hub (cross-region broadcast) | This hub checks if user is in its region |
| `GET /api/hub/store-registry/` | Any node | Returns list of active stores in this hub's region |
| `GET /api/hub/revenue/` | Super admin national aggregation | This hub queries all stores in region and sums revenue |

```python
import requests
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import StoreRegistry, SyncAuditLog, VisitingUserCache
from .permissions import IsNodeAuthenticated


# ── Helpers ──────────────────────────────────────────────────────────────────

def _node_token_headers():
    """Returns the Authorization header dict for outbound inter-node requests."""
    return {
        'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}',
        'Content-Type': 'application/json',
    }


def _log(event_type, requesting_node, target_node, success,
         user_email='', data_types='', error=''):
    """Write one row to SyncAuditLog."""
    SyncAuditLog.objects.create(
        event_type=event_type,
        requesting_node=requesting_node,
        target_node=target_node,
        user_email=user_email,
        data_types=data_types,
        success=success,
        error_message=error,
    )


# ── Views ─────────────────────────────────────────────────────────────────────

class HubRegisterView(APIView):
    """
    POST /api/hub/register/
    Called by stores on startup to register themselves with their regional hub.

    Request body:
    {
        "store_id": 42,
        "store_name": "CodePop Logan #1",
        "region": "logan",
        "latitude": 41.7421,
        "longitude": -111.8070,
        "api_endpoint": "http://10.0.0.2:8000"
    }

    Response 200: {"status": "registered", "active_stores": [...]}
    Response 400: {"error": "..."}
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        data = request.data
        required = ['store_id', 'store_name', 'region', 'api_endpoint']
        for field in required:
            if not data.get(field):
                return Response({'error': f'Missing field: {field}'},
                                status=status.HTTP_400_BAD_REQUEST)

        StoreRegistry.objects.update_or_create(
            store_id=data['store_id'],
            defaults={
                'store_name':   data['store_name'],
                'region':       data['region'],
                'api_endpoint': data['api_endpoint'],
                'latitude':     data.get('latitude'),
                'longitude':    data.get('longitude'),
                'status':       'active',
                'last_heartbeat': timezone.now(),
                'missed_heartbeats': 0,
            }
        )

        _log('store_register',
             requesting_node=data['api_endpoint'],
             target_node='this-hub',
             success=True,
             data_types='registration')

        active_stores = list(
            StoreRegistry.objects.filter(status='active')
            .values('store_id', 'store_name', 'api_endpoint', 'latitude', 'longitude')
        )
        return Response({'status': 'registered', 'active_stores': active_stores})


class HubHeartbeatView(APIView):
    """
    POST /api/hub/heartbeat/
    Called by stores every 30 seconds (via Celery beat task).

    Request body: {"store_id": 42, "status": "active"}
    Response 200: {"status": "ok"}
    Response 404: store not registered
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        store_id = request.data.get('store_id')
        try:
            store = StoreRegistry.objects.get(store_id=store_id)
        except StoreRegistry.DoesNotExist:
            return Response({'error': 'Store not registered'},
                            status=status.HTTP_404_NOT_FOUND)

        store.last_heartbeat = timezone.now()
        store.missed_heartbeats = 0
        store.status = 'active'
        store.save(update_fields=['last_heartbeat', 'missed_heartbeats', 'status'])
        return Response({'status': 'ok'})


class HubUserLookupView(APIView):
    """
    POST /api/hub/user-lookup/
    Called by a store in this hub's region when it needs to find a user's home store.

    Flow:
    1. Check if any store in THIS region has a VisitingUserCache for this email
       (shortcut: user may have previously visited a store in this region)
    2. Check StoreRegistry — ask each active store directly if it has this user
       (home user check: query each store's /api/inter-node/user-lookup/ endpoint)
    3. If not found locally, broadcast to all OTHER hubs (cross-region)

    NOTE: This is intentionally synchronous for simplicity. In a high-traffic
    production system, use async fan-out. For this project's scale it is fine.

    Request body: {"email": "user@example.com", "requesting_store_id": 42}
    Response 200: {"status": "found", "home_store_id": 5, "home_store_endpoint": "..."}
    Response 404: {"status": "not_found"}
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        email = request.data.get('email')
        requesting_store_id = request.data.get('requesting_store_id')

        if not email:
            return Response({'error': 'email required'}, status=status.HTTP_400_BAD_REQUEST)

        # Step 1: Check stores in this region
        active_stores = StoreRegistry.objects.filter(status='active')
        for store in active_stores:
            try:
                resp = requests.post(
                    f"{store.api_endpoint}/api/inter-node/user-exists/",
                    json={'email': email},
                    headers=_node_token_headers(),
                    timeout=3,
                )
                if resp.status_code == 200 and resp.json().get('exists'):
                    _log('user_lookup', f'store-{requesting_store_id}',
                         store.api_endpoint, True, user_email=email,
                         data_types='home_store_endpoint')
                    return Response({
                        'status': 'found',
                        'home_store_id': store.store_id,
                        'home_store_endpoint': store.api_endpoint,
                    })
            except requests.RequestException:
                continue  # store unreachable; try next

        # Step 2: Broadcast to all other hubs
        for region_name, hub_url in settings.HUB_ENDPOINTS.items():
            if not hub_url or region_name == settings.REGION:
                continue  # skip self and unconfigured hubs
            try:
                resp = requests.post(
                    f"{hub_url}/api/hub/user-broadcast/",
                    json={'email': email, 'requesting_region': settings.REGION},
                    headers=_node_token_headers(),
                    timeout=5,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get('status') == 'found':
                        _log('hub_broadcast', settings.REGION, hub_url,
                             True, user_email=email, data_types='home_store_endpoint')
                        return Response(data)
            except requests.RequestException:
                continue  # hub unreachable; try next

        _log('user_lookup', f'store-{requesting_store_id}', 'broadcast-all',
             False, user_email=email, error='not found in any region')
        return Response({'status': 'not_found'}, status=status.HTTP_404_NOT_FOUND)


class HubUserBroadcastView(APIView):
    """
    POST /api/hub/user-broadcast/
    Called by ANOTHER hub when it needs to find a user cross-region.
    This hub checks its own stores for the user.

    Request body: {"email": "user@example.com", "requesting_region": "newjersey"}
    Response 200: {"status": "found", "home_store_id": 5, "home_store_endpoint": "..."}
    Response 404: {"status": "not_found"}
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'email required'}, status=status.HTTP_400_BAD_REQUEST)

        active_stores = StoreRegistry.objects.filter(status='active')
        for store in active_stores:
            try:
                resp = requests.post(
                    f"{store.api_endpoint}/api/inter-node/user-exists/",
                    json={'email': email},
                    headers=_node_token_headers(),
                    timeout=3,
                )
                if resp.status_code == 200 and resp.json().get('exists'):
                    return Response({
                        'status': 'found',
                        'home_store_id': store.store_id,
                        'home_store_endpoint': store.api_endpoint,
                    })
            except requests.RequestException:
                continue

        return Response({'status': 'not_found'}, status=status.HTTP_404_NOT_FOUND)


class HubStoreRegistryView(APIView):
    """
    GET /api/hub/store-registry/
    Returns the list of active stores this hub knows about.
    Used by stores that need to discover peers after a cache miss.

    No auth required — store addresses are not sensitive, and the frontend
    needs to call this before it has an inter-node token.
    """
    permission_classes = []  # open endpoint

    def get(self, request):
        stores = StoreRegistry.objects.filter(status='active').values(
            'store_id', 'store_name', 'region', 'api_endpoint',
            'latitude', 'longitude', 'last_heartbeat'
        )
        return Response({'stores': list(stores)})


class HubRevenueView(APIView):
    """
    GET /api/hub/revenue/
    Called by the super admin national revenue aggregation.
    This hub queries each active store for its revenue total and returns a sum.

    Returns: {"hub_region": "logan", "total_revenue": 1234.56, "store_count": 3}
    """
    permission_classes = [IsNodeAuthenticated]

    def get(self, request):
        from .models import Revenue  # avoid circular import
        active_stores = StoreRegistry.objects.filter(status='active')
        total = 0.0
        queried = 0
        for store in active_stores:
            try:
                resp = requests.get(
                    f"{store.api_endpoint}/backend/revenues/",
                    headers=_node_token_headers(),
                    timeout=5,
                )
                if resp.status_code == 200:
                    records = resp.json()
                    for r in records:
                        total += float(r.get('TotalAmount', 0))
                    queried += 1
            except requests.RequestException:
                continue
        return Response({
            'hub_region': settings.REGION,
            'total_revenue': round(total, 2),
            'store_count': queried,
        })
```

---

### Step 4.2 — Wire Hub URLs

**File:** `codepop_backend/backend/urls.py`

**Add** these URL patterns alongside the existing patterns:

```python
from .hub_views import (
    HubRegisterView, HubHeartbeatView, HubUserLookupView,
    HubUserBroadcastView, HubStoreRegistryView, HubRevenueView
)

# Hub endpoints (only meaningful when IS_HUB=True, but available on all nodes)
urlpatterns += [
    path('api/hub/register/',       HubRegisterView.as_view()),
    path('api/hub/heartbeat/',      HubHeartbeatView.as_view()),
    path('api/hub/user-lookup/',    HubUserLookupView.as_view()),
    path('api/hub/user-broadcast/', HubUserBroadcastView.as_view()),
    path('api/hub/store-registry/', HubStoreRegistryView.as_view()),
    path('api/hub/revenue/',        HubRevenueView.as_view()),
]
```

---

## Phase 5 — Inter-Node Store Endpoints

These endpoints live on STORE nodes (IS_HUB=False). Hubs call them during broadcasts;
visiting stores call them on the home store.

### Step 5.1 — Create `internode_views.py`

**File:** `codepop_backend/backend/internode_views.py`  *(create new file)*

```python
import os
import requests
from django.contrib.auth.models import User
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import VisitingUserCache, PendingProfileUpdate, SyncAuditLog, Preference
from .permissions import IsNodeAuthenticated


# Safe fields to include in inter-node user transfers.
# NEVER add: password (raw), stripe_customer_id, payment_method, card details.
ALLOWED_USER_FIELDS = ['id', 'username', 'email', 'password', 'first_name', 'last_name']
ALLOWED_USER_DATA_TYPES = 'username,email,hashed_password,preferences,favorite_drinks,role'


def _log(event_type, requesting_node, target_node, success,
         user_email='', data_types='', error=''):
    SyncAuditLog.objects.create(
        event_type=event_type,
        requesting_node=requesting_node,
        target_node=target_node,
        user_email=user_email,
        data_types=data_types,
        success=success,
        error_message=error,
    )


def _build_user_payload(user: User) -> dict:
    """
    Constructs the safe, minimal user payload for inter-node transfer.
    Uses Django's internal hashed password (PBKDF2) — never raw password.
    """
    prefs = list(Preference.objects.filter(UserID=user).values_list('Preference', flat=True))
    favs  = list(user.drink_set.filter(Favorite=user).values_list('DrinkID', flat=True))
    role = 'admin' if user.is_superuser else ('manager' if user.is_staff else 'customer')
    return {
        'user_id':         user.pk,
        'username':        user.username,
        'email':           user.email,
        'hashed_password': user.password,  # Django PBKDF2 hash — safe to transfer
        'first_name':      user.first_name,
        'last_name':       user.last_name,
        'preferences':     prefs,
        'favorite_drink_ids': favs,
        'role':            role,
        'home_store_id':   int(settings.STORE_ID),
        'home_store_endpoint': os.getenv('MY_API_ENDPOINT', ''),  # this store's own direct URL
    }


class InterNodeUserExistsView(APIView):
    """
    POST /api/inter-node/user-exists/
    Called by hubs (during HubUserLookupView) to ask: "Does this user live here?"
    Returns only a boolean — no user data transferred.

    Request: {"email": "user@example.com"}
    Response: {"exists": true/false}
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        email = request.data.get('email')
        exists = User.objects.filter(email=email).exists()
        return Response({'exists': exists})


class InterNodeUserSyncView(APIView):
    """
    POST /api/inter-node/user-sync/
    Called by a visiting store directly on the home store (P2P) after the hub
    told it where the user lives.

    The home store returns the safe user payload. The visiting store will
    cache this in VisitingUserCache.

    Request: {"email": "user@example.com", "requesting_store_id": 42}
    Response 200: {user_id, username, email, hashed_password, preferences, ...}
    Response 404: user not found
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        email = request.data.get('email')
        requesting_store_id = request.data.get('requesting_store_id', 'unknown')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            _log('user_sync', f'store-{requesting_store_id}', f'store-{settings.STORE_ID}',
                 False, user_email=email, error='user not found on this node')
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        payload = _build_user_payload(user)
        _log('user_sync', f'store-{requesting_store_id}', f'store-{settings.STORE_ID}',
             True, user_email=email, data_types=ALLOWED_USER_DATA_TYPES)
        return Response(payload)


class InterNodeProfileUpdateView(APIView):
    """
    POST /api/inter-node/profile-update/
    Called by a visiting store when a visiting user updates their profile.
    This store is the home store — it applies the change and returns confirmed data.

    Request:
    {
        "user_id": 5,
        "changes": {
            "preferences": ["Fruity", "Sweet"],
            "favorite_drink_ids": [42, 87, 110]
        },
        "timestamp": "2026-03-15T10:30:00Z"
    }

    Response 200: confirmed user payload (same format as user-sync)
    Response 404: user not found
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        user_id   = request.data.get('user_id')
        changes   = request.data.get('changes', {})
        requesting = request.META.get('HTTP_X_STORE_ID', 'unknown')

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Apply preference changes
        if 'preferences' in changes:
            Preference.objects.filter(UserID=user).delete()
            for pref in changes['preferences']:
                Preference.objects.create(UserID=user, Preference=pref)

        # Apply favorite drink changes
        if 'favorite_drink_ids' in changes:
            from .models import Drink
            user_drinks = Drink.objects.filter(Favorite=user)
            for d in user_drinks:
                d.Favorite.remove(user)
            for drink_id in changes['favorite_drink_ids']:
                try:
                    drink = Drink.objects.get(pk=drink_id)
                    drink.Favorite.add(user)
                except Drink.DoesNotExist:
                    pass  # drink not on this store; skip

        _log('profile_update', f'store-{requesting}', f'store-{settings.STORE_ID}',
             True, user_email=user.email, data_types='preferences,favorite_drinks')
        return Response(_build_user_payload(user))


class InterNodeHealthCheckView(APIView):
    """
    POST /api/inter-node/health-check/
    Simple availability check. Returns 200 if this node is alive and can talk back.
    Used before attempting a user-sync to confirm home store is reachable.

    Response: {"status": "ok", "store_id": 42, "region": "logan"}
    """
    permission_classes = [IsNodeAuthenticated]

    def post(self, request):
        return Response({
            'status':   'ok',
            'store_id': settings.STORE_ID,
            'region':   settings.REGION,
        })
```

---

### Step 5.2 — Wire Inter-Node URLs

**File:** `codepop_backend/backend/urls.py`

**Add** alongside existing patterns:

```python
from .internode_views import (
    InterNodeUserExistsView, InterNodeUserSyncView,
    InterNodeProfileUpdateView, InterNodeHealthCheckView
)

urlpatterns += [
    path('api/inter-node/user-exists/',       InterNodeUserExistsView.as_view()),
    path('api/inter-node/user-sync/',         InterNodeUserSyncView.as_view()),
    path('api/inter-node/profile-update/',    InterNodeProfileUpdateView.as_view()),
    path('api/inter-node/health-check/',      InterNodeHealthCheckView.as_view()),
]
```

---

## Phase 6 — Distributed Login Flow

### Step 6.1 — Update `CustomAuthToken` in `views.py`

**File:** `codepop_backend/backend/views.py`

**Why:** The existing login view only checks the local `auth.User` table. We need it to
also check `VisitingUserCache` and, on a complete miss, trigger the hub lookup + P2P
fetch flow to retrieve the user from their home store.

**Replace** the existing `CustomAuthToken` class with:

```python
import requests
from django.utils import timezone
from datetime import timedelta
from django.conf import settings


class CustomAuthToken(ObtainAuthToken):
    """
    POST /backend/auth/login/
    Extended login that supports visiting users via the distributed lookup flow.

    Login attempt order:
    1. Check local auth.User (home users on this store)
    2. Check VisitingUserCache (visiting users cached within 24h)
    3. Query hub → hub broadcasts → P2P fetch from home store → cache result
    4. If home store unreachable and no cache: deny with friendly error
    """

    def post(self, request, *args, **kwargs):
        from rest_framework.authtoken.models import Token
        from .models import VisitingUserCache
        from django.contrib.auth import authenticate

        username_or_email = request.data.get('username', '')
        password = request.data.get('password', '')

        # ── Path 1: Local home user ──────────────────────────────────────────
        user = authenticate(request, username=username_or_email, password=password)
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token':      token.key,
                'user_id':    user.pk,
                'first_name': user.first_name,
                'userRole':   'admin' if user.is_superuser else ('manager' if user.is_staff else 'user'),
            })

        # ── Path 2: Visiting user in local cache ─────────────────────────────
        # Check by email (username may differ from email)
        email = username_or_email if '@' in username_or_email else None
        if not email:
            from django.contrib.auth.models import User as DjangoUser
            try:
                local = DjangoUser.objects.get(username=username_or_email)
                email = local.email
            except DjangoUser.DoesNotExist:
                email = username_or_email  # Try as email anyway

        cached = VisitingUserCache.objects.filter(
            email=email, expires_at__gt=timezone.now()
        ).first()
        if cached:
            # Verify password against cached PBKDF2 hash
            from django.contrib.auth.hashers import check_password
            if check_password(password, cached.hashed_password):
                # Issue a temporary DRF token using a synthetic local user
                # We use the visiting user cache entry as the identity source
                token_key = f"visiting_{cached.user_id}_{cached.home_store_id}"
                return Response({
                    'token':      token_key,
                    'user_id':    cached.user_id,
                    'first_name': cached.username,
                    'userRole':   cached.role,
                    'visiting':   True,
                    'home_store': cached.home_store_endpoint,
                })
            else:
                return Response({'error': 'Invalid credentials'},
                                status=status.HTTP_401_UNAUTHORIZED)

        # ── Path 3: Unknown user — trigger distributed lookup ─────────────────
        hub_url = settings.HUB_URL
        if not hub_url:
            return Response(
                {'error': 'This store cannot reach its regional hub. Please try your home store.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Step 3a: Ask hub to locate user's home store
        try:
            hub_resp = requests.post(
                f"{hub_url}/api/hub/user-lookup/",
                json={'email': email, 'requesting_store_id': settings.STORE_ID},
                headers={'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}',
                         'Content-Type': 'application/json'},
                timeout=8,
            )
        except requests.RequestException:
            return Response(
                {'error': 'Your regional hub is currently unreachable. Please try again shortly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        if hub_resp.status_code == 404:
            # Hub confirmed user doesn't exist anywhere
            return Response({'error': 'Invalid credentials'},
                            status=status.HTTP_401_UNAUTHORIZED)

        if hub_resp.status_code != 200:
            return Response(
                {'error': 'Hub returned an unexpected error. Please try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        hub_data = hub_resp.json()
        home_store_endpoint = hub_data['home_store_endpoint']

        # Step 3b: Fetch user data directly from home store (P2P)
        try:
            sync_resp = requests.post(
                f"{home_store_endpoint}/api/inter-node/user-sync/",
                json={'email': email, 'requesting_store_id': settings.STORE_ID},
                headers={'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}',
                         'Content-Type': 'application/json'},
                timeout=8,
            )
        except requests.RequestException:
            return Response(
                {'error': 'Your home store is currently unreachable. '
                          'If you have visited this store before, your session may have expired. '
                          'Please try again later.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        if sync_resp.status_code != 200:
            return Response({'error': 'Could not retrieve user data from home store.'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        user_data = sync_resp.json()

        # Step 3c: Verify password against home store's PBKDF2 hash
        from django.contrib.auth.hashers import check_password
        if not check_password(password, user_data['hashed_password']):
            return Response({'error': 'Invalid credentials'},
                            status=status.HTTP_401_UNAUTHORIZED)

        # Step 3d: Cache user data locally for 24 hours
        VisitingUserCache.objects.update_or_create(
            user_id=user_data['user_id'],
            home_store_id=user_data['home_store_id'],
            defaults={
                'username':          user_data['username'],
                'email':             user_data['email'],
                'hashed_password':   user_data['hashed_password'],
                'role':              user_data['role'],
                'home_store_endpoint': home_store_endpoint,
                'preferences':       user_data.get('preferences', []),
                'favorite_drink_ids': user_data.get('favorite_drink_ids', []),
                'expires_at':        timezone.now() + timedelta(hours=24),
            }
        )

        # Step 3e: Create a shadow auth.User + real DRF Token so subsequent API calls work.
        # The shadow user is prefixed "visiting_" to distinguish from home users.
        # It is cleaned up by the cleanup_expired_visiting_cache Celery task.
        from django.contrib.auth.models import User as DjangoUser
        from rest_framework.authtoken.models import Token as DRFToken

        shadow_user, _ = DjangoUser.objects.update_or_create(
            username=f"visiting_{user_data['user_id']}_{user_data['home_store_id']}",
            defaults={
                'email':      user_data['email'],
                'password':   user_data['hashed_password'],  # already PBKDF2 hashed
                'first_name': user_data.get('username', ''),
                'is_active':  True,
            }
        )
        drf_token, _ = DRFToken.objects.get_or_create(user=shadow_user)

        return Response({
            'token':      drf_token.key,
            'user_id':    user_data['user_id'],
            'first_name': user_data['username'],
            'userRole':   user_data['role'],
            'visiting':   True,
            'home_store': home_store_endpoint,
        })
```

**Note on visiting tokens:** A shadow `auth.User` row (username `visiting_<user_id>_<home_store_id>`)
is created on the visiting store so that a real DRF Token can be issued. This allows all
existing DRF `TokenAuthentication`-protected endpoints to work for visiting users without
changes. The shadow user and its token are deleted by the `cleanup_expired_visiting_cache`
Celery task when the 24-hour cache expires.

---

## Phase 7 — Profile Update Propagation

### Step 7.1 — Update `PreferencesOperations` in `views.py`

**File:** `codepop_backend/backend/views.py`

**Why:** When a visiting user updates their preferences, the change must propagate
back to their home store immediately. If the home store is offline, the update is
queued in `PendingProfileUpdate` (encrypted) for retry.

**Add this helper function** near the top of views.py (after imports):

```python
def _propagate_to_home_store(user_id: int):
    """
    If the user is a visiting user (in VisitingUserCache), push their current
    preferences and favorites back to their home store via P2P.
    If home store unreachable, queue in PendingProfileUpdate.
    """
    from .models import VisitingUserCache, PendingProfileUpdate, Preference
    from django.utils import timezone
    from datetime import timedelta

    cache = VisitingUserCache.objects.filter(
        user_id=user_id, expires_at__gt=timezone.now()
    ).first()
    if not cache:
        return  # Home user — no propagation needed

    # Build current state from local VisitingUserCache
    changes = {
        'preferences':       list(Preference.objects.filter(
            UserID__pk=user_id).values_list('Preference', flat=True)),
        'favorite_drink_ids': cache.favorite_drink_ids,
    }

    # Try immediate delivery to home store
    try:
        resp = requests.post(
            f"{cache.home_store_endpoint}/api/inter-node/profile-update/",
            json={'user_id': user_id, 'changes': changes,
                  'timestamp': timezone.now().isoformat()},
            headers={'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}',
                     'Content-Type': 'application/json'},
            timeout=5,
        )
        if resp.status_code == 200:
            confirmed = resp.json()
            # Update cache with confirmed data from home store
            cache.preferences = confirmed.get('preferences', changes['preferences'])
            cache.save(update_fields=['preferences'])
            return
    except requests.RequestException:
        pass  # Fall through to queueing

    # Home store unreachable — queue the update
    now = timezone.now()
    PendingProfileUpdate.objects.create(
        user_id=user_id,
        home_store_id=cache.home_store_id,
        home_store_endpoint=cache.home_store_endpoint,
        changes_encrypted=PendingProfileUpdate.encrypt(changes),
        next_retry_at=now + timedelta(seconds=1),
        max_retry_until=now + timedelta(hours=24),
    )
```

**Modify** `PreferencesOperations.create()` and `PreferencesOperations.destroy()`
to call `_propagate_to_home_store(user_id)` after the operation succeeds:

```python
# In PreferencesOperations.create():
def create(self, request, *args, **kwargs):
    response = super().create(request, *args, **kwargs)
    _propagate_to_home_store(request.user.pk)
    return response

# In PreferencesOperations.destroy():
def destroy(self, request, *args, **kwargs):
    response = super().destroy(request, *args, **kwargs)
    _propagate_to_home_store(request.user.pk)
    return response
```

---

## Phase 8 — Celery Tasks

### Step 8.1 — Create `tasks.py`

**File:** `codepop_backend/backend/tasks.py`  *(create new file)*

```python
import requests
import logging
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

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
            f"{hub_url}/api/hub/heartbeat/",
            json={'store_id': settings.STORE_ID, 'status': 'active'},
            headers=_node_headers(),
            timeout=5,
        )
        if resp.status_code != 200:
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
                f"{update.home_store_endpoint}/api/inter-node/profile-update/",
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
    from .models import PendingProfileUpdate
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
    """
    from .models import VisitingUserCache
    from django.contrib.auth.models import User as DjangoUser
    expired = VisitingUserCache.objects.filter(expires_at__lte=timezone.now())
    # Delete shadow auth.User rows (and their DRF Tokens via CASCADE) for expired visitors
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
    'unreachable'. Also called every 60 seconds via Celery Beat (add to beat_schedule).

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
```

**Also add** `check_missed_heartbeats` to the beat_schedule in `celery.py`:

```python
'check-missed-heartbeats': {
    'task': 'backend.tasks.check_missed_heartbeats',
    'schedule': 60.0,
},
```

---

## Phase 9 — Store Startup Registration

### Step 9.1 — Create/Update `apps.py`

**File:** `codepop_backend/backend/apps.py`  *(create if it doesn't exist)*

**Why:** When the Django application starts (gunicorn forks workers), each node must
register itself with its regional hub. The `AppConfig.ready()` hook fires after all
models are loaded — it's the right place for startup side effects.

```python
from django.apps import AppConfig
import logging

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

        payload = {
            'store_id':    settings.STORE_ID,
            'store_name':  f'CodePop {settings.REGION.title()} #{settings.STORE_ID}',
            'region':      settings.REGION,
            'api_endpoint': os.getenv('MY_API_ENDPOINT', ''),
        }

        for attempt, delay in enumerate([1, 2, 4, 8]):
            try:
                resp = requests.post(
                    f"{hub_url}/api/hub/register/",
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
```

**Add `MY_API_ENDPOINT` to `.env.example`:**

```env
# This store's publicly reachable API URL (used during hub registration)
MY_API_ENDPOINT=http://<THIS_VM_IP>:8000
```

**Update `apps.py` payload** to read it:

```python
'api_endpoint': os.getenv('MY_API_ENDPOINT', ''),
```

**Register the AppConfig** in `backend/__init__.py`:

```python
default_app_config = 'backend.apps.BackendConfig'
```

---

## Phase 10 — National Revenue Aggregation

### Step 10.1 — Add National Revenue View to `views.py`

**File:** `codepop_backend/backend/views.py`

**Why:** Super admins need nationwide revenue totals. With no master hub, the
super admin dashboard fans out to all configured hub endpoints in parallel.

```python
class NationalRevenueView(APIView):
    """
    GET /backend/revenues/national/
    Fans out to all configured hubs in parallel; returns per-hub and grand total.
    Restricted to superusers only.
    """
    permission_classes = [IsSuperUser]

    def get(self, request):
        import concurrent.futures

        def query_hub(region, hub_url):
            if not hub_url:
                return None
            try:
                resp = requests.get(
                    f"{hub_url}/api/hub/revenue/",
                    headers={'Authorization': f'NodeToken {settings.INTER_NODE_SECRET}'},
                    timeout=10,
                )
                if resp.status_code == 200:
                    return resp.json()
            except requests.RequestException:
                return None

        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=7) as executor:
            futures = {
                executor.submit(query_hub, region, url): region
                for region, url in settings.HUB_ENDPOINTS.items()
                if url
            }
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                if result:
                    results.append(result)

        grand_total = sum(r.get('total_revenue', 0) for r in results)
        return Response({
            'grand_total': round(grand_total, 2),
            'by_region': results,
        })
```

**Add URL:**

```python
path('revenues/national/', NationalRevenueView.as_view()),
```

---

## Phase 11 — Admin Registration

### Step 11.1 — Update `admin.py`

**File:** `codepop_backend/backend/admin.py`

**Replace the entire file with:**

```python
from django.contrib import admin
from .models import (
    # Existing models
    Preference, Drink, Inventory, Notification, Order, Revenue,
    # Distributed system models
    Region, StoreRegistry, VisitingUserCache, PendingProfileUpdate,
    SyncAuditLog, SupplyRequest, Machine, Schedule,
    RepairStaffProfile, LogisticsManagerProfile,
)

admin.site.register(Preference)
admin.site.register(Drink)
admin.site.register(Inventory)
admin.site.register(Notification)
admin.site.register(Order)
admin.site.register(Revenue)
admin.site.register(Region)

@admin.register(StoreRegistry)
class StoreRegistryAdmin(admin.ModelAdmin):
    list_display = ('store_id', 'store_name', 'region', 'status', 'last_heartbeat')
    list_filter  = ('status', 'region')

@admin.register(VisitingUserCache)
class VisitingUserCacheAdmin(admin.ModelAdmin):
    list_display  = ('username', 'email', 'home_store_id', 'cached_at', 'expires_at')
    list_filter   = ('home_store_id',)
    search_fields = ('email', 'username')

@admin.register(PendingProfileUpdate)
class PendingProfileUpdateAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'home_store_id', 'status', 'retry_count',
                    'created_at', 'next_retry_at')
    list_filter  = ('status',)

@admin.register(SyncAuditLog)
class SyncAuditLogAdmin(admin.ModelAdmin):
    list_display  = ('timestamp', 'event_type', 'requesting_node', 'success', 'user_email')
    list_filter   = ('event_type', 'success')
    search_fields = ('requesting_node', 'user_email')
    readonly_fields = ('timestamp',)  # audit logs are immutable

@admin.register(SupplyRequest)
class SupplyRequestAdmin(admin.ModelAdmin):
    list_display = ('store_id', 'item_name', 'quantity', 'status', 'created_at')
    list_filter  = ('status', 'region')

@admin.register(Machine)
class MachineAdmin(admin.ModelAdmin):
    list_display = ('machine_id', 'name', 'status', 'last_status_change')
    list_filter  = ('status',)

admin.site.register(Schedule)
admin.site.register(RepairStaffProfile)
admin.site.register(LogisticsManagerProfile)
```

---

## Phase 12 — Tests

### Step 12.1 — Add Distributed Tests to `tests.py`

**File:** `codepop_backend/backend/tests.py`

**Add** the following test classes to the end of the existing test file:

```python
from unittest.mock import patch, MagicMock
from .models import VisitingUserCache, PendingProfileUpdate, StoreRegistry, SyncAuditLog
from django.utils import timezone
from datetime import timedelta


class InterNodeAuthTests(APITestCase):
    """
    Tests that all /api/hub/ and /api/inter-node/ endpoints reject
    requests without a valid NodeToken header.
    """
    def test_hub_register_rejects_no_token(self):
        url = '/api/hub/register/'
        resp = self.client.post(url, {'store_id': 1}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_hub_register_rejects_wrong_token(self):
        url = '/api/hub/register/'
        self.client.credentials(HTTP_AUTHORIZATION='NodeToken wrong-secret')
        resp = self.client.post(url, {'store_id': 1}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_user_sync_rejects_no_token(self):
        url = '/api/inter-node/user-sync/'
        resp = self.client.post(url, {'email': 'test@test.com'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_profile_update_rejects_no_token(self):
        url = '/api/inter-node/profile-update/'
        resp = self.client.post(url, {'user_id': 1}, format='json')
        self.assertEqual(resp.status_code, 403)


class StoreRegistryTests(APITestCase):
    """Tests hub store registration and heartbeat flows."""

    def setUp(self):
        from django.conf import settings
        settings.INTER_NODE_SECRET = 'test-secret'
        self.client.credentials(HTTP_AUTHORIZATION='NodeToken test-secret')

    def test_store_can_register(self):
        resp = self.client.post('/api/hub/register/', {
            'store_id': 42,
            'store_name': 'Test Store',
            'region': 'logan',
            'api_endpoint': 'http://10.0.0.2:8000',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'registered')
        self.assertTrue(StoreRegistry.objects.filter(store_id=42).exists())

    def test_heartbeat_updates_timestamp(self):
        StoreRegistry.objects.create(
            store_id=42, store_name='Test', region='logan',
            api_endpoint='http://10.0.0.2:8000', status='active',
        )
        resp = self.client.post('/api/hub/heartbeat/', {'store_id': 42}, format='json')
        self.assertEqual(resp.status_code, 200)
        store = StoreRegistry.objects.get(store_id=42)
        self.assertEqual(store.missed_heartbeats, 0)


class VisitingUserCacheTests(APITestCase):
    """Tests the VisitingUserCache model and TTL behavior."""

    def test_cache_expires(self):
        cache = VisitingUserCache.objects.create(
            user_id=99, username='alice', email='alice@test.com',
            hashed_password='fakehash', role='customer',
            home_store_id=1, home_store_endpoint='http://home:8000',
            expires_at=timezone.now() - timedelta(hours=1),  # already expired
        )
        self.assertTrue(cache.is_expired())

    def test_cache_not_expired(self):
        cache = VisitingUserCache.objects.create(
            user_id=99, username='alice', email='alice@test.com',
            hashed_password='fakehash', role='customer',
            home_store_id=1, home_store_endpoint='http://home:8000',
            expires_at=timezone.now() + timedelta(hours=23),
        )
        self.assertFalse(cache.is_expired())


class PendingProfileUpdateTests(APITestCase):
    """Tests the PendingProfileUpdate encryption and retry logic."""

    def test_encrypt_decrypt_roundtrip(self):
        from django.conf import settings
        settings.INTER_NODE_SECRET = 'test-key-for-encryption'
        original = {'preferences': ['Fruity', 'Sweet'], 'favorite_drink_ids': [1, 2]}
        encrypted = PendingProfileUpdate.encrypt(original)
        decrypted = PendingProfileUpdate.decrypt(encrypted)
        self.assertEqual(original, decrypted)

    def test_encrypted_blob_not_plaintext(self):
        from django.conf import settings
        settings.INTER_NODE_SECRET = 'test-key-for-encryption'
        original = {'preferences': ['Fruity']}
        encrypted = PendingProfileUpdate.encrypt(original)
        self.assertNotIn('Fruity', encrypted)  # data must not be visible in stored form


class UserReplicationTests(APITestCase):
    """
    Tests the distributed login flow using mocked outbound HTTP calls.
    We mock requests.post to avoid actual network calls in tests.
    """

    def setUp(self):
        from django.conf import settings
        settings.INTER_NODE_SECRET = 'test-secret'
        settings.STORE_ID = '42'
        settings.REGION = 'logan'
        settings.HUB_URL = 'http://hub:8000'

    @patch('backend.views.requests.post')
    def test_visiting_user_triggers_hub_lookup(self, mock_post):
        """Unknown user login should call hub user-lookup."""
        hub_response = MagicMock()
        hub_response.status_code = 200
        hub_response.json.return_value = {
            'status': 'found',
            'home_store_id': 1,
            'home_store_endpoint': 'http://home-store:8000',
        }
        sync_response = MagicMock()
        sync_response.status_code = 200
        from django.contrib.auth.hashers import make_password
        sync_response.json.return_value = {
            'user_id': 99, 'username': 'alice',
            'email': 'alice@test.com',
            'hashed_password': make_password('secret123'),
            'role': 'customer',
            'home_store_id': 1,
            'preferences': [], 'favorite_drink_ids': [],
        }
        mock_post.side_effect = [hub_response, sync_response]

        resp = self.client.post('/backend/auth/login/',
                                {'username': 'alice@test.com', 'password': 'secret123'})
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data.get('visiting'))
        self.assertTrue(VisitingUserCache.objects.filter(email='alice@test.com').exists())

    @patch('backend.views.requests.post')
    def test_home_store_unreachable_no_cache_returns_503(self, mock_post):
        """If hub returns found but home store is unreachable, return 503."""
        hub_response = MagicMock()
        hub_response.status_code = 200
        hub_response.json.return_value = {
            'status': 'found', 'home_store_id': 1,
            'home_store_endpoint': 'http://home-store:8000',
        }
        import requests as req
        mock_post.side_effect = [hub_response, req.ConnectionError('unreachable')]

        resp = self.client.post('/backend/auth/login/',
                                {'username': 'alice@test.com', 'password': 'secret123'})
        self.assertEqual(resp.status_code, 503)
        self.assertIn('home store', resp.data['error'].lower())
```

---

## Phase 13 — Frontend Updates

### Step 13.1 — Update `AuthPage.js` for Distributed Error Handling

**File:** `codepop/src/pages/AuthPage.js`

**Why:** The login API now returns new HTTP status codes (503 for hub/home store
unreachable, 404 for user not found anywhere). The UI must show human-readable
messages for these distributed errors instead of a generic "Login failed."

**Update** the catch/status handling in the login `fetch` call:

```javascript
// After: const data = await response.json();
if (response.status === 401) {
  Alert.alert('Login Failed', 'Incorrect username or password.');
  return;
}
if (response.status === 503) {
  Alert.alert(
    'Service Unavailable',
    data.error || 'This store is currently unable to verify your identity. Please try again shortly.',
    [{ text: 'OK' }]
  );
  return;
}
if (!response.ok) {
  Alert.alert('Login Failed', data.error || 'An unexpected error occurred.');
  return;
}

// On success, also store the 'visiting' flag and 'home_store' endpoint
await AsyncStorage.setItem('userToken', data.token);
await AsyncStorage.setItem('userId', String(data.user_id));
await AsyncStorage.setItem('first_name', data.first_name || '');
await AsyncStorage.setItem('userRole', data.userRole || 'user');
if (data.visiting) {
  await AsyncStorage.setItem('isVisiting', 'true');
  await AsyncStorage.setItem('homeStore', data.home_store || '');
} else {
  await AsyncStorage.removeItem('isVisiting');
  await AsyncStorage.removeItem('homeStore');
}
```

---

### Step 13.2 — Update `PreferencesPage.js` for Sync Status

**File:** `codepop/src/pages/PreferencesPage.js`

**Why:** When a visiting user updates preferences, the update may take a moment to
propagate to the home store (or be queued if offline). The UI should show a subtle
sync indicator so users know the state of their data.

**Add** a `syncStatus` state:

```javascript
const [syncStatus, setSyncStatus] = useState(null); // null | 'syncing' | 'synced' | 'queued'
```

**Wrap preference API calls** to show sync status:

```javascript
// After a preference POST/DELETE succeeds:
setSyncStatus('syncing');
// The backend handles propagation. Poll /api/pending-updates/<user_id>/ to check.
// For now, show 'synced' after 3 seconds (backend is async — optimistic UI).
setTimeout(() => setSyncStatus('synced'), 3000);
```

**Add** a status banner above the preferences list:

```jsx
{syncStatus === 'syncing' && (
  <Text style={styles.syncBanner}>Syncing changes to your home store...</Text>
)}
{syncStatus === 'synced' && (
  <Text style={[styles.syncBanner, styles.syncedColor]}>Changes saved ✓</Text>
)}
```

---

### Step 13.3 — Build `StoreSelectionPage.js`

**File:** `codepop/src/pages/StoreSelectionPage.js`  *(create new file)*

**Why:** With multiple stores across two active regions (Logan and Atlanta), users
need a way to select which store they are ordering from. This page replaces the
current hardcoded single-store assumption.

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BASE_URL } from '../../ip_address';

/**
 * StoreSelectionPage
 *
 * Shows a list of nearby active stores (fetched from the user's regional hub).
 * The user taps a store to select it; this sets the active store endpoint
 * in AsyncStorage, which all other screens use for API calls.
 *
 * Why: With a distributed architecture, each store is an independent server
 * at a different IP. The user's device must know which store to talk to.
 */
export default function StoreSelectionPage({ navigation }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNearbyStores();
  }, []);

  const fetchNearbyStores = async () => {
    try {
      // Fetch the store registry from the hub (via the current BASE_URL)
      const response = await fetch(`${BASE_URL}/api/hub/store-registry/`, {
        headers: {
          // NOTE: Store registry is public; no auth required.
          // In future, use GPS to filter to nearest stores.
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStores(data.stores || []);
      } else {
        Alert.alert('Error', 'Could not load stores. Please try again.');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not reach the hub. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const selectStore = async (store) => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('activeStoreUrl', store.api_endpoint);
    await AsyncStorage.setItem('activeStoreName', store.store_name);
    navigation.replace('GeneralHome');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select a Store</Text>
      {loading ? (
        <Text>Loading stores...</Text>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => String(item.store_id)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.storeCard} onPress={() => selectStore(item)}>
              <Text style={styles.storeName}>{item.store_name}</Text>
              <Text style={styles.storeRegion}>{item.region}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, padding: 20 },
  title:       { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  storeCard:   { padding: 16, marginBottom: 12, backgroundColor: '#f0f0f0',
                 borderRadius: 8 },
  storeName:   { fontSize: 18, fontWeight: '600' },
  storeRegion: { color: '#666', marginTop: 4 },
});
```

---

### Step 13.4 — Update `App.js` Navigation

**File:** `codepop/App.js`

**Add** `StoreSelectionPage` to the navigator:

```javascript
import StoreSelectionPage from './src/pages/StoreSelectionPage';

// In the Stack.Navigator:
<Stack.Screen name="StoreSelect" component={StoreSelectionPage}
  options={{ title: 'CodePop', headerStyle: ... }} />
```

**Change** the initial route to `StoreSelect` (users pick their store before logging in):

```javascript
<Stack.Navigator initialRouteName="StoreSelect">
```

---

### Step 13.5 — Update `ip_address.js` for Dynamic Store URL

**File:** `codepop/ip_address.js`

**Why:** `BASE_URL` can no longer be a single hardcoded IP. Each store is a different
server. The hub URL is used for store discovery; the active store URL is set after
the user selects their store.

```javascript
// Hub URL — used for store discovery and user lookup.
// This is the Logan Hub (the first active hub).
const HUB_URL = 'http://<LOGAN_HUB_IP>:8000';

// Active store URL — set by StoreSelectionPage after user picks a store.
// Falls back to hub URL for initial store discovery.
const BASE_URL = HUB_URL;

export { BASE_URL, HUB_URL };
```

All pages that use `BASE_URL` for order/inventory/auth calls should read the
active store URL from AsyncStorage at runtime:

```javascript
// Pattern used in pages that need the active store:
import AsyncStorage from '@react-native-async-storage/async-storage';
const storeUrl = await AsyncStorage.getItem('activeStoreUrl') || BASE_URL;
// Then use storeUrl instead of BASE_URL for API calls
```

---

## Phase 14 — Deployment Updates

### Step 14.1 — Update GitHub Actions `deploy.yml`

**File:** `.github/workflows/deploy.yml`

**Why:** The `deploy-logan-master-hub` job name and any master-hub-specific logic
must be updated to reflect the flat hub architecture.

**Changes:**

1. **Rename** `deploy-logan-master-hub` to `deploy-logan-hub`

2. **Add** `MY_API_ENDPOINT` to the environment set on each VM by reading from GitHub
   secrets (each VM's IP is already a secret):

In each deploy job, add to the deployment script:
```bash
# Update .env with this VM's own API endpoint
echo "MY_API_ENDPOINT=http://$(hostname -I | awk '{print $1}'):8000" >> .env
```

3. **Add** hub URLs to each VM's `.env` during deployment:

   **Store VMs** — only their own hub:
   ```bash
   # Logan stores point to Logan hub; Atlanta stores point to Atlanta hub
   echo "HUB_URL=http://${{ secrets.LOGAN_HUB_IP }}:8000" >> .env   # for Logan stores
   # echo "HUB_URL=http://${{ secrets.ATLANTA_HUB_IP }}:8000" >> .env  # for Atlanta stores
   ```

   **Hub VMs** — their own address plus the full mesh:
   ```bash
   echo "HUB_URL=http://${{ secrets.LOGAN_HUB_IP }}:8000" >> .env   # self-reference for Logan hub
   echo "HUB_LOGAN_URL=http://${{ secrets.LOGAN_HUB_IP }}:8000" >> .env
   echo "HUB_ATLANTA_URL=http://${{ secrets.ATLANTA_HUB_IP }}:8000" >> .env
   # Other hubs added here when provisioned
   ```

4. **Add** template jobs (commented out) for future regions:

```yaml
# ── Future Region Templates (uncomment when VMs provisioned) ──────────────────
# deploy-chicago-hub:
#   needs: []
#   runs-on: ubuntu-latest
#   steps:
#     - uses: actions/checkout@v3
#     - name: Deploy Chicago Hub
#       uses: appleboy/ssh-action@v1.0.0
#       with:
#         host: ${{ secrets.CHICAGO_HUB_IP }}
#         username: peterson_braden2
#         key: ${{ secrets.SSH_PRIVATE_KEY }}
#         script: |
#           set -e
#           cd ~/codepop/codepop_backend
#           git pull origin master
#           docker compose down
#           docker compose up -d --build
```

5. **Add a CI test job** that runs before all deploys:

```yaml
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: codepop
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:8-alpine
        options: --health-cmd "redis-cli ping"
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v5
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: |
          cd codepop_backend
          pip install -r requirements.txt
      - name: Run tests
        env:
          DB_HOST: localhost
          DB_NAME: codepop
          DB_USER: postgres
          DB_PASSWORD: password
          REDIS_URL: redis://localhost:6379/0
          INTER_NODE_SECRET: test-secret
          IS_HUB: 'False'
        run: |
          cd codepop_backend
          python manage.py migrate
          python manage.py test backend
```

**Add** `needs: [test]` to all deploy jobs so tests must pass before any deployment.

---

## Verification Checklist

After completing all phases, verify end-to-end functionality:

### Backend Smoke Tests
```bash
# 1. Confirm all migrations applied
docker compose run --rm web python manage.py showmigrations

# 2. Confirm Celery worker is running
docker compose logs celery-worker

# 3. Confirm Celery beat is running
docker compose logs celery-beat

# 4. Run test suite
docker compose run --rm web python manage.py test backend

# 5. Confirm new endpoints registered
docker compose run --rm web python manage.py show_urls | grep -E 'hub|inter-node'
```

### Distributed Flow Verification (Manual)
```bash
# On Logan Hub VM:
# Confirm a store can register
curl -X POST http://LOGAN_HUB_IP:8000/api/hub/register/ \
  -H "Authorization: NodeToken <secret>" \
  -H "Content-Type: application/json" \
  -d '{"store_id":1,"store_name":"Test","region":"logan","api_endpoint":"http://STORE_IP:8000"}'

# Confirm heartbeat works
curl -X POST http://LOGAN_HUB_IP:8000/api/hub/heartbeat/ \
  -H "Authorization: NodeToken <secret>" \
  -d '{"store_id":1,"status":"active"}'

# On a Store VM:
# Confirm login triggers hub lookup for unknown user
curl -X POST http://STORE_IP:8000/backend/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"alice@example.com","password":"secret123"}'
# Expected: either valid response or 503 with "home store unreachable"

# Confirm unauthenticated inter-node requests are rejected
curl -X POST http://STORE_IP:8000/api/inter-node/user-sync/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'
# Expected: 403 Forbidden
```

### Frontend Verification
1. Launch app → `StoreSelectionPage` appears first
2. Tapping a store sets it as active and navigates to `GeneralHome`
3. Login with home-store credentials → success
4. Login with unknown credentials → clear error message
5. Update preferences on a visiting account → sync banner appears
6. Verify `SyncAuditLog` table has entries after inter-node calls

---

## Known Gaps / Future Work

| Item | Notes |
|------|-------|
| JWT RS256 auth | Current shared-secret auth works for Sprint 3; JWT planned for Sprint 4 |
| Full GPS-based store discovery | `StoreSelectionPage` currently shows all stores; GPS-radius filter is a future step |
| 5 unprovisioned hub regions | Chicago, NJ, Dallas, Phoenix, Seattle templates exist but VMs not provisioned |
| Supply request approval UI | `SupplyRequest` model exists; hub approval workflow UI not yet built |
| Repair staff / logistics manager dashboards | Models exist; dedicated UI screens not yet built |
| Machine status push to hub | `Machine` model exists; real-time push endpoint not implemented |
| CI test gate | Tests must pass before deploys — currently no test step in CI (added in Phase 14) |
| `show_urls` management command | Requires `django-extensions` package (optional) |
