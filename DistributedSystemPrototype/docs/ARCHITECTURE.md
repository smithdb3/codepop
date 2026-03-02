# Architecture Documentation

This document explains the distributed system prototype's architecture and how it maps to CodePop's Low Level Design Document.

---

## Table of Contents

1. [Hub Node Architecture](#hub-node-architecture)
2. [Store Node Architecture](#store-node-architecture)
3. [Communication Flows](#communication-flows)
4. [Startup Sequence](#startup-sequence)
5. [Lazy User Replication](#lazy-user-replication)
6. [Machine State Machine](#machine-state-machine)
7. [Heartbeat & Fault Detection](#heartbeat--fault-detection)
8. [Design Decisions](#design-decisions)

---

## Hub Node Architecture

### Purpose
The hub is a **centralized registry** for a region. It tracks which stores are operational and helps stores discover each other and find users.

**Key Principle:** The hub holds **no user data, order data, or inventory**. It only maintains a list of which stores are alive and where they are located.

### Models

**StoreRegistry Table:**
```python
class StoreRegistry(Base):
    __tablename__ = "store_registry"

    store_id: int (PK)
    store_name: str
    region: str
    api_endpoint: str          # e.g., "http://store_1:5002"
    last_heartbeat: datetime   # when store last sent heartbeat
    is_healthy: bool           # false if last_heartbeat > 90 seconds ago
```

### Endpoints

#### Health Check
```
GET /health
200 OK
{
  "status": "ok",
  "node": "hub"
}
```

#### Store Registration
```
POST /api/hub/register/
Authorization: NodeToken supersecrettoken

{
  "store_id": 1,
  "store_name": "CodePop Chicago #1",
  "region": "Chicago",
  "api_endpoint": "http://store_1:5002"
}

201 Created
{
  "store_id": 1,
  "store_name": "CodePop Chicago #1",
  "is_healthy": true,
  "last_heartbeat": "2026-03-01T12:34:56Z"
}
```

#### Heartbeat
```
POST /api/hub/heartbeat/
Authorization: NodeToken supersecrettoken

{
  "store_id": 1
}

200 OK
{
  "status": "heartbeat_received"
}
```

#### List Stores
```
GET /api/hub/stores/

200 OK
[
  {
    "store_id": 1,
    "store_name": "CodePop Chicago #1",
    "region": "Chicago",
    "api_endpoint": "http://store_1:5002",
    "is_healthy": true,
    "last_heartbeat": "2026-03-01T12:34:56Z"
  },
  {
    "store_id": 2,
    "store_name": "CodePop New Jersey #1",
    "region": "New Jersey",
    "api_endpoint": "http://store_2:5003",
    "is_healthy": true,
    "last_heartbeat": "2026-03-01T12:34:55Z"
  }
]
```

#### Find User
```
POST /api/hub/find-user/
Authorization: NodeToken supersecrettoken

{
  "email": "alice@example.com"
}

Internally: Hub queries all healthy stores via:
POST /api/inter-node/user-lookup/ (to each store)

If found:
200 OK
{
  "status": "found",
  "store_id": 1,
  "api_endpoint": "http://store_1:5002",
  "user_data": {
    "user_id": 5,
    "email": "alice@example.com",
    "username": "alice"
  }
}

If not found:
404 Not Found
{
  "status": "not_found",
  "message": "User not found in any store"
}
```

#### Store Location
```
GET /api/hub/store-location/?store_id=1
Authorization: NodeToken supersecrettoken

200 OK
{
  "store_id": 1,
  "api_endpoint": "http://store_1:5002"
}
```

### Background Task: Heartbeat Timeout Checker

**Runs every 30 seconds:**
```python
def check_heartbeat_timeouts():
    current_time = datetime.utcnow()
    timeout_threshold = 90  # seconds

    for store in StoreRegistry.query.all():
        elapsed = (current_time - store.last_heartbeat).total_seconds()
        if elapsed > timeout_threshold:
            store.is_healthy = False
            db.session.commit()
            log(f"Store {store.store_id} marked unhealthy (no heartbeat for {elapsed}s)")
```

---

## Store Node Architecture

### Purpose
Each store runs a complete, autonomous instance of the CodePop backend. It handles:
- User authentication & registration
- Order creation and processing
- Inventory management
- Machine status tracking

**Key Principle:** Stores are **independent**. They continue operating even if the hub is unavailable. Data is **local** (never automatically replicated).

### Models

**User Table:**
```python
class User(Base):
    __tablename__ = "users"

    user_id: int (PK)
    username: str (unique)
    email: str (unique)
    password_hash: str
    is_staff: bool
    is_superuser: bool
    home_store_id: int          # store where user originally registered
    created_at: datetime
```

**UserCache Table:**
```python
class UserCache(Base):
    __tablename__ = "user_cache"

    id: int (PK)
    email: str (unique)
    user_data: JSON             # full user record (serialized)
    cached_at: datetime         # when was this cached?
```

**Machine Table:**
```python
class Machine(Base):
    __tablename__ = "machines"

    machine_id: int (PK)
    name: str
    status: str                 # one of: NORMAL, WARNING, ERROR, OUT_OF_ORDER, SCHEDULE_SERVICE, REPAIR_START, REPAIR_END
    last_status_update: datetime
```

**Order Table (simplified for demo):**
```python
class Order(Base):
    __tablename__ = "orders"

    order_id: int (PK)
    user_id: int (FK)
    items: str                  # JSON list of drinks
    status: str                 # pending, processing, completed
    created_at: datetime
```

### Endpoints

#### Health Check
```
GET /health

200 OK
{
  "status": "ok",
  "store_id": 1,
  "store_name": "CodePop Chicago #1"
}
```

#### User Registration
```
POST /api/auth/register/

{
  "username": "alice",
  "email": "alice@example.com",
  "password": "SecurePassword123!"
}

201 Created
{
  "user_id": 5,
  "username": "alice",
  "email": "alice@example.com",
  "token": "abcd1234efgh5678..."
}
```

#### User Login
```
POST /api/auth/login/

{
  "email": "alice@example.com",
  "password": "SecurePassword123!"
}

Flow:
1. Check local User table
2. If found: return token ✓
3. If not found: query hub for user discovery
   → Hub broadcasts to all stores
   → One store responds with user location
   → This store P2P syncs user data
   → Cache user locally
   → Return token ✓

200 OK
{
  "user_id": 5,
  "token": "abcd1234efgh5678...",
  "username": "alice",
  "email": "alice@example.com",
  "location": "local" | "replicated"  # indicates if user was found locally or synced
}

401 Unauthorized
{
  "error": "Invalid credentials"
}
```

#### List Users
```
GET /api/users/

200 OK
[
  {
    "user_id": 5,
    "username": "alice",
    "email": "alice@example.com",
    "home_store_id": 1,
    "created_at": "2026-03-01T12:00:00Z"
  }
]
```

#### List Machines
```
GET /api/machines/

200 OK
[
  {
    "machine_id": 1,
    "name": "Machine 1",
    "status": "NORMAL",
    "last_status_update": "2026-03-01T12:34:56Z"
  },
  {
    "machine_id": 2,
    "name": "Machine 2",
    "status": "WARNING",
    "last_status_update": "2026-03-01T12:30:00Z"
  }
]
```

#### Update Machine Status
```
POST /api/machines/{machine_id}/update-status/

{
  "new_status": "WARNING"
}

Validation: Checks that transition is valid per state machine.

200 OK
{
  "machine_id": 1,
  "name": "Machine 1",
  "status": "WARNING",
  "last_status_update": "2026-03-01T12:35:00Z"
}

422 Unprocessable Entity (invalid transition)
{
  "detail": "Invalid transition from NORMAL to OUT_OF_ORDER. Valid transitions: ['WARNING', 'SCHEDULE_SERVICE']"
}
```

#### Inter-Node: User Lookup
```
POST /api/inter-node/user-lookup/
Authorization: NodeToken supersecrettoken

{
  "email": "alice@example.com"
}

If found:
200 OK
{
  "status": "found",
  "user": {
    "user_id": 5,
    "username": "alice",
    "email": "alice@example.com"
  }
}

If not found:
404 Not Found
{
  "status": "not_found"
}
```

#### Inter-Node: User Sync
```
POST /api/inter-node/user-sync/
Authorization: NodeToken supersecrettoken

{
  "user_id": 5,
  "username": "alice",
  "email": "alice@example.com",
  "password_hash": "pbkdf2_sha256$..."
}

Stores user in local database and caches.

200 OK
{
  "status": "synced",
  "user_id": 5
}
```

#### Inter-Node: Health Check
```
POST /api/inter-node/health-check/

200 OK
{
  "status": "ok",
  "store_id": 1
}
```

### Startup Sequence

**Implemented in `startup.py` — runs before FastAPI starts accepting requests:**

```
1. [Database] Connect to SQLite at /app/data/store.db
   - Create tables if missing
   - Verify schema

2. [Config] Load environment variables
   - STORE_ID, STORE_NAME, STORE_REGION
   - STORE_ENDPOINT, HUB_URL, NODE_TOKEN

3. [Hub Registration] POST {HUB_URL}/api/hub/register/
   Retry strategy (exponential backoff):
   - Attempt 1: wait 1s
   - Attempt 2: wait 2s
   - Attempt 3: wait 4s
   - Attempt 4: wait 8s
   - If all fail: log warning, continue (cached registry will be used)

4. [Seed Data] Create 2 sample machines with status NORMAL
   - Machine 1, Machine 2

5. [Background Heartbeat] Start APScheduler task
   - Every 30 seconds: POST {HUB_URL}/api/hub/heartbeat/
   - Log failures but don't crash

6. [Ready] FastAPI app starts listening on STORE_PORT
   - Log "Store startup complete"
   - Accept client connections
```

---

## Communication Flows

### Flow 1: Store Startup & Registration

```
Store 1 Container Starts
        │
        ├─ Load config from environment
        ├─ Connect to SQLite
        ├─ POST /api/hub/register/ ──────────────────────► Hub
        │          {store_id, name, endpoint}
        │                                     ◄──────────────── 201 Created
        │                         (StoreRegistry row created)
        ├─ Seed 2 machines
        └─ Start background heartbeat task (30s interval)
                Every 30s: POST /api/hub/heartbeat/ ──────► Hub
                                                ◄──────────── 200 OK
```

### Flow 2: Local User Login

```
Client (curl / mobile app)
    │
    ├─ POST /api/auth/login/
    │  {email, password}
    │                          ────────────────► Store 1
    │                                    │
    │                                    ├─ Query User table
    │                                    │  WHERE email = "alice@example.com"
    │                                    │
    │                                    ├─ Found! ✓
    │                                    │
    │                                    └─ Generate token
    │                          ◄──────────────── 200 OK
    │                             {token, user_id}
    │
    └─ (Login successful)
```

### Flow 3: Cross-Store User Discovery & Replication

```
Client
    │
    ├─ POST /api/auth/login/
    │  {email: alice@example.com, password: ...}
    │                          ────────────────► Store 2 (New Jersey)
    │                                    │
    │                                    ├─ Query local User table
    │                                    │  (alice not found)
    │                                    │
    │                                    ├─ POST /api/hub/find-user/
    │                                    │  {email}
    │                          ┌──────────────► Hub
    │                          │         │
    │                          │         ├─ Get all healthy stores
    │                          │         │  [Store 1, Store 2]
    │                          │         │
    │                          │         ├─ POST /api/inter-node/user-lookup/
    │                          │         │  ────────────────► Store 1 ◄─── Broadcast to all
    │                          │         │
    │                          │         │  "alice found at Store 1" ◄─────────┐
    │                          │         │                                   │
    │                          │  ◄──────────────────────────────────────────┘
    │                          │  {status: found, store_id: 1, api_endpoint}
    │
    │                    ┌─────────────────────────────────────────────┐
    │                    │ P2P Communication (Store 2 ← Store 1)      │
    │                    │                                             │
    │                    ├─ POST /api/inter-node/user-sync/          │
    │                    │  {user_data}                               │
    │                    │  ────────────────► Store 1                │
    │                    │                            │                │
    │                    │                            ├─ Get user     │
    │                    │                            │   from DB     │
    │                    │                            │                │
    │                    │                    ◄──────────── 200 OK    │
    │                    │                       {user_data}         │
    │                    │                                             │
    │                    └─────────────────────────────────────────────┘
    │
    │                          ◄──────────────── Store 2
    │                           ├─ Save user to local User table
    │                           ├─ Save to UserCache (cached_at = now)
    │                           └─ Generate token
    │                              {token, location: "replicated"}
    │
    └─ (Login successful, user replicated)


On Next Login at Store 2:
    │
    ├─ POST /api/auth/login/
    │  {email: alice@example.com, ...}
    │                          ────────────────► Store 2
    │                                    │
    │                                    ├─ Query User table
    │                                    │  (alice found locally!)
    │                                    │
    │                                    ├─ Check UserCache
    │                                    │  (cached < 24 hours? YES)
    │                                    │
    │                                    └─ Generate token
    │                                       (no hub query needed)
    │                          ◄──────────────── 200 OK
    │
    └─ (CACHED HIT - instant login)
```

### Flow 4: Machine Status Update

```
Manager (via mobile app or curl)
    │
    ├─ POST /api/machines/1/update-status/
    │  {new_status: "WARNING"}
    │                          ────────────────► Store 1
    │                                    │
    │                                    ├─ Get current status from DB
    │                                    │  (currently NORMAL)
    │                                    │
    │                                    ├─ Check state machine rules
    │                                    │  NORMAL → WARNING ?
    │                                    │  Valid? YES ✓
    │                                    │
    │                                    ├─ Update Machine row
    │                                    │  status = "WARNING"
    │                                    │  last_status_update = now
    │                                    │
    │                                    └─ Generate event/alert
    │                          ◄──────────────── 200 OK
    │                             {machine_id, status, ...}
    │
    └─ (Status updated)


Invalid Transition Example:
    │
    ├─ POST /api/machines/1/update-status/
    │  {new_status: "OUT_OF_ORDER"}  (current: NORMAL)
    │                          ────────────────► Store 1
    │                                    │
    │                                    ├─ Check state machine rules
    │                                    │  NORMAL → OUT_OF_ORDER ?
    │                                    │  Valid? NO ✗
    │                                    │
    │                          ◄──────────────── 422 Unprocessable Entity
    │                             {detail: "Invalid transition..."}
    │
    └─ (Status NOT updated)
```

---

## Lazy User Replication

### Concept (from LLD)

**Problem:** Replicating millions of users to thousands of stores is prohibitively expensive.

**Solution:** Lazy replication — user data syncs **on-demand** when user logs in at a new store.

### Timeline

```
Day 1, Store 1 (Home):
  ├─ alice registers at Store 1
  ├─ User saved: home_store_id = 1
  └─ Alice logs in successfully (local hit)

Day 3, Store 2 (New Region):
  ├─ alice travels to New Jersey
  ├─ alice tries to login at Store 2
  ├─ Store 2: not found locally
  ├─ Store 2 → Hub → Store 1: "where is alice?"
  ├─ Found! Store 1 transfers alice's data via P2P
  ├─ Store 2: alice cached locally (cached_at = now)
  └─ alice logs in successfully (P2P hit)

Day 3-4, Store 2 (Repeated visits):
  ├─ alice logs in again at Store 2
  ├─ Store 2: found in local cache
  ├─ Cache age < 24 hours? YES
  └─ No hub/peer queries needed (instant login, cached hit)

Day 5+:
  ├─ If alice updates preferences at any store
  ├─ That change is local to that store
  ├─ Other stores won't auto-sync the change
  ├─ Next login at another store uses cached version
  ├─ Eventually cache expires (24-hr TTL)
  └─ Next login after expiry will re-fetch from home store
```

### UserCache Expiration

```python
# In login endpoint
user_cache = UserCache.query.filter_by(email=email).first()

if user_cache:
    age = (datetime.utcnow() - user_cache.cached_at).total_seconds()
    if age < 86400:  # 86400 = 24 hours
        # Cache hit: use cached data
        return {"token": token, "location": "cached"}
    else:
        # Cache expired: delete cache entry
        db.session.delete(user_cache)
        db.session.commit()
        # Fall through to hub discovery below
```

---

## Machine State Machine

### Valid States

| State | Meaning | Transitions From | Transitions To |
|-------|---------|------------------|----------------|
| **NORMAL** | Operational, all systems nominal | WARNING, ERROR, REPAIR_END | WARNING, SCHEDULE_SERVICE |
| **WARNING** | Minor issue detected, monitoring increased | NORMAL | NORMAL, ERROR |
| **ERROR** | Critical failure, order intake paused | WARNING, REPAIR_END | NORMAL, OUT_OF_ORDER |
| **OUT_OF_ORDER** | Machine non-functional | ERROR | REPAIR_START |
| **SCHEDULE_SERVICE** | Routine maintenance scheduled | NORMAL | REPAIR_START |
| **REPAIR_START** | Technician on-site, service in progress | OUT_OF_ORDER, SCHEDULE_SERVICE | REPAIR_END |
| **REPAIR_END** | Repair completed, testing underway | REPAIR_START | NORMAL, ERROR |

### ASCII State Machine Diagram

```
                  ┌──────────────────────────┐
                  │        NORMAL            │◄────────────────────────────┐
                  │   (default, operational) │                             │
                  └──┬──────────────────────┬┘                             │
                     │                      │                              │
        Issue        │                      │ Maintenance                 Fixed
        Detected     │                      │ Needed                      │
           │         │                      │ │                          │
        ┌──▼─┐   ┌───▼──────────────────────┘ │                          │
        │WAR │   │SCHEDULE_SERVICE            │                          │
        │NIN │   │                            │                          │
        │G   │   └─────────┬──────────────────┘                          │
        └────┘ Resolved    │                                             │
           ▲               │Assign                                       │
           │               │Technician                                  │
        Critical │          │                                             │
        Failure  │    ┌─────▼────┐                                      │
                 │    │REPAIR    │                                      │
                 │    │START     │                                      │
                 │    └─────┬────┘                                      │
                 │          │                                            │
                 │    Work  │                                           │
                 │   Completed                                          │
            ┌────┴──┐       │                                            │
            │ ERROR │      ┌▼────────────────────┐                      │
            │       │      │  REPAIR_END         │                      │
            └────┬──┘      │  (testing underway) │                      │
                 │         └──────┬──────────────┘                       │
         Complete│              Testing Passed / Issues Found            │
         Failure  │              │                     │                 │
                  │              │                 ┌───┘                 │
                  │              │                 │                     │
                  │         ┌────▼──────┐          │                     │
                  │         │ NORMAL ✓  │◄─────────┴─────────────────────┘
                  │         │(go back) │
                  └────────►└────┬──────┘
                                 │
                          ┌──────▼──┐
                          │OUT_OF   │
                          │ORDER    │
                          └─────────┘
```

### Implementation

```python
VALID_TRANSITIONS = {
    "NORMAL":           ["WARNING", "SCHEDULE_SERVICE"],
    "WARNING":          ["NORMAL", "ERROR"],
    "ERROR":            ["NORMAL", "OUT_OF_ORDER"],
    "OUT_OF_ORDER":     ["REPAIR_START"],
    "SCHEDULE_SERVICE": ["REPAIR_START"],
    "REPAIR_START":     ["REPAIR_END"],
    "REPAIR_END":       ["NORMAL", "ERROR"],
}

@app.post("/api/machines/{machine_id}/update-status/")
def update_machine_status(machine_id: int, request: UpdateStatusRequest):
    machine = Machine.query.get(machine_id)

    if not machine:
        return {"error": "Machine not found"}, 404

    current_status = machine.status
    new_status = request.new_status

    # Validate transition
    if new_status not in VALID_TRANSITIONS.get(current_status, []):
        valid = VALID_TRANSITIONS.get(current_status, [])
        return {
            "error": f"Invalid transition from {current_status} to {new_status}",
            "valid_transitions": valid
        }, 422

    # Apply transition
    machine.status = new_status
    machine.last_status_update = datetime.utcnow()
    db.session.commit()

    return machine.to_dict()
```

---

## Heartbeat & Fault Detection

### Heartbeat Mechanism

**Store-side (background task, every 30 seconds):**
```python
@scheduler.scheduled_job('interval', seconds=30)
def send_heartbeat():
    try:
        response = requests.post(
            f"{HUB_URL}/api/hub/heartbeat/",
            json={"store_id": STORE_ID},
            headers={"Authorization": f"NodeToken {NODE_TOKEN}"},
            timeout=5
        )
        if response.status_code == 200:
            logger.info(f"Heartbeat sent successfully")
        else:
            logger.warning(f"Hub responded with {response.status_code}")
    except Exception as e:
        logger.error(f"Heartbeat failed: {e}")
        # Continue operating (don't crash)
```

**Hub-side (background task, every 30 seconds):**
```python
@scheduler.scheduled_job('interval', seconds=30)
def check_heartbeat_timeouts():
    current_time = datetime.utcnow()
    timeout_threshold = 90  # seconds

    for store in StoreRegistry.query.all():
        elapsed = (current_time - store.last_heartbeat).total_seconds()
        if elapsed > timeout_threshold and store.is_healthy:
            store.is_healthy = False
            db.session.commit()
            logger.warning(
                f"Store {store.store_id} marked unhealthy "
                f"(no heartbeat for {elapsed:.0f}s)"
            )
```

### Timeout Detection Timeline

```
T=0s:    Store sends heartbeat → Hub updates last_heartbeat to T=0
T=30s:   Store sends heartbeat → Hub updates last_heartbeat to T=30
T=60s:   Store sends heartbeat → Hub updates last_heartbeat to T=60
T=90s:   [Hub timeout check runs]
         elapsed = 90 - 60 = 30 seconds
         30 < 90 (timeout threshold) → Store still marked HEALTHY
T=120s:  [Hub timeout check runs]
         elapsed = 120 - 60 = 60 seconds
         60 < 90 → Store still marked HEALTHY
T=150s:  [Hub timeout check runs]
         elapsed = 150 - 60 = 90 seconds
         90 >= 90 → Store marked UNHEALTHY ✗
         Hub stops including this store in broadcasts
T=180s:  Store should be marked unhealthy
```

### Failure Handling

**If a store is marked unhealthy:**
- Hub's `/api/hub/find-user/` ignores it in broadcasts
- Other stores won't try to discover users from this store
- Store continues operating locally (doesn't know it's marked unhealthy)
- When store recovers and sends next heartbeat → Hub marks `is_healthy=True`

---

## Design Decisions

### Why SQLite for Stores?

**Chosen over PostgreSQL in containers because:**
- Simpler deployment (one file per node, no separate DB container)
- Fully self-contained (can move folder anywhere)
- Good enough for demonstration/learning
- Production would use PostgreSQL

### Why Shared NodeToken Instead of Full JWT?

**Chosen for simplicity because:**
- Demonstrates the concept without PKI complexity
- Real implementation would use JWT with RS256 (node signs with private key)
- Avoids certificate generation and rotation complexity
- Still provides node-to-node authentication

### Why Hub Has No Persistent Storage of User Data?

**By design (from LLD):**
- User data is **local** to each store
- Hub only tracks which stores are alive
- Eliminates need to replicate 10M+ users to thousands of stores
- Hub is stateless (could be replicated for HA)

### Why 24-Hour User Cache?

**Tradeoff decision:**
- Stores users at new locations for performance (no hub query on every login)
- But don't keep stale data forever (24-hr expiration)
- Could be configured per deployment (e.g., 48 hours, 7 days)

### Why Heartbeat Every 30 Seconds?

**Tradeoff decision:**
- More frequent = better fault detection (detect failures faster)
- Less frequent = lower network overhead
- 30s is reasonable: detects failures in 60-120 seconds total
- Production might use 10s for faster detection + aggressive retry logic

### Why 90-Second Timeout?

**Chosen because:**
- Allows transient network issues (dropped packets, etc.)
- 3 missed heartbeats = 90 seconds (30s × 3)
- Avoids false positives from temporary network hiccups
- Production might use different thresholds (e.g., 2 × heartbeat interval)

---

## Mapping to LowLevelDoc.md

| LLD Section | Implementation | Notes |
|-------------|----------------|-------|
| **Hub-Store Registration** | `/api/hub/register/` POST endpoint | Stores StoreRegistry row |
| **Heartbeat & Timeout** | Background scheduler tasks | 30s interval, 90s timeout |
| **Store Discovery** | `/api/hub/stores/` GET endpoint | Lists all registered stores |
| **Cross-Region User Lookup** | `/api/hub/find-user/` POST endpoint | Broadcasts to all healthy stores |
| **Lazy Replication** | `/api/inter-node/user-sync/` POST | On-demand P2P user data transfer |
| **24-hr Cache** | UserCache table + age check | Tracked in database |
| **Machine State Machine** | VALID_TRANSITIONS dict + validation | All 7 states, validated transitions |
| **Inter-node Auth** | Authorization: NodeToken header | Simplified (not JWT) |

---

**Created:** 2026-03-01
