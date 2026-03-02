# DistributedSystemPrototype

A fully self-contained reference implementation of the **federated distributed architecture** described in CodePop's Low Level Design document (`LowLevelDoc.md`). This prototype demonstrates how CodePop scales from a single store to a multi-region, hub-and-spoke topology with autonomous store nodes.

**Status:** Prototype (Phase 1 & 2 from the LLD roadmap)

---

## What This Demonstrates

✅ **Store Registration & Discovery** — Stores auto-register with a regional hub on startup
✅ **Heartbeat & Fault Detection** — Stores send periodic heartbeats; hub marks unhealthy after 90s
✅ **Cross-Region User Replication** — Users seamlessly log in at unfamiliar stores via P2P lazy replication
✅ **Machine Status State Machine** — Robotic machines transition through 7 states with validated rules
✅ **Hub Broadcast Query** — Efficient discovery of which peer store has a user

❌ **Not Implemented (intentionally)** — TLS/PKI cert validation, full JWT inter-node auth, conflict resolution for concurrent updates, revenue aggregation, network partition recovery

---

## Quick Start

### Prerequisites
- Docker Desktop (with Docker Compose)
- Python 3.11+ (for running the demo script)

### Run the Entire System
```bash
cd DistributedSystemPrototype

# One-time setup: Install demo script dependencies
pip install -r requirements.txt

# Clear any previous databases (fresh start)
make reset

# Start all services (hub + 2 stores)
make up

# In another terminal, run the automated demo
python demo.py

# Or run the interactive classroom demo
python interactive_demo.py

# View container logs
make logs

# Stop everything
make down
```

**That's it!** The `make up` command automatically starts all 3 Docker containers with health checks.

**Note:** Run `make reset` before `make up` to clear old databases and start fresh. This ensures the demo tests user registration correctly.

### Interactive Demo Mode
- Launch with `make demo-interactive` (or `python interactive_demo.py`)
- Includes a guided step-by-step walkthrough and a menu mode where you can:
  - Show live hub/store health and registry state
  - Register/login users across stores
  - Demonstrate lazy replication and cache hits
  - Drive machine state transitions live

### Manual Testing
- **Hub Swagger UI:** http://localhost:5001/docs
- **Store 1 Swagger UI:** http://localhost:5002/docs
- **Store 2 Swagger UI:** http://localhost:5003/docs

---

## System Topology

```
                          ┌─────────┐
                          │   HUB   │
                          │:5001    │
                          └────┬────┘
                            /  |  \
                  ┌─────────┘   │   └──────────┐
                  │             │              │
             ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
             │ STORE 1 │   │ STORE 2 │   │ STORE N │
             │ :5002   │◄─►│ :5003   │   │ :500X   │
             └─────────┘   └─────────┘   └─────────┘
              Chicago       New Jersey     (more regions)
```

**Key Concepts:**
- **Hub**: Registry of all stores in a region; broadcasts user queries; no user/order data
- **Stores**: Autonomous, independent nodes; each has PostgreSQL/SQLite with local user/order/inventory data
- **P2P Communication**: Stores talk directly to each other (via hub-provided addresses) for user sync
- **Lazy Replication**: User data syncs ON-DEMAND when user logs into a new store (not background)

---

## Architecture Overview

### Store Startup Sequence
1. Load local SQLite database
2. Read config from environment (STORE_ID, STORE_NAME, HUB_URL, etc.)
3. POST `/api/hub/register/` → register with hub (retry exponential backoff: 1s, 2s, 4s, 8s)
4. Seed 2 sample machines (status: NORMAL)
5. Start background heartbeat task (every 30 seconds to the hub)
6. Ready for client connections

### Cross-Region User Login
```
User tries to login at Store 2:

1. Store 2 checks local DB → not found
2. Store 2 → Hub: "find user alice@example.com"
3. Hub broadcasts to all stores: "has alice@example.com?"
4. Store 1 responds: "yes, we have alice"
5. Hub → Store 2: "found at Store 1, endpoint=http://store_1:5002"
6. Store 2 → Store 1 (P2P): "send me alice's data"
7. Store 1 → Store 2: sends alice's user record
8. Store 2 caches alice locally (24-hr TTL)
9. Store 2 issues login token ✓

Next login at Store 2:
- Cache hit → no hub/peer query needed → instant login
```

### Machine Status State Machine
```
                    ┌──────────────┐
                    │    NORMAL    │◄──────────────┐
                    └──┬────────┬──┘              │
                       │        │                │
                Issue  │        │ Maintenance   │ Fixed
                Detected│        │ Needed        │
                   ┌───▼┐   ┌───▼──────────────┐│
                   │WAR │   │SCHEDULE_SERVICE  ││
                   │NIN │   └──┬──────────────┬┘│
                   └───▲┘      │              │ │
                   Resolved│   │             │ │
                       │   │   │Assign       │ │
                   Critical │   │Technician  │ │
                    Failure  │   │             │ │
                       │   │ ┌─▼──┐          │ │
                   ┌───▼───┘ │REP │          │ │
                   │ ERROR   │AIR │          │ │
                   └────┬────│STA │◄─────────┘ │
                        │    │RTS │            │
                 Complete│    └──┬┘            │
                 Failure  │       │            │
                      ┌───▼──┐   Work       │
                      │OUT   │ Completed   │
                      │OF    ├───────────┐ │
                      │ORD   │           │ │
                      │ER    │      ┌────▼─┐
                      │      │      │ REP  │
                      │      │      │ AIR  │
                      │      │      │ END  │
                      └──────┴──────┴──────┘
```

States: **NORMAL**, **WARNING**, **ERROR**, **OUT_OF_ORDER**, **SCHEDULE_SERVICE**, **REPAIR_START**, **REPAIR_END**

---

## Key Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Orchestrates hub + 2 store containers (SQLite, FastAPI) |
| `Makefile` | Commands: `make up`, `make down`, `make demo`, `make logs` |
| `demo.py` | End-to-end demo: user registration, cross-store login, machine transitions |
| `hub/` | Hub node (store registry, user discovery, heartbeat monitoring) |
| `store/` | Store node template (user auth, machine management, P2P user sync) |
| `docs/ARCHITECTURE.md` | Deep-dive: how each component maps to the Low Level Design |
| `docs/API.md` | Full API endpoint reference with request/response examples |

---

## File Structure

```
DistributedSystemPrototype/
├── README.md                     (this file)
├── docker-compose.yml            (3 containers: hub, store_1, store_2)
├── Makefile                      (helpers: up, down, demo, logs, clean)
├── demo.py                       (automated end-to-end test)
├── .gitignore
│
├── hub/                          (Regional Hub node)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app.py                    (FastAPI endpoints)
│   ├── models.py                 (StoreRegistry ORM model)
│   ├── database.py               (SQLAlchemy setup)
│   └── config.py                 (env-based config)
│
├── store/                        (Store node template)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app.py                    (FastAPI endpoints)
│   ├── models.py                 (User, Machine, UserCache ORM models)
│   ├── database.py               (SQLAlchemy setup)
│   ├── config.py                 (env-based config)
│   └── startup.py                (register with hub, seed data, heartbeat)
│
└── docs/
    ├── ARCHITECTURE.md           (detailed architecture explanation)
    └── API.md                    (endpoint reference)
```

---

## Environment Variables

### Hub (`docker-compose.yml`)
```
HUB_PORT=5001
NODE_TOKEN=supersecrettoken
```

### Store 1 (`docker-compose.yml`)
```
STORE_ID=1
STORE_NAME=CodePop Chicago #1
STORE_REGION=Chicago
STORE_PORT=5002
STORE_ENDPOINT=http://store_1:5002
HUB_URL=http://hub:5001
NODE_TOKEN=supersecrettoken
```

### Store 2 (`docker-compose.yml`)
```
STORE_ID=2
STORE_NAME=CodePop New Jersey #1
STORE_REGION=New Jersey
STORE_PORT=5003
STORE_ENDPOINT=http://store_2:5003
HUB_URL=http://hub:5001
NODE_TOKEN=supersecrettoken
```

---

## Demo Output Example

```
$ python demo.py

[Hub Health Check] GET http://localhost:5001/health
  ✓ Hub is healthy

[Hub Store Registry] GET http://localhost:5001/api/hub/stores/
  ✓ Found 2 registered stores:
    - Store 1: CodePop Chicago #1 (healthy)
    - Store 2: CodePop New Jersey #1 (healthy)

[User Registration] POST http://localhost:5002/api/auth/register/
  ✓ Registered alice@example.com at Store 1

[Local Login] POST http://localhost:5002/api/auth/login/
  ✓ Alice logged in at Store 1 (LOCAL HIT)

[Cross-Store Login] POST http://localhost:5003/api/auth/login/
  → User not found locally at Store 2
  → Querying hub for user discovery...
  → Hub broadcasting to all stores...
  → Found at Store 1!
  → Syncing user data via P2P (Store 2 ← Store 1)...
  ✓ Alice logged in at Store 2 (P2P REPLICATION)

[Cached Login] POST http://localhost:5003/api/auth/login/
  ✓ Alice logged in at Store 2 (CACHED HIT, no hub query)

[Machine State Transitions] POST http://localhost:5002/api/machines/1/update-status/
  ✓ NORMAL → WARNING
  ✓ WARNING → ERROR
  ✓ ERROR → OUT_OF_ORDER
  ✓ OUT_OF_ORDER → REPAIR_START
  ✓ REPAIR_START → REPAIR_END
  ✓ REPAIR_END → NORMAL

[Invalid Transition] POST http://localhost:5002/api/machines/1/update-status/
  ✗ NORMAL → OUT_OF_ORDER (invalid)
    Error: 422 Unprocessable Entity
    Message: Invalid transition from NORMAL to OUT_OF_ORDER

✅ All tests passed!
```

---

## Testing the System Manually

### Check Store Health
```bash
curl http://localhost:5002/health
# {"status": "ok", "store_id": 1}
```

### List Registered Stores
```bash
curl http://localhost:5001/api/hub/stores/
# [{"store_id": 1, "store_name": "CodePop Chicago #1", "is_healthy": true, ...}]
```

### Register a User
```bash
curl -X POST http://localhost:5002/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "email": "alice@example.com", "password": "secure123"}'
```

### Login
```bash
curl -X POST http://localhost:5002/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "secure123"}'
```

### List Machines
```bash
curl http://localhost:5002/api/machines/
# [{"machine_id": 1, "name": "Machine 1", "status": "NORMAL"}]
```

### Update Machine Status
```bash
curl -X POST http://localhost:5002/api/machines/1/update-status/ \
  -H "Content-Type: application/json" \
  -d '{"new_status": "WARNING"}'
```

---

## How This Maps to LowLevelDoc.md

| LLD Section | Implemented? | Notes |
|-------------|--------------|-------|
| **Hub-Store Registration** | ✅ | `/api/hub/register/` endpoint + store startup sequence |
| **Heartbeat & Timeout** | ✅ | 30s heartbeat, 90s timeout, background scheduler |
| **Store Discovery** | ✅ | `/api/hub/stores/` returns all registered stores |
| **Cross-Region User Lookup** | ✅ | `/api/hub/find-user/` broadcasts to all stores |
| **Lazy User Replication** | ✅ | On-demand sync via `/api/inter-node/user-sync/` |
| **24-hr User Cache** | ✅ | Cached data tracked with timestamp |
| **Machine Status State Machine** | ✅ | All 7 states + validated transitions |
| **Inter-node Auth** | ⚠️ | Simplified: shared NodeToken header (not full JWT) |
| **TLS/Encryption** | ❌ | Not included (assumed in production) |
| **Conflict Resolution** | ❌ | Single-user demo; not exercised |
| **Revenue Aggregation** | ❌ | Out of scope for Phase 1 |

---

## Troubleshooting

### Containers won't start
```bash
# Check Docker is running
docker ps

# View logs
make logs

# Hard reset
make down
docker system prune -a
make up
```

### Port already in use
Edit `docker-compose.yml` to use different ports (e.g., 5011, 5012, 5013)

### Hub not responding
- Check hub container: `docker ps | grep hub`
- Check logs: `docker logs {container_id}`
- Ensure NODE_TOKEN matches in docker-compose.yml

### Can't reach Swagger UI
- Hub: http://localhost:5001/docs
- Store 1: http://localhost:5002/docs
- Store 2: http://localhost:5003/docs
- If not responding, check `make logs`

---

## Clean Up

```bash
# Stop and remove containers
make down

# Remove Docker images
docker rmi distributed-prototype-hub distributed-prototype-store

# Remove database files
find . -name "*.db" -delete
```

---

## Next Steps for Full Implementation

If implementing the full 4-phase architecture from the LLD:

1. **Phase 3: Data Replication & Consistency**
   - Implement conflict resolution (last-write-wins)
   - Implement preference merge (union for favorite drinks)

2. **Phase 4: Resilience & Operations**
   - Implement hub failover to backup hubs
   - Implement network partition detection + queue-and-reconcile pattern
   - Implement machine status push notifications

3. **Production Hardening**
   - Add TLS/SSL with proper certificate validation
   - Replace shared NodeToken with JWT (RS256) signing
   - Add comprehensive error logging + monitoring
   - Add rate limiting and request validation
   - Add database connection pooling
   - Add Celery + Redis for async tasks

---

## References

- **Low Level Design Document:** `../LowLevelDoc.md`
- **Architecture Deep-Dive:** `docs/ARCHITECTURE.md`
- **API Reference:** `docs/API.md`

---

**Created:** 2026-03-01
**Last Updated:** 2026-03-01
**Status:** Prototype (Phase 1 & 2)
