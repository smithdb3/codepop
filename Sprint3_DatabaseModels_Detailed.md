# Sprint 3 Database Models: Detailed Explanation

**Document Purpose:** This file explains every database model added in Sprint 3, the reasoning behind each field, and how they support the distributed system architecture.

**Author:** Implementation based on CurrentHighLevelDesign.md and CurrentLowLevelDesign.md specifications
**Status:** Completed and migrated to PostgreSQL

---

## Table of Contents

1. [Overview](#overview)
2. [Group 1: Distributed Architecture Models](#group-1-distributed-architecture-models)
3. [Group 2: Feature Models](#group-2-feature-models)
4. [Group 3: Staff Role Profiles](#group-3-staff-role-profiles)
5. [Configuration Changes](#configuration-changes)
6. [Implementation Notes](#implementation-notes)

---

## Overview

Sprint 3 adds 19 new database models to `backend/models.py` to support CodePop's transformation into a federated distributed system. All models are designed to be:
- **Forward-compatible**: Fields like `public_key` are pre-positioned for future JWT RS256 implementation
- **Audit-friendly**: Most include `created_at`, `updated_at`, or similar timestamps
- **Production-ready**: Proper validation, choices, and default values

All models have been migrated to the PostgreSQL database via Django migrations (0001_initial.py).

---

## Group 1: Distributed Architecture Models

These 7 models enable inter-node communication, discovery, authentication, and data synchronization.

### `StoreRegistry`

**Purpose:** Each regional hub tracks all stores registered under it. Persists store registration data so it survives hub restarts.

**Why it exists:** The LLD "Store Registration on Startup" flow requires the hub to maintain a registry of which stores are in its region. Without persistent storage, the hub would lose track after restart.

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `store_id` | IntegerField (unique) | Uniquely identifies this store across the entire system |
| `store_name` | CharField(255) | Human-readable name (e.g., "CodePop Chicago #1") for dashboards |
| `region` | CharField(100) | Which region: "Chicago", "Atlanta", "Logan", etc. |
| `latitude` | FloatField | Geographic location for distance-based store discovery |
| `longitude` | FloatField | Geographic location for distance-based store discovery |
| `api_endpoint` | URLField | The URL where this store's Django API is accessible (e.g., `https://store42.internal:8000`). Used by other nodes for P2P communication. |
| `public_key` | TextField (blank=True) | Pre-positioned for JWT RS256 public key. Not used in Sprint 3 (using shared secrets instead). |
| `is_active` | BooleanField (default=True) | Stores that miss 3 heartbeats (90 seconds per LLD) get marked `False`. Used to filter dead stores. |
| `last_heartbeat` | DateTimeField (nullable) | Timestamp of the most recent heartbeat from this store. Hub uses this to detect dead stores. |
| `registered_at` | DateTimeField (auto_now_add) | When the store first registered (audit trail) |

**How it works:**
1. Store starts up, reads local config (store_id, region, location)
2. Store POSTs to hub: `/api/hub/register/` with store_id, region, lat/lon, api_endpoint
3. Hub creates/updates a `StoreRegistry` record
4. Hub returns list of sibling stores from `StoreRegistry` table
5. Hub starts 30-second heartbeat check; stores with `last_heartbeat` > 90 seconds get marked `is_active=False`

---

### `HubRegistry`

**Purpose:** Each node (store or hub) tracks known regional hubs for cross-region queries and federation.

**Why it exists:** The LLD cross-region user discovery shows NY Hub querying all 7 regional hubs for a user. Hubs need a registry of each other to implement this broadcast.

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `hub_id` | IntegerField (unique) | Unique identifier for the hub (analogous to store_id) |
| `hub_name` | CharField(255) | Human-readable name: "Chicago Hub", "Master Hub Logan", etc. |
| `region` | CharField(100) | Which region it serves |
| `api_endpoint` | URLField | URL to reach this hub's API |
| `is_master` | BooleanField (default=False) | Only Logan UT = True. Used to identify the master hub for nationwide aggregation. |
| `is_active` | BooleanField (default=True) | Track hub availability |
| `last_seen` | DateTimeField (nullable) | When this hub last responded to a query |
| `registered_at` | DateTimeField (auto_now_add) | Audit trail |

**How it works:**
- Master hub knows about all 7 regional hubs (including itself as a region)
- Regional hubs know about the master hub and sometimes peer regional hubs
- Used in cross-region user discovery: "NY Hub broadcasts to all hubs in HubRegistry: 'where is alice@example.com?'"

---

### `NodeCertificate`

**Purpose:** Stores node identity and authentication credentials. Supports both Sprint 3 (shared secrets) and future JWT RS256 implementations.

**Why it exists:** The LLD specifies "Each node registers with master hub on startup, Provides: Node ID, Region, Location, Public Key, Receives: Signed certificate valid for 90 days." This table is the "certificate" storage.

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `node_id` | CharField(100, unique) | Which node this cert belongs to (e.g., "store-42", "chicago-hub", "master-logan") |
| `node_type` | CharField(20, choices) | Type of node: 'store', 'hub', or 'master'. Enables filtering queries. |
| `shared_secret` | CharField(255) | For Sprint 3: the hashed INTER_NODE_SECRET. For future: replace with `private_key` and `public_key` fields for JWT RS256. |
| `issued_at` | DateTimeField (auto_now_add) | When the master hub issued this cert |
| `expires_at` | DateTimeField | LLD specifies 90-day cert validity. Receiving nodes reject expired certs. |
| `is_active` | BooleanField (default=True) | Allows cert revocation without deletion (audit trail) |

**How it works in Sprint 3:**
1. Each VM (store or hub) gets a unique `INTER_NODE_SECRET` in its `.env`
2. Node hashes the secret and stores it in `shared_secret`
3. When sending a request to another node, include header: `Authorization: NodeToken {secret}`
4. Receiving node looks up sender's cert, compares hashed secret, rejects if expired or inactive

**How it will work with JWT RS256 (future):**
1. Replace `shared_secret` field with `private_key` (for signing) and `public_key` (for validation)
2. Signing: sender creates JWT token signed with private_key, includes in header
3. Validation: receiver looks up sender's public_key, verifies JWT signature, checks expiration
4. No migrations needed because the field structure remains the same

---

### `UserCache`

**Purpose:** Implements the core lazy replication model. Caches user profiles from other stores locally.

**Why it exists:** The LLD states "User data does NOT automatically replicate to all stores. User data syncs ON-DEMAND when user logs into a new store for the first time." This table enables that caching.

**Example flow:**
1. Alice (registered at Logan) visits NY store and attempts login
2. NY store queries its local User table: not found
3. NY store queries NY hub: "where is alice@example.com?"
4. NY hub broadcasts to all hubs
5. Logan hub responds: "found at Logan Store #001"
6. NY store contacts Logan Store #001 directly: "send me alice's data"
7. Logan store returns: `{user_id: 5, email: alice@..., preferences: [...], favorite_drinks: [...]}`
8. NY store saves this in `UserCache` table
9. Next time Alice logs in at NY store, it finds her in UserCache (no hub query needed)
10. After 24 hours, `expires_at` passes, and she'd need to sync again

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `user_email` | CharField(255, unique) | Email is the lookup key. Unique constraint ensures one cache entry per user. |
| `user_data` | JSONField | Full user profile snapshot: `{"user_id": 5, "email": "alice@...", "preferences": ["Fruity"], "favorite_drinks": [42, 87]}` |
| `source_store_id` | IntegerField | Which store this user originally came from. Used for debugging and "go back to home store" features. |
| `synced_at` | DateTimeField (auto_now) | When we last fetched/updated this data. Auto-updates on every save. |
| `expires_at` | DateTimeField | When this cache entry becomes stale. Set to `synced_at + 24 hours` per LLD. After this, user must sync again. |

**Why JSONField?** User profiles evolve. Instead of replicating every column from the User model (username, first_name, last_name, etc.), we store the entire profile as JSON. Future changes to user data don't require schema migrations.

---

### `SyncRecord`

**Purpose:** Audit log for all replication events. Proves eventual consistency is working and helps debug sync failures.

**Why it exists:** The LLD promises "Eventual Consistency for replicated data (user preferences, roles)". You need a way to track that this is actually happening.

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `sync_type` | CharField(50, choices) | What was replicated? 'user_pull' = user data pulled from peer, 'catalog_push' = drink menu pushed to store, 'status_update' = machine status sent to hub |
| `source_store_id` | IntegerField | Store ID that initiated or sent the sync |
| `target_store_id` | IntegerField (nullable) | Store ID that received the sync. Nullable because some syncs target hubs instead. |
| `status` | CharField(20, choices) | 'pending' = queued, 'success' = completed, 'failed' = error occurred |
| `created_at` | DateTimeField (auto_now_add) | When the sync was attempted |
| `completed_at` | DateTimeField (nullable) | When the sync finished. Null if still pending or failed. |
| `error_message` | TextField (blank=True) | If status='failed', why? (e.g., "Connection timeout", "Invalid signature") |

**How it's used:**
- Dashboard: Logistics manager views sync statistics ("98% of user syncs succeed within 5 seconds")
- Debugging: Engineer queries `SyncRecord.objects.filter(status='failed')` to find broken syncs
- Compliance: "Can we prove user data replicated correctly?" Yes, point to SyncRecord entries

---

### `EventQueue`

**Purpose:** Resilient event delivery during network partitions. Queues outbound messages and retries with exponential backoff.

**Why it exists:** The LLD "Network Partition (Store isolated)" section says "Fallback: All operations queued locally; sync when connectivity restored." If a store's hub goes down, it can't send updates immediately. Queue them and retry later.

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `event_type` | CharField(50, choices) | Type of event: 'status_update' (machine status), 'supply_request' (inventory request), 'heartbeat' (I'm alive), 'user_sync' (user data sync) |
| `payload` | JSONField | Full event data. Examples: `{"machine_id": "M123", "status": "ERROR"}` or `{"store_id": 5, "item": "Strawberry Syrup", "qty": 10}` |
| `target_node` | CharField(255) | Full API endpoint URL to deliver to (e.g., `https://chicago-hub.internal:8000/api/inter-node/status-update/`) |
| `status` | CharField(20, choices) | 'pending' = not yet sent, 'sent' = delivered successfully, 'failed' = gave up after max retries |
| `created_at` | DateTimeField (auto_now_add) | When the event was queued |
| `last_attempt` | DateTimeField (nullable) | Last time we tried to deliver this event. Used for exponential backoff. |
| `attempts` | IntegerField (default=0) | How many times have we tried? Celery stops after 4 attempts (exponential backoff: 1s, 2s, 4s, 8s). |

**How it works:**
1. Store's hub is down, so machine status update is queued to EventQueue
2. Celery worker picks up pending events every 10 seconds
3. Worker tries to POST event payload to target_node
4. On failure, updates `last_attempt = now()`, `attempts += 1`
5. Worker calculates next retry: `next_retry = last_attempt + (2 ** attempts)` seconds
6. When hub comes back online, worker delivers the queued event
7. After successful delivery, status='sent' (or status='failed' if max retries exceeded)

---

### `SupplyRequest`

**Purpose:** Tracks supply requests from stores to regional hubs. Implements supply chain workflow.

**Why it exists:** The LLD includes "Supply requests" as a key inter-node message type. Hubs need to track which stores need what items, approve/deny requests, and manage fulfillment.

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `store_id` | IntegerField | Which store made the request |
| `item_name` | CharField(255) | "Strawberry Syrup", "Ice", "Cups", etc. |
| `item_type` | CharField(50, choices) | Category: 'Soda', 'Syrup', 'Add In', 'Physical'. Reuses the same choices as the `Inventory` model. |
| `quantity_requested` | PositiveIntegerField | How many units the store needs |
| `status` | CharField(20, choices) | Workflow: 'pending' (hub reviewing), 'approved' (will ship), 'denied' (out of stock), 'fulfilled' (delivered) |
| `created_at` | DateTimeField (auto_now_add) | When store submitted the request |
| `resolved_at` | DateTimeField (nullable) | When hub approved/denied/fulfilled it. Null if still pending. |
| `notes` | TextField (blank=True) | Logistics manager's notes: "out of stock, ETA 3 days" or "approved, shipping Friday" |

**How it works:**
1. Store manager notices inventory low, creates SupplyRequest via UI
2. SupplyRequest record created with status='pending'
3. Logistics manager views hub dashboard, sees pending requests for their region
4. Manager approves/denies request, adds notes, sets status='approved' or 'denied', sets resolved_at=now()
5. If approved, hub arranges shipment; once delivered, manager updates status='fulfilled'

---

## Group 2: Feature Models

These 4 models support Sprint 3 dashboards and operational features (machines, schedules, regions, supply hubs).

### `Region`

**Purpose:** Canonical list of regions. Reference table used by other models to enforce consistency.

**Why it exists:** The LLD specifies 7 regional hubs (Chicago, NJ, Dallas, Phoenix, Atlanta, Seattle, Logan). Rather than having 'region' as a plain CharField everywhere (prone to typos), use a FK to this table.

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `name` | CharField(100, unique) | Region name: "Chicago", "New Jersey", "Logan", etc. Unique constraint prevents duplicates. |
| `hub_api_endpoint` | URLField (blank=True) | The URL of that region's hub API (e.g., `https://chicago-hub.internal:8000`). Stores use this to register. |
| `is_master` | BooleanField (default=False) | Only Logan = True. Identifies the master hub for nationwide revenue aggregation. |

**Why a separate table?** Prevents inconsistent spelling of region names. If 'region' was just a CharField on SupplyHub and LogisticsManagerProfile, someone might write "Chicago" in one and "chicago" in another, breaking JOINs. This table enforces a canonical list.

---

### `SupplyHub`

**Purpose:** Represents physical supply hub locations and their operations.

**Why it exists:** The LLD mentions "Supply Hub table (tracks supply hub inventory and operations)". Logistics managers need to manage multiple supply hubs across regions.

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `region` | ForeignKey(Region) | Which region's supply hub is this? |
| `address` | CharField(255) | Physical mailing address for logistics |
| `contact_email` | EmailField | Who manages this supply hub (for communications) |
| `inventory_notes` | TextField (blank=True) | Free-form notes: "Low on strawberry syrup, reorder from supplier by Friday" |
| `created_at` | DateTimeField (auto_now_add) | Audit trail |

**Relationships:**
- If you delete a Region, all its SupplyHubs are cascade-deleted (makes operational sense)

**Typical usage:**
- Logistics manager views all supply hubs in their region
- Manager updates inventory_notes to coordinate restocking
- Hubs are the fulfillment centers for SupplyRequests

---

### `Machine`

**Purpose:** Tracks robotic vending machines and their operational status through a complete state machine.

**Why it exists:** The LLD defines a 7-state machine state machine for vending machines (NORMAL → WARNING → ERROR → OUT_OF_ORDER → SCHEDULE_SERVICE → REPAIR_START → REPAIR_END → back to NORMAL). All stakeholders need to track this status: customers (is it working?), managers (any issues?), repair staff (what needs fixing?).

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `machine_id` | CharField(100, unique) | Unique identifier across the entire system (e.g., "M001", "M042"). Displayed on physical machine label. |
| `store_id` | IntegerField | Which store has this machine. Used to query "all machines at store X" or "all machines in region Y". |
| `status` | CharField(30, choices) | Current state in the machine state machine: |
| | | • **NORMAL**: Working, accepting orders |
| | | • **WARNING**: Issue detected, monitoring increased |
| | | • **ERROR**: Critical failure, order intake paused |
| | | • **OUT_OF_ORDER**: Complete breakdown, repair assigned |
| | | • **SCHEDULE_SERVICE**: Routine maintenance scheduled |
| | | • **REPAIR_START**: Technician on-site, work in progress |
| | | • **REPAIR_END**: Work complete, testing underway |
| `last_status_change` | DateTimeField (auto_now) | Timestamp of most recent status update. Auto-updates on every save. Useful for "how long has this machine been broken?" queries. |
| `repair_notes` | TextField (blank=True) | Repair staff logs what was done: "Replaced syrup pump, tested all dispensers, cleared error codes" |
| `installed_at` | DateTimeField (nullable) | When the machine was deployed (for maintenance scheduling) |

**How it works:**
1. Store manager notices machine making strange noise, updates status to WARNING via dashboard
2. Repair staff sees WARNING on their dashboard, schedules visit
3. On day of visit, manager updates status to REPAIR_START
4. Repair staff does work, logs notes in repair_notes
5. Repair staff updates status to REPAIR_END (testing phase)
6. Manager tests machine thoroughly
7. If all good, manager updates to NORMAL; if issues found, back to REPAIR_END or ERROR

**Dashboard filtering:**
- Repair staff dashboard: Filter to ERROR + OUT_OF_ORDER + REPAIR_START (things needing attention)
- Manager dashboard: Filter to WARNING + ERROR + OUT_OF_ORDER + REPAIR_* (operational issues)
- Logistics manager: Aggregate across regions (e.g., "Chicago: 3 machines in REPAIR, 1 in WARNING")

---

### `Schedule`

**Purpose:** Tracks repair staff work schedules. Supports the "Implement CSV schedule upload functionality" requirement from the LLD.

**Why it exists:** Repair staff need to coordinate who's available when. The UI lets staff upload a CSV of their shifts; each row becomes a Schedule record.

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `staff_user` | ForeignKey(User) | Which repair staff member this shift belongs to |
| `store_id` | IntegerField (not FK) | Which store they're assigned to this shift. IntegerField (not FK) allows flexibility for multi-store coverage. |
| `shift_start` | DateTimeField | When this shift begins |
| `shift_end` | DateTimeField | When this shift ends |
| `notes` | TextField (blank=True) | Additional info: "Available for emergency calls", "Training day, not available for repairs", etc. |
| `created_at` | DateTimeField (auto_now_add) | When this schedule was created (audit) |

**CSV upload format (example):**
```
username,store_id,shift_start,shift_end,notes
john_repair,5,2024-03-10T08:00:00,2024-03-10T17:00:00,Regular shift
john_repair,5,2024-03-11T08:00:00,2024-03-11T17:00:00,Regular shift
sarah_repair,3,2024-03-10T16:00:00,2024-03-11T00:00:00,Night shift
```

**Why IntegerField for store_id (not FK)?** A regional repair staff member might cover multiple stores. A FK would tie them to one store, limiting flexibility.

**Typical usage:**
- Repair staff uploads schedule CSV at start of month
- Hub dashboard shows all repair staff currently on shift in the region
- When a machine needs repair, dispatcher finds on-shift staff closest to the store

---

## Group 3: Staff Role Profiles

These 2 models extend Django's User model to support new staff roles without modifying the built-in User table.

### `RepairStaffProfile`

**Purpose:** Extends User with repair staff-specific attributes.

**Why it exists:** Django best practice is to use a "profile model" with OneToOneField to User when adding role-specific data. This keeps the User model clean and allows multiple roles per user (if needed later).

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `user` | OneToOneField(User) | Link back to the User. Deleting user cascades to this profile. |
| `region` | CharField(100) | Which region(s) this person covers: "Chicago", "Atlanta", etc. |
| `assigned_store_id` | IntegerField (nullable) | If assigned to a specific store, store_id. If null, covers all stores in the region. |

**How it's used:**
```python
# Check if a user is repair staff
if hasattr(user, 'repair_profile'):
    print(f"{user.username} is repair staff in {user.repair_profile.region}")

# Find all repair staff in Chicago
repair_staff = User.objects.filter(repair_profile__region='Chicago')

# Create a repair staff user
user = User.objects.create(username='john', email='john@codepop.local')
profile = RepairStaffProfile.objects.create(user=user, region='Chicago', assigned_store_id=5)
```

**Why OneToOneField?** Each user can have at most one repair_profile. If you delete the user, the profile is automatically deleted. Clean separation of concerns.

---

### `LogisticsManagerProfile`

**Purpose:** Extends User with logistics manager-specific attributes.

**Why it exists:** Logistics managers need to know which region(s) they oversee for dashboards and permissions.

**Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `user` | OneToOneField(User) | Link back to the User. |
| `region` | ForeignKey(Region, null=True) | Which region this manager oversees. FK to Region table. Nullable if manager covers all regions. |

**How it's used:**
```python
# Check if user is logistics manager
if hasattr(user, 'logistics_profile'):
    print(f"{user.username} manages {user.logistics_profile.region}")

# Logistics manager queries revenue for their region
if user.logistics_profile:
    region = user.logistics_profile.region
    # Query revenue for stores in that region
```

**Why FK to Region?** Ensures the region is valid (exists in the Region table). If region is deleted, the FK can SET_NULL, marking the manager as unassigned.

---

### SuperAdmin (Not a model)

**Why no separate SuperAdminProfile?** The existing codebase already uses Django's built-in `is_superuser=True` flag. The `views.py` uses `IsSuperUser` permission class to protect admin endpoints. Redundantly creating a SuperAdminProfile would confuse the codebase and duplicate data.

**How SuperAdmin works:**
```python
# Check if user is superuser
if user.is_superuser:
    # Allow access to nationwide dashboards, all regions, etc.
```

---

## Configuration Changes

### `codepop_backend/codepop_backend/settings.py`

**Added:**
```python
# Inter-node Authentication
INTER_NODE_SECRET = os.getenv('INTER_NODE_SECRET', '')
```

**Why?** This setting stores the shared secret used to authenticate inter-node requests in Sprint 3. When inter-node endpoints are implemented (e.g., `/api/inter-node/user-lookup/`), they validate the `Authorization: NodeToken {secret}` header against this setting.

**Why read from environment?** Each VM (store or hub) needs a different secret. The `.env` file on each VM is unique; settings.py is identical across all VMs. This pattern lets one settings.py work for all deployments.

**Default to empty string?** So Django doesn't crash if the env var is missing. If INTER_NODE_SECRET='', inter-node requests will fail (the secret won't match), which is appropriate for local dev.

---

### `codepop_backend/.env.example`

**Added:**
```
# Inter-node auth — CHANGE THIS before production
INTER_NODE_SECRET=change-this-secret-before-prod
```

**Why?** `.env.example` is the template file. When a new developer or new VM sets up the backend, they copy `.env.example` to `.env` and fill in secrets. Without this line, the new setup would have `INTER_NODE_SECRET` missing from `.env`, and inter-node communication would silently fail.

**The comment is critical:** It's a reminder that the placeholder value is not secure. Before production deployment, each VM must get a unique, strong secret (e.g., generated by `openssl rand -hex 32`).

---

## Implementation Notes

### Migration Strategy

- All 19 models were created in a single initial migration: `backend/migrations/0001_initial.py`
- Django `makemigrations` automatically detected all new models and generated the migration
- Django `migrate` applied the migration to PostgreSQL, creating all 19 tables

### Forward Compatibility

**JWT RS256 Upgrade Path (Future):**

Currently `NodeCertificate.shared_secret` stores hashed shared secrets. When upgrading to JWT RS256:

1. Add new fields to NodeCertificate (no migration needed for them if backward-compatible):
   - `private_key` (TextField)
   - `public_key` (TextField)

2. Leave `shared_secret` in place (for backward compatibility during migration)

3. Update inter-node auth code to prefer JWT if `private_key` is present, fall back to shared_secret if not

4. Gradual rollout: migrate one node at a time to JWT, old nodes still work with shared secrets

5. Once all nodes are JWT, optionally remove `shared_secret` field in a future migration

**UserCache Versioning:**

The `user_data` JSONField is flexible:
```json
// Sprint 3 format
{"user_id": 5, "email": "alice@...", "preferences": [...], "favorite_drinks": [...]}

// Future: can add more fields without schema changes
{"user_id": 5, "email": "alice@...", "preferences": [...], "favorite_drinks": [...], "reward_points": 150, "loyalty_tier": "gold"}
```

---

### Testing the Models

To verify all models are working:

```bash
# Create migrations
docker compose exec web python manage.py makemigrations

# Apply migrations
docker compose exec web python manage.py migrate

# Interactive shell test
docker compose exec web python manage.py shell
>>> from backend.models import *
>>> print(StoreRegistry.objects.count())  # Should print 0
>>> # All models are now available
```

To view in Django admin:

```bash
# Create a superuser if one doesn't exist
docker compose exec web python manage.py createsuperuser

# Visit http://localhost:8000/admin/
# Log in and browse all registered models
```

---

### Indexes & Performance

For production, consider adding database indexes on frequently-queried fields:
- `StoreRegistry.region`, `StoreRegistry.is_active`
- `UserCache.user_email`, `UserCache.expires_at`
- `Machine.store_id`, `Machine.status`
- `EventQueue.status`, `EventQueue.target_node`

These can be added in a future migration as `db_index=True` on model fields.

---

## Related Documentation

- **CurrentHighLevelDesign.md**: Big-picture architecture and vision
- **CurrentLowLevelDesign.md**: Detailed flow diagrams and protocol specifications
- **InterNodeCommunicationProtocol** (to be documented): Details of REST endpoints and message formats

