# CodePop Distributed P2P Architecture (PLAN2)

**Date:** 2026-03-14
**Status:** Fresh implementation (Sprint 3 rewrite)

## Architecture Overview

CodePop uses a **P2P hub-and-spoke distributed system** with no master hub:

- **7 Regional Hubs**: Form a mesh (`PEER_HUB_URLS`), peer-to-peer for cross-region discovery
- **~50 Stores**: Each registers with one upstream hub (`UPSTREAM_HUB_URL`)
- **P2P After Discovery**: After hub tells Store A where Store B is, A communicates directly with B
- **Database-per-Store**: Each store/hub runs independent Django + PostgreSQL + Redis
- **Lazy Replication**: User data syncs on-demand when users visit new stores (eventual consistency)
- **Local Data Never Replicates**: Orders, inventory, revenue, notifications, machine status stay local

---

## Node Types

### Hub (NODE_ROLE=hub)
- Regional coordinator
- Tracks stores in its region via `StoreNode`
- Maintains user location routing via `UserLocationCache`
- Responds to hub-mesh queries from peer hubs
- Environment: `STORE_ID=0`, `PEER_HUB_URLS=...`, no `UPSTREAM_HUB_URL`

### Store (NODE_ROLE=store)
- Customer-facing node
- Registers with upstream hub on startup
- Sends heartbeat every 30s
- Queues outbound events in `EventQueue` for hub/peer delivery
- Can discover and contact peer stores directly via hub

---

## Database Models

### Infrastructure (5 models)
- **StoreNode**: Hub's knowledge of registered stores (store_id, region, api_endpoint, is_active, last_heartbeat)
- **UserLocationCache**: Maps email→home_store_id for user routing (24h TTL visiting, 10yr home)
- **VisitingSession**: Links local DRF Token to JWT from home store (preferences, favorites, profile)
- **EventQueue**: Outbound async events for Celery (user_sync, heartbeat, status_update) with retry backoff
- **SyncLog**: Audit trail of all inter-node events

### Features (7 models)
- **Region**: Regional metadata with hub_api_endpoint
- **SupplyHub**: Regional supply hub info and inventory notes
- **Machine**: Robotic machine with 7-state state machine (NORMAL, WARNING, ERROR, OUT_OF_ORDER, SCHEDULE_SERVICE, REPAIR_START, REPAIR_END)
- **Schedule**: Repair staff shifts (CSV upload ready)
- **RepairStaffProfile**: OneToOne User extension (region, assigned_store_id)
- **LogisticsManagerProfile**: OneToOne User extension (region FK)
- **SupplyRequest**: Store→hub supply requests (pending/approved/denied/fulfilled)

### Original (6 models, unchanged)
- Preference, Drink, Inventory, Notification, Order, Revenue

---

## Authentication

**Inter-Node Auth:** `Authorization: NodeToken {INTER_NODE_SECRET}` (all nodes use same global secret)
**Visiting User Auth:** JWT (HS256-signed by home store, 24h TTL)
**Client Auth:** Django REST Framework tokens (DRF TokenAuthentication)

---

## API Endpoints

### Hub Registration & Discovery (stores call hubs)
```
POST   /backend/hub/register/              — Register store; get sibling list
POST   /backend/hub/heartbeat/             — Update last_heartbeat
GET    /backend/hub/stores/                — List active stores in region
GET    /backend/hub/user-location/         — Find user's home store (broadcasts to peers if not found)
```

### Hub-Mesh (hubs call hubs)
```
GET    /backend/hub-mesh/user-location/    — Answer with local UserLocationCache only
```

### Inter-Node (any node to any node)
```
POST   /backend/internode/health-check/    — Ping/pong (returns node_id, is_hub, region)
POST   /backend/internode/verify-credentials/ — Verify user password; return JWT
POST   /backend/internode/user-data/       — Pull full user profile+prefs+favorites
POST   /backend/internode/user-sync/       — Notify hub of user's home store
POST   /backend/internode/status-update/   — Push Machine status to hub
```

---

## User Login Flow (Distributed)

### Home User (logs in at their store)
1. Client: POST `/backend/auth/login/` with email + password
2. Store: Try local Django auth → Success
3. Store: Return DRF token

### Visiting User (logs in at different store)
1. Client: POST `/backend/auth/login/` at Store B with email + password
2. Store B: Try local auth → Fail
3. Store B: Check `UserLocationCache` for email
4. Not found locally → GET `{UPSTREAM_HUB_URL}/backend/hub/user-location/?email=...`
5. Hub: Check local cache → if not found, broadcast to `PEER_HUB_URLS` for cross-region
6. Store B receives home store info (Store A, region Logan)
7. Store B: P2P POST to `{Store A endpoint}/backend/internode/verify-credentials/` with password
8. Store A: Verify password; return JWT (expires 24h) with preferences, favorites, profile
9. Store B: Create shadow User + VisitingSession (links DRF Token to JWT)
10. Client: Return DRF token → User logs in at Store B with visiting session

---

## Celery Tasks

### register_with_hub (on startup, stores only)
- POST to hub `/backend/hub/register/`
- Exponential backoff (2^n seconds, capped 300s)
- No max_retries (runs until success)

### heartbeat (every 30s, stores only)
- POST to hub `/backend/hub/heartbeat/`
- Updates `StoreNode.last_heartbeat`

### drain_event_queue (every 10s, all nodes)
- Process pending EventQueue items
- Exponential backoff on failure (max 10 attempts)
- Logs success/failure to SyncLog

### check_dead_nodes (every 2min, hubs only)
- Mark StoreNode inactive if last_heartbeat > 5min or never heartbeated after 5+ min
- Stores skip (IS_HUB=False)

---

## Configuration (.env variables)

```bash
# Node identity
STORE_ID=0                    # Unique per node (0=hub, 1-N=stores)
STORE_NAME="Logan Hub"        # Display name
REGION="logan"                # Region code
API_ENDPOINT="http://..."     # This node's public URL
NODE_ROLE="hub"               # 'hub' or 'store'

# Hub-only
PEER_HUB_URLS="http://...,http://..."

# Store-only
UPSTREAM_HUB_URL="http://..."

# All nodes in distributed mode
INTER_NODE_SECRET="..."       # Shared secret for inter-node auth
```

---

## Key Design Principles

1. **No Master Hub**: All hubs are peers. Hub-mesh for cross-region discovery.
2. **Store Autonomy**: Each store operates independently during hub/network outages.
3. **Local-First**: Orders, inventory, revenue, machine status never leave the local database.
4. **Lazy Replication**: User data syncs on-demand, not broadcast.
5. **Eventual Consistency**: UserCache may be slightly stale; acceptable for user routing.
6. **State Machine Safety**: Machine status transitions validated on every update.
7. **Resilient EventQueue**: Celery retries with exponential backoff; no delivery loss.

---

## Testing (GCP_Distributed_Testing_Guide.md)

1. **Phase 1**: Health checks (6 nodes respond)
2. **Phase 2**: Store auto-registration (hubs see stores)
3. **Phase 3**: User registration (Alice created at Store 1)
4. **Phase 4**: Hub user-sync (Logan Hub finds Alice)
5. **Phase 4b**: Hub-mesh cross-region (Atlanta Hub finds Alice)
6. **Phase 5**: Inter-node lookup (Store 2 finds Alice)
7. **Phase 6**: Visiting user login (Alice logs in at Store 2)
8. **Phase 8**: Duplicate email blocking (same region + cross-region)
9. **Phase 9-12**: Region independence & symmetric discovery

---

## Files Modified (Sprint 3 Rewrite)

| File | Changes |
|------|---------|
| `models.py` | Removed 14 old Sprint 3 models; added 12 clean models (StoreNode, UserLocationCache, VisitingSession, EventQueue, SyncLog, Region, SupplyHub, Machine, Schedule, RepairStaffProfile, LogisticsManagerProfile, SupplyRequest) |
| `internode_auth.py` | Full rewrite: NodeTokenAuthentication, IsInterNodeRequest, IsHubRequest, jwt_sign, jwt_verify |
| `middleware.py` | Deleted entirely (no NodeIdentityMiddleware needed) |
| `tasks.py` | Full rewrite: register_with_hub, heartbeat, drain_event_queue, check_dead_nodes |
| `views.py` | Remove ~1,600 lines of distributed logic; keep Sprint 1-2 views; add clean hub/internode views |
| `urls.py` | Clean up URL patterns for new endpoints |
| `serializers.py` | Update email validation (check hub non-blocking) |
| `settings.py` | Remove old settings; add clean STORE_ID, REGION, NODE_ROLE, UPSTREAM_HUB_URL, IS_HUB, PEER_HUB_URLS, INTER_NODE_SECRET |
| `migrations/` | Delete 0001_initial.py; regenerate |

---

## Next Steps

1. ✅ Create clean models
2. ✅ Update settings
3. ✅ Rewrite internode_auth.py
4. ✅ Rewrite tasks.py
5. 🔄 Clean views.py (remove distributed views, keep Sprint 1-2, add new hub/internode)
6. 🔄 Clean urls.py
7. 🔄 Clean serializers.py
8. ✅ Regenerate migrations
9. 🔄 Test locally (docker-compose up)
10. 🔄 Deploy to GCP VMs
11. 🔄 Run GCP_Distributed_Testing_Guide phases
