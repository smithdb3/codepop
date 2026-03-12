# GCP Distributed System: Testing Guide

**Purpose:** Verify all 6 GCP VMs are functioning correctly as a distributed system.

**Topology:**
```
Logan Master Hub  (IS_MASTER=True,  IS_HUB=True,  HUB_URL=empty)
├── Logan Store 1 (IS_MASTER=False, IS_HUB=False, HUB_URL=<LOGAN_HUB_IP>:8000)
├── Logan Store 2 (IS_MASTER=False, IS_HUB=False, HUB_URL=<LOGAN_HUB_IP>:8000)
└── Atlanta Hub   (IS_MASTER=False, IS_HUB=True,  HUB_URL=<LOGAN_HUB_IP>:8000)
    ├── Atlanta Store 1 (IS_MASTER=False, IS_HUB=False, HUB_URL=<ATLANTA_HUB_IP>:8000)
    └── Atlanta Store 2 (IS_MASTER=False, IS_HUB=False, HUB_URL=<ATLANTA_HUB_IP>:8000)
```

**Variable reference — replace throughout:**
```
<LOGAN_HUB_IP>       = Logan master hub VM IP
<ATLANTA_HUB_IP>     = Atlanta regional hub VM IP
<LOGAN_STORE_1_IP>   = Logan Store 1 VM IP
<LOGAN_STORE_2_IP>   = Logan Store 2 VM IP
<ATLANTA_STORE_1_IP> = Atlanta Store 1 VM IP
<ATLANTA_STORE_2_IP> = Atlanta Store 2 VM IP
<SECRET>             = INTER_NODE_SECRET (must match across all VMs)
```

**Note on registration:** Stores and hubs auto-register with their upstream hub via Celery Beat on startup (fires immediately, then every 5 minutes). No manual registration curl commands are needed — just verify registration happened in Django Admin after waiting ~30 seconds.

---

## Phase 1: Verify All 6 Nodes Are Up

SSH into each VM and run:

```bash
docker compose ps
```

**Expected:** 5 containers running — `web`, `db`, `redis`, `celery`, `celery-beat`.

```bash
docker compose logs web | tail -5
```

**Expected:** Migration output then `Starting development server at http://0.0.0.0:8000/`. No errors.

**Check Celery beat is firing tasks:**
```bash
docker compose logs celery-beat | tail -15
```

**Expected:** `beat: Starting...` followed by scheduled task lines. Within 30 seconds you should see `register_with_hub` fire.

**Check auto-registration succeeded:**
```bash
docker compose logs celery | grep -i register
```

**Expected on each non-master node:** `Registered with hub at http://<HUB_IP>:8000/backend/hub/register/`

---

## Phase 2: Health Check All 6 Nodes

Run from your laptop against each node:

```bash
for IP in <LOGAN_HUB_IP> <ATLANTA_HUB_IP> <LOGAN_STORE_1_IP> <LOGAN_STORE_2_IP> <ATLANTA_STORE_1_IP> <ATLANTA_STORE_2_IP>; do
  echo "--- $IP ---"
  curl -s -X POST http://$IP:8000/backend/internode/health-check/ \
    -H "Authorization: NodeToken <SECRET>" \
    -H "Content-Type: application/json" \
    -d '{"requesting_store_id": 0}' | python -m json.tool
done
```

**Expected on Logan master hub:**
```json
{ "status": "ok", "is_hub": true, "is_master": true, "region": "logan" }
```

**Expected on Atlanta hub:**
```json
{ "status": "ok", "is_hub": true, "is_master": false, "region": "atlanta" }
```

**Expected on each store:**
```json
{ "status": "ok", "is_hub": false, "is_master": false }
```

**Fail?** `401` = `INTER_NODE_SECRET` mismatch. `Connection refused` = web container down.

---

## Phase 3: Verify Auto-Registration

After waiting ~1 minute for Celery beat to fire, verify all nodes registered with their hubs.

**Logan master hub** should have Atlanta hub + 2 Logan stores:
```bash
curl -X GET http://<LOGAN_HUB_IP>:8000/backend/hub/stores/ \
  -H "Authorization: NodeToken <SECRET>" | python -m json.tool
```

**Expected:** 3 entries — Atlanta Hub (store_id from `.env`), Logan Store 1, Logan Store 2 — all `is_active=True`.

**Atlanta hub** should have 2 Atlanta stores:
```bash
curl -X GET http://<ATLANTA_HUB_IP>:8000/backend/hub/stores/ \
  -H "Authorization: NodeToken <SECRET>" | python -m json.tool
```

**Expected:** 2 entries — Atlanta Store 1, Atlanta Store 2.

**Fail?** If a store is missing, check its celery logs for registration errors:
```bash
# On the missing store's VM:
docker compose logs celery | grep -i "register\|error\|warning"
```

Common causes: wrong `HUB_URL` or `API_ENDPOINT` in `.env`, or hub wasn't up yet (wait another 5 minutes and check again).

---

## Phase 4: Heartbeat Chain (Store → Hub → Master)

**Verify Logan stores are heartbeating to Logan hub:**
```bash
# On Logan hub VM:
docker compose logs celery | grep heartbeat
```

**Expected:** `Heartbeat sent successfully` entries (from Atlanta hub heartbeating to Logan master).

**Verify via Django Admin** (`http://<LOGAN_HUB_IP>:8000/admin/` → Store registries): all registered stores should have `last_heartbeat` updated within the last 60 seconds.

**Test dead store detection — stop Atlanta Store 2:**
```bash
# On Atlanta Store 2 VM:
docker compose stop web
```

Wait 7 minutes (5-min threshold + 2-min check interval). On the **Atlanta hub**:

```bash
curl -X GET http://<ATLANTA_HUB_IP>:8000/backend/hub/stores/ \
  -H "Authorization: NodeToken <SECRET>" | python -m json.tool
```

**Expected:** Atlanta Store 2 is absent from the list (marked `is_active=False`).

Restart and it will re-register automatically within 5 minutes:
```bash
# On Atlanta Store 2 VM:
docker compose start web
```

---

## Phase 5: Cross-Region User Discovery

Register Alice on **Logan Store 1**:

```bash
curl -s -X POST http://<LOGAN_STORE_1_IP>:8000/backend/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "email": "alice@codepop.local", "password": "testpass123"}' \
  | python -m json.tool
```

Immediately look Alice up on the **Logan master hub** (auto-created UserCache on registration):

```bash
curl -X GET "http://<LOGAN_HUB_IP>:8000/backend/hub/store-location/?email=alice@codepop.local" \
  -H "Authorization: NodeToken <SECRET>" | python -m json.tool
```

**Expected:**
```json
{
  "status": "found",
  "store_id": <LOGAN_STORE_1_ID>,
  "api_endpoint": "http://<LOGAN_STORE_1_IP>:8000"
}
```

Look Alice up from **Atlanta Store 1** (cross-region, different hub):

```bash
curl -X POST http://<ATLANTA_STORE_1_IP>:8000/backend/internode/user-lookup/ \
  -H "Authorization: NodeToken <SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@codepop.local", "requesting_store_id": <ATLANTA_STORE_1_ID>}' \
  | python -m json.tool
```

**Expected:** `"status": "found"`, `"located_at_store_id": <LOGAN_STORE_1_ID>`

---

## Phase 6: User Replication (Lazy Caching)

Cache Alice on **Atlanta Store 1** so future lookups are local:

```bash
curl -X POST http://<ATLANTA_STORE_1_IP>:8000/backend/internode/user-sync/ \
  -H "Authorization: NodeToken <SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_data": {
      "user_id": 1,
      "email": "alice@codepop.local",
      "preferences": ["Fruity", "Sweet"],
      "favorite_drinks": []
    },
    "source_store_id": <LOGAN_STORE_1_ID>
  }' | python -m json.tool
```

**Expected:** `{"status": "cached", "expires_at": "..."}` — expires ~24h from now.

Look her up again from Atlanta Store 1:

```bash
curl -X POST http://<ATLANTA_STORE_1_IP>:8000/backend/internode/user-lookup/ \
  -H "Authorization: NodeToken <SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@codepop.local", "requesting_store_id": <ATLANTA_STORE_1_ID>}' \
  | python -m json.tool
```

**Expected:** `"located_at_store_id": <ATLANTA_STORE_1_ID>` (now served from local cache).

---

## Phase 7: Supply Request Workflow (Atlanta Store → Atlanta Hub)

```bash
curl -X POST http://<ATLANTA_HUB_IP>:8000/backend/internode/supply-request/ \
  -H "Authorization: NodeToken <SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": <ATLANTA_STORE_1_ID>,
    "item_name": "Strawberry Syrup",
    "item_type": "Syrup",
    "quantity_requested": 50,
    "notes": "Running low"
  }' | python -m json.tool
```

**Expected:** `{"status": "received", "request_id": 1}`

List pending, then run through the full workflow:

```bash
# List pending
curl -X GET "http://<ATLANTA_HUB_IP>:8000/backend/hub/supply-requests/?status=pending" \
  -H "Authorization: NodeToken <SECRET>" | python -m json.tool

# Approve
curl -X POST http://<ATLANTA_HUB_IP>:8000/backend/hub/supply-requests/1/approve/ \
  -H "Authorization: NodeToken <SECRET>" | python -m json.tool

# Fulfill
curl -X POST http://<ATLANTA_HUB_IP>:8000/backend/hub/supply-requests/1/fulfill/ \
  -H "Authorization: NodeToken <SECRET>" | python -m json.tool
```

**Expected:** Each step returns the new status. Test guard rails — try to approve an already-fulfilled request:
```bash
curl -X POST http://<ATLANTA_HUB_IP>:8000/backend/hub/supply-requests/1/approve/ \
  -H "Authorization: NodeToken <SECRET>" | python -m json.tool
```
**Expected:** `400` error with `"Cannot approve a request with status 'fulfilled'"`.

---

## Phase 8: Verify Audit Trail

```bash
# On Logan master hub:
docker compose exec web python manage.py shell -c "
from backend.models import SyncRecord
print(f'Total sync records: {SyncRecord.objects.count()}')
for r in SyncRecord.objects.all().order_by('-created_at')[:15]:
    msg = r.error_message[:60] if r.error_message else ''
    print(f'  {r.sync_type:15} {r.status:8} src={r.source_store_id} {msg}')
"
```

**Expected:** Records for user lookups and syncs performed above. No `failed` entries unless a node was unreachable.

---

## Troubleshooting Reference

| Symptom | Likely cause | Fix |
|---|---|---|
| `401` on all requests | `INTER_NODE_SECRET` mismatch | SSH into VMs, verify `.env` matches |
| `Connection refused` | Container not running | `docker compose up -d` on that VM |
| Store missing from hub's store list | Auto-registration failed | Check `docker compose logs celery` on that store VM |
| Auto-registration fails with `Connection refused` | `HUB_URL` wrong or hub not up yet | Fix `HUB_URL` in `.env`, restart; or wait 5 min for retry |
| Auto-registration fails with `401` | `INTER_NODE_SECRET` mismatch between store and hub | Verify `.env` on both VMs |
| `store-location` returns `not_found` | `API_ENDPOINT` not set on store | Set `API_ENDPOINT=http://<THIS_VM_IP>:8000` in `.env` and restart |
| Atlanta hub not showing in Logan admin | `HUB_URL` on Atlanta hub pointing to wrong IP | SSH Atlanta hub, fix `HUB_URL`, restart |
| Store shows inactive after restart | Dead store detection fired while store was down | Store re-registers automatically within 5 minutes of restart |
| `celery-beat` keeps restarting | Migration race condition on fresh DB | `docker compose restart celery-beat` after web is healthy |
| Cross-region lookup fails | Logan Store 1 not registered at Logan hub | Check Logan hub stores list; check `API_ENDPOINT` on Logan Store 1 |
