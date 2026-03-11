# Sprint 3 Inter-Node Communication: Step-by-Step Walkthrough

**Purpose:** Complete walkthrough to test and verify the inter-node distributed system from a clean database. Follow every step in order—do not skip steps.

**Last Updated:** March 2026

---

## Prerequisites

Ensure you're in the correct directory and Docker is available:
```bash
cd /Users/bradenpeterson/Schoolwork/CS3450/codepop/codepop_backend
```

---

## Step 1: Reset the Database to Clean State

**What it tests:** Ensures we start from a completely clean database with no test data.

**Command:**
```bash
docker compose down -v && docker compose up -d
```

**Expected output:**
```
[+] Running 3/3
 ✔ Container codepop_backend-db-1     Removed
 ✔ Container codepop_backend-web-1    Removed
 ✔ Container codepop_backend-redis-1  Removed
[+] Building 0.0s (0/0)
[+] Running 3/3
 ✔ Network codepop_backend_default     Created
 ✔ Container codepop_backend-db-1      Started
 ✔ Container codepop_backend-web-1     Started
 ✔ Container codepop_backend-redis-1   Started
```

**Pass?** ✅ If all 3 containers say "Started"
**Fail?** ❌ If any container fails to start, check `docker compose logs web`

---

## Step 2: Verify All Containers Are Running

**What it tests:** Confirms Docker services are healthy before proceeding.

**Command:**
```bash
docker compose ps
```

**Expected output:**
```
NAME                      COMMAND                  SERVICE      STATUS
codepop_backend-web-1     "python manage.py ru…"   web          Up (healthy)
codepop_backend-db-1      "docker-entrypoint.s…"   db           Up
codepop_backend-redis-1   "redis-server"           redis        Up
```

**Pass?** ✅ If web container shows `Up (healthy)` and all services show `Up`
**Fail?** ❌ If any container is not "Up", wait 10 seconds and try again (Django startup takes time)

---

## Step 3: Run Database Migrations

**What it tests:** Applies all Sprint 3 database schema migrations (the 19 new models).

**Command:**
```bash
docker compose exec web python manage.py migrate
```

**Expected output:**
```
Operations to perform:
  Apply all migrations: admin, auth, backend, contenttypes, sessions
Running migrations:
  ...
  Applying backend.0001_initial... OK
  Applying backend.0002_... OK
  ...
(migrations complete with no errors)
```

**Pass?** ✅ If it says "OK" for all migrations with no errors
**Fail?** ❌ If you see "ERROR" or "Traceback", check that `.env` has `INTER_NODE_SECRET` set

---

## Step 4: Verify All Sprint 3 Tables Exist

**What it tests:** Confirms all 19 models were created in the database.

**Command:**
```bash
docker compose exec web -T python manage.py shell << 'EOF'
from backend.models import (
    StoreRegistry, HubRegistry, NodeCertificate, UserCache, SyncRecord,
    EventQueue, SupplyRequest, Region, SupplyHub, Machine, Schedule,
    RepairStaffProfile, LogisticsManagerProfile
)
tables = [
    StoreRegistry, HubRegistry, NodeCertificate, UserCache, SyncRecord,
    EventQueue, SupplyRequest, Region, SupplyHub, Machine, Schedule,
    RepairStaffProfile, LogisticsManagerProfile
]
print(f"✓ All {len(tables)} models imported successfully")
for model in tables:
    count = model.objects.count()
    print(f"  {model.__name__}: {count} records")
EOF
```

**Expected output:**
```
✓ All 13 models imported successfully
  StoreRegistry: 0 records
  HubRegistry: 0 records
  NodeCertificate: 0 records
  UserCache: 0 records
  SyncRecord: 0 records
  EventQueue: 0 records
  SupplyRequest: 0 records
  Region: 0 records
  SupplyHub: 0 records
  Machine: 0 records
  Schedule: 0 records
  RepairStaffProfile: 0 records
  LogisticsManagerProfile: 0 records
```

**Pass?** ✅ If all models import and show 0 records
**Fail?** ❌ If any model fails to import, migrations didn't complete properly

---

## Step 5: Create a Superuser for Django Admin

**What it tests:** Sets up admin credentials so we can inspect data in the Django Admin panel.

**Command:**
```bash
docker compose exec web python manage.py createsuperuser
```

**Prompts & Input:**
```
Username: admin
Email: admin@test.local
Password: testpass123
Password (again): testpass123
Superuser created successfully.
```

**Expected output:**
```
Superuser created successfully.
```

**Pass?** ✅ If superuser created without errors
**Fail?** ❌ If it says user already exists, ignore (you can reuse existing admin)

---

## Step 6: Verify Django Admin and Sprint 3 Models Appear

**What it tests:** Confirms the admin interface loads and shows all new Sprint 3 tables.

**Command:**
Open your browser and visit:
```
http://localhost:8000/admin/
```

**Login with:**
- Username: `admin`
- Password: `testpass123`

**Expected screen:**
After login, you should see sections including:
```
BACKEND
  ✓ Event queues
  ✓ Hub registries
  ✓ Machines
  ✓ Node certificates
  ✓ Regions
  ✓ Repair staff profiles
  ✓ Store registries
  ✓ Supply hubs
  ✓ Supply requests
  ✓ Sync records
  ✓ User caches
```

**Pass?** ✅ If all models appear and you can click into each section (all show 0 records)
**Fail?** ❌ If admin won't load (404 error), run `docker compose exec web python manage.py collectstatic --noinput`

---

## Step 7: Verify Authentication Enforcement on Endpoints

**What it tests:** Confirms that inter-node endpoints require the INTER_NODE_SECRET token.

**Command:**
```bash
curl -X GET http://localhost:8000/backend/hub/stores/ \
  -H "Content-Type: application/json"
```

**Expected output:**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

**Pass?** ✅ If you get a 401 error (authentication required)
**Fail?** ❌ If you get a 200 OK, auth middleware is not working

---

## Step 8: Test Health Check Endpoint

**What it tests:** Verifies inter-node communication works with proper authentication.

**Command:**
```bash
curl -X POST http://localhost:8000/backend/internode/health-check/ \
  -H "Authorization: NodeToken change-this-secret-before-prod" \
  -H "Content-Type: application/json" \
  -d '{"requesting_store_id": 1}' | python -m json.tool
```

**Expected output:**
```json
{
  "status": "ok",
  "store_id": 0,
  "region": "logan",
  "is_hub": true,
  "is_master": true,
  "timestamp": "2026-03-11T21:45:00.000000+00:00"
}
```

**Pass?** ✅ If you get `"status": "ok"` with 200 status code
**Fail?** ❌ If you get 401, the INTER_NODE_SECRET in `.env` doesn't match the token

---

## Step 9: Register Store 101 (Logan Store)

**What it tests:** Stores register with the hub, creating a StoreRegistry entry.

**Command:**
```bash
curl -X POST http://localhost:8000/backend/hub/register/ \
  -H "Authorization: NodeToken change-this-secret-before-prod" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": 101,
    "store_name": "Logan Store 1",
    "region": "logan",
    "latitude": 41.73,
    "longitude": -111.83,
    "api_endpoint": "http://10.0.0.3:8000",
    "public_key": ""
  }' | python -m json.tool
```

**Expected output:**
```json
{
  "status": "registered",
  "certificate_expires": "2026-06-09T21:45:30.000000+00:00",
  "sibling_stores": []
}
```

**Pass?** ✅ If status is "registered" and sibling_stores is empty (first store)
**Fail?** ❌ If you get an error, check the curl command syntax

**Verify in Django Admin:**
- Go to `http://localhost:8000/admin/`
- Click **Store registries**
- You should see Store 101 with region "logan" and is_active checked
- last_heartbeat should be null (no heartbeat yet)

---

## Step 10: Register Store 102 (Atlanta Store 1)

**What it tests:** First Atlanta store registers; it should have no siblings (first in region).

**Command:**
```bash
curl -X POST http://localhost:8000/backend/hub/register/ \
  -H "Authorization: NodeToken change-this-secret-before-prod" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": 102,
    "store_name": "Atlanta Store 1",
    "region": "atlanta",
    "latitude": 33.75,
    "longitude": -84.39,
    "api_endpoint": "http://10.0.1.3:8000",
    "public_key": ""
  }' | python -m json.tool
```

**Expected output:**
```json
{
  "status": "registered",
  "certificate_expires": "2026-06-09T21:46:15.000000+00:00",
  "sibling_stores": []
}
```

**Pass?** ✅ If sibling_stores is empty (first Atlanta store)
**Fail?** ❌ If you get an error, check the curl command syntax

**Verify in Django Admin:**
- Click **Store registries**
- You should now see both Store 101 and Store 102 (different regions)

---

## Step 10b: Register Store 103 (Atlanta Store 2)

**What it tests:** Second Atlanta store registers; it should see Store 102 as a sibling (same region, peer discovery).

**Command:**
```bash
curl -X POST http://localhost:8000/backend/hub/register/ \
  -H "Authorization: NodeToken change-this-secret-before-prod" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": 103,
    "store_name": "Atlanta Store 2",
    "region": "atlanta",
    "latitude": 33.78,
    "longitude": -84.37,
    "api_endpoint": "http://10.0.2.3:8000",
    "public_key": ""
  }' | python -m json.tool
```

**Expected output:**
```json
{
  "status": "registered",
  "certificate_expires": "2026-06-09T21:46:45.000000+00:00",
  "sibling_stores": [
    {
      "store_id": 102,
      "store_name": "Atlanta Store 1",
      "api_endpoint": "http://10.0.1.3:8000",
      "latitude": 33.75,
      "longitude": -84.39
    }
  ]
}
```

**Pass?** ✅ If sibling_stores includes Store 102 (peer discovery within region working)
**Fail?** ❌ If sibling_stores is empty, the region-matching logic needs debugging

**Verify in Django Admin:**
- Click **Store registries**
- You should now see 3 stores: Store 101 (logan), Store 102 (atlanta), Store 103 (atlanta)

---

## Step 11: Send Heartbeat from Store 101

**What it tests:** Stores send heartbeats to update last_heartbeat timestamp on the hub.

**Command:**
```bash
curl -X POST http://localhost:8000/backend/hub/heartbeat/ \
  -H "Authorization: NodeToken change-this-secret-before-prod" \
  -H "Content-Type: application/json" \
  -d '{"store_id": 101}' | python -m json.tool
```

**Expected output:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-11T21:46:15.000000+00:00"
}
```

**Pass?** ✅ If status is "ok"
**Fail?** ❌ If you get an error, check store_id is registered

**Verify in Django Admin:**
- Go to **Store registries**
- Click on **Store 101**
- **last_heartbeat** should now show the current time (not null)

---

## Step 12: List All Registered Stores

**What it tests:** Peer discovery—stores can query the hub for all known stores.

**Command:**
```bash
curl -X GET http://localhost:8000/backend/hub/stores/ \
  -H "Authorization: NodeToken change-this-secret-before-prod" \
  -H "Content-Type: application/json" | python -m json.tool
```

**Expected output:**
```json
[
  {
    "store_id": 101,
    "store_name": "Logan Store 1",
    "region": "logan",
    "api_endpoint": "http://10.0.0.3:8000",
    "latitude": 41.73,
    "longitude": -111.83
  },
  {
    "store_id": 102,
    "store_name": "Atlanta Store 1",
    "region": "atlanta",
    "api_endpoint": "http://10.0.1.3:8000",
    "latitude": 33.75,
    "longitude": -84.39
  },
  {
    "store_id": 103,
    "store_name": "Atlanta Store 2",
    "region": "atlanta",
    "api_endpoint": "http://10.0.2.3:8000",
    "latitude": 33.78,
    "longitude": -84.37
  }
]
```

**Pass?** ✅ If all 3 stores are listed (1 Logan + 2 Atlanta)
**Fail?** ❌ If the list is incomplete, registrations didn't persist

---

## Step 13: Register a User (Alice)

**What it tests:** Creates a local user in the hub's database.

**Command:**
```bash
ALICE_RESPONSE=$(curl -s -X POST http://localhost:8000/backend/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@codepop.local",
    "password": "testpass123"
  }')

echo "$ALICE_RESPONSE" | python -m json.tool

ALICE_TOKEN=$(echo "$ALICE_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null || echo "")
echo "Alice's token: $ALICE_TOKEN"
```

**Expected output:**
```json
{
  "username": "alice",
  "email": "alice@codepop.local",
  "first_name": "",
  "last_name": "",
  "token": "example_token"
}
Alice's token: example_token
```

**Pass?** ✅ If user_id and token are returned
**Fail?** ❌ If you get a 400 error, check email format or if user already exists

---

## Step 14: User Lookup from Same Store (Store 0)

**What it tests:** Confirms user-lookup finds Alice when requesting from her home store (store 0).

**Command:**
```bash
curl -X POST http://localhost:8000/backend/internode/user-lookup/ \
  -H "Authorization: NodeToken change-this-secret-before-prod" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@codepop.local",
    "requesting_store_id": 0
  }' | python -m json.tool
```

**Expected output:**
```json
{
  "status": "found",
  "user": {
    "user_id": 1,
    "email": "alice@codepop.local",
    "preferences": [],
    "favorite_drinks": []
  },
  "located_at_store_id": 0
}
```

**Pass?** ✅ If status is "found" and located_at_store_id is 0
**Fail?** ❌ If status is "not_found", registration didn't work

---

## Step 15: User Lookup from Different Store (Store 102)

**What it tests:** When Store 102 queries for Alice, it discovers she lives on Store 0 (not cached yet).

**Command:**
```bash
curl -X POST http://localhost:8000/backend/internode/user-lookup/ \
  -H "Authorization: NodeToken change-this-secret-before-prod" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@codepop.local",
    "requesting_store_id": 102
  }' | python -m json.tool
```

**Expected output:**
```json
{
  "status": "found",
  "user": {
    "user_id": 1,
    "email": "alice@codepop.local",
    "preferences": [],
    "favorite_drinks": []
  },
  "located_at_store_id": 0
}
```

**Pass?** ✅ If status is "found" showing Alice is on store 0 (correct inter-node lookup)
**Fail?** ❌ If you get "not_found", the inter-node query isn't working

**Why this output?** This tells Store 102 "Alice exists, but she lives on Store 0. If you want her data cached locally, call user-sync."

---

## Step 16: Replicate User to Store 102 (Cache Alice)

**What it tests:** Store 102 caches Alice's profile for faster local access (lazy replication).

**Command:**
```bash
curl -X POST http://localhost:8000/backend/internode/user-sync/ \
  -H "Authorization: NodeToken change-this-secret-before-prod" \
  -H "Content-Type: application/json" \
  -d '{
    "user_data": {
      "user_id": 1,
      "email": "alice@codepop.local",
      "preferences": ["Fruity", "Sweet"],
      "favorite_drinks": [42, 87, 105]
    },
    "source_store_id": 0
  }' | python -m json.tool
```

**Expected output:**
```json
{
  "status": "cached",
  "expires_at": "2026-03-12T21:47:00.000000+00:00"
}
```

**Pass?** ✅ If status is "cached" and expires_at is 24 hours from now
**Fail?** ❌ If you get an error, check the user_data format

**Verify in Django Admin:**
- Go to `http://localhost:8000/admin/`
- Click **User caches**
- You should see alice@codepop.local with source_store_id=0 and expires_at in the future

---

## Step 17: Verify User Lookup After Caching

**What it tests:** Confirms the user cache works—local lookups return the cached user faster.

**Command:**
```bash
curl -X POST http://localhost:8000/backend/internode/user-lookup/ \
  -H "Authorization: NodeToken change-this-secret-before-prod" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@codepop.local",
    "requesting_store_id": 102
  }' | python -m json.tool
```

**Expected output:**
```json
{
  "status": "found",
  "user": {
    "user_id": 1,
    "email": "alice@codepop.local",
    "preferences": ["Fruity", "Sweet"],
    "favorite_drinks": [42, 87, 105]
  },
  "located_at_store_id": 102
}
```

**Pass?** ✅ If located_at_store_id is now 102 (user found in cache) and preferences show the cached data
**Fail?** ❌ If it still shows located_at_store_id as 0, caching didn't work

---

## Step 18: Cross-Region User Location Lookup

**What it tests:** Hub can locate a user across regions when given email (used for redirects to correct store).

**Command:**
```bash
curl -X GET "http://localhost:8000/backend/hub/store-location/?email=alice@codepop.local" \
  -H "Authorization: NodeToken change-this-secret-before-prod" \
  -H "Content-Type: application/json" | python -m json.tool
```

**Expected output:**
```json
{
  "status": "found",
  "store_id": 0,
  "api_endpoint": "http://10.0.0.3:8000"
}
```

**Pass?** ✅ If status is "found" and store_id is 0 (Alice's home store)
**Fail?** ❌ If you get "not_found", user lookup didn't work

---

## Step 19: Create a Machine and Update Its Status

**What it tests:** Machines can be created and their status updated through inter-node endpoints.

**Command (Part A - Create Machine):**
```bash
docker compose exec -T web python manage.py shell << 'EOF'
from backend.models import Machine
m = Machine.objects.create(
    machine_id="M-LOGAN-001",
    store_id=101,
    status="NORMAL"
)
print(f"✓ Created machine: {m.machine_id} on store {m.store_id} with status {m.status}")
EOF
```

**Expected output:**
```
✓ Created machine: M-LOGAN-001 on store 101 with status NORMAL
```

**Pass?** ✅ If machine is created
**Fail?** ❌ If you get an error, check store 101 exists

**Command (Part B - Update Machine Status):**
```bash
curl -X POST http://localhost:8000/backend/internode/status-update/ \
  -H "Authorization: NodeToken change-this-secret-before-prod" \
  -H "Content-Type: application/json" \
  -d '{
    "machine_id": "M-LOGAN-001",
    "status": "ERROR",
    "repair_notes": "Pump seal failure detected"
  }' | python -m json.tool
```

**Expected output:**
```json
{
  "status": "updated"
}
```

**Pass?** ✅ If status is "updated"
**Fail?** ❌ If you get "machine not found", the machine ID doesn't match

**Verify in Django Admin:**
- Go to `http://localhost:8000/admin/`
- Click **Machines**
- Click **M-LOGAN-001**
- Verify status is now "ERROR" and repair_notes shows "Pump seal failure detected"

---

## Step 20: Submit a Supply Request

**What it tests:** Stores can submit supply requests to the hub for approval/fulfillment.

**Command:**
```bash
curl -X POST http://localhost:8000/backend/internode/supply-request/ \
  -H "Authorization: NodeToken change-this-secret-before-prod" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": 101,
    "item_name": "Strawberry Syrup",
    "item_type": "Syrup",
    "quantity_requested": 50,
    "notes": "Low stock, urgent"
  }' | python -m json.tool
```

**Expected output:**
```json
{
  "status": "received",
  "request_id": 1
}
```

**Pass?** ✅ If status is "received" and request_id is returned
**Fail?** ❌ If you get a 400 error, check all required fields are present

**Verify in Django Admin:**
- Go to `http://localhost:8000/admin/`
- Click **Supply requests**
- You should see Store 101's request with status "pending"

---

## Step 21: Verify Sync Records (Audit Trail)

**What it tests:** All inter-node operations create audit entries in SyncRecord table.

**Command:**
```bash
docker compose exec -T web python manage.py shell << 'EOF'
from backend.models import SyncRecord
records = SyncRecord.objects.all()
print(f"Total sync records: {records.count()}\n")
for record in records:
    print(f"ID: {record.id}")
    print(f"  Type: {record.sync_type}")
    print(f"  Source: {record.source_store_id}")
    print(f"  Target: {record.target_store_id}")
    print(f"  Status: {record.status}")
    print(f"  Created: {record.created_at}")
    print()
EOF
```

**Expected output:**
```
Total sync records: X

ID: 1
  Type: user_pull
  Source: 102
  Target: 0
  Status: success
  Created: 2026-03-11 21:46:15+00:00

...
```

**Pass?** ✅ If you see sync records for user-lookup, user-sync, and status-update operations
**Fail?** ❌ If sync records are empty, audit logging isn't working

**Verify in Django Admin:**
- Go to `http://localhost:8000/admin/`
- Click **Sync records**
- You should see entries for all operations you've performed

---

## Step 22: Final Database State Check

**What it tests:** Confirms the entire distributed system has the correct state after all operations.

**Command:**
```bash
docker compose exec -T web python manage.py shell << 'EOF'
from backend.models import (
    StoreRegistry, UserCache, SyncRecord, Machine, SupplyRequest
)

print("=" * 60)
print("FINAL DATABASE STATE CHECK")
print("=" * 60)

stores = StoreRegistry.objects.all()
print(f"\n✓ Store Registries: {stores.count()} stores registered")
for store in stores:
    print(f"  - Store {store.store_id}: {store.store_name} ({store.region})")

users = UserCache.objects.all()
print(f"\n✓ User Caches: {users.count()} users cached")
for user in users:
    print(f"  - {user.user_email} from store {user.source_store_id}")

syncs = SyncRecord.objects.all()
print(f"\n✓ Sync Records: {syncs.count()} operations logged")
for sync in syncs[:5]:
    print(f"  - {sync.sync_type} (source:{sync.source_store_id} → target:{sync.target_store_id}) [{sync.status}]")

machines = Machine.objects.all()
print(f"\n✓ Machines: {machines.count()} machines")
for machine in machines:
    print(f"  - {machine.machine_id} on store {machine.store_id}: {machine.status}")

supplies = SupplyRequest.objects.all()
print(f"\n✓ Supply Requests: {supplies.count()} requests")
for supply in supplies:
    print(f"  - Store {supply.store_id}: {supply.item_name} x{supply.quantity_requested} [{supply.status}]")

print("\n" + "=" * 60)
print("ALL CHECKS COMPLETE")
print("=" * 60)
EOF
```

**Expected output:**
```
============================================================
FINAL DATABASE STATE CHECK
============================================================

✓ Store Registries: 2 stores registered
  - Store 101: Logan Store 1 (logan)
  - Store 102: Atlanta Store 1 (atlanta)

✓ User Caches: 1 users cached
  - alice@codepop.local from store 0

✓ Sync Records: X operations logged
  - user_pull (source:102 → target:0) [success]
  ...

✓ Machines: 1 machines
  - M-LOGAN-001 on store 101: ERROR

✓ Supply Requests: 1 requests
  - Store 101: Strawberry Syrup x50 [pending]

============================================================
ALL CHECKS COMPLETE
============================================================
```

**Pass?** ✅ If all sections show expected counts and data
**Fail?** ❌ If any section is empty or shows wrong data, review the steps where data was created

---

## Summary: What You've Verified

You've successfully tested the complete Sprint 3 inter-node distributed system:

1. ✅ Database initialization and migrations
2. ✅ Authentication/authorization (NodeToken)
3. ✅ Store registration and discovery (peer finding)
4. ✅ Heartbeat mechanism (store connectivity)
5. ✅ User lookup within store and across stores
6. ✅ Lazy user replication (caching with 24h expiry)
7. ✅ Cross-region user location discovery
8. ✅ Machine status updates
9. ✅ Supply request submission
10. ✅ Audit trail (Sync Records)

All features have been verified end-to-end with database confirmation.

---

## If Something Fails

1. **Check Docker logs:** `docker compose logs web`
2. **Verify .env has INTER_NODE_SECRET:** `grep INTER_NODE_SECRET codepop_backend/.env`
3. **Restart containers:** `docker compose restart`
4. **Reset and start over:** `docker compose down -v && docker compose up -d` (then repeat from Step 1)
