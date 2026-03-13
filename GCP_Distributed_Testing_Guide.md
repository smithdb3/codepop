# CodePop Distributed System — End-to-End Test Guide

**Date:** 2026-03-13
**Branch:** bradensDevBranch

## Node Inventory

| Node | IP | Role | STORE_ID |
|---|---|---|---|
| Logan Hub (Master) | `34.136.12.86` | Master Hub (IS_HUB=True, IS_MASTER=True) | 0 |
| Logan Store 1 | `34.55.170.11` | Regional Store | 1 |
| Logan Store 2 | `34.121.91.135` | Regional Store | 2 |
| Atlanta Hub | `136.115.168.184` | Regional Hub (IS_HUB=True) | 3 |
| Atlanta Store 1 | `136.112.202.76` | Regional Store | 4 |
| Atlanta Store 2 | `34.173.157.74` | Regional Store | 5 |

---

## Phase 1: Node Health Checks

Verify all nodes are live and responding to authenticated requests.

```bash
# Logan Hub
echo "=== Logan Hub ==="
curl -s -X POST http://34.136.12.86:8000/backend/internode/health-check/ \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" | python -m json.tool

# Logan Store 1
echo "=== Logan Store 1 ==="
curl -s -X POST http://34.55.170.11:8000/backend/internode/health-check/ \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" | python -m json.tool

# Logan Store 2
echo "=== Logan Store 2 ==="
curl -s -X POST http://34.121.91.135:8000/backend/internode/health-check/ \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" | python -m json.tool

# Atlanta Hub
echo "=== Atlanta Hub ==="
curl -s -X POST http://136.115.168.184:8000/backend/internode/health-check/ \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" | python -m json.tool

# Atlanta Store 1
echo "=== Atlanta Store 1 ==="
curl -s -X POST http://136.112.202.76:8000/backend/internode/health-check/ \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" | python -m json.tool

# Atlanta Store 2
echo "=== Atlanta Store 2 ==="
curl -s -X POST http://34.173.157.74:8000/backend/internode/health-check/ \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" | python -m json.tool
```

**Expected:** Each returns `{"status": "ok", "store_id": <id>, "is_hub": <bool>, "region": "<region>"}`

---

## Phase 2: Store Auto-Registration with Hub

Verify that stores have registered with their regional hub and appear in the hub's store list.

```bash
# Check Logan Hub sees its stores
echo "=== Logan Hub: Registered Stores ==="
curl -s http://34.136.12.86:8000/backend/hub/stores/ \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" | python -m json.tool

# Check Atlanta Hub sees its stores
echo "=== Atlanta Hub: Registered Stores ==="
curl -s http://136.115.168.184:8000/backend/hub/stores/ \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" | python -m json.tool
```

**Expected:** Each hub lists its stores with `api_endpoint`, `is_active: true`, and `last_heartbeat`.

**Troubleshooting:** If a store is missing:
```bash
# SSH into the store VM and check logs
docker logs $(docker ps -q -f "label=app=codepop") 2>&1 | grep -E "register|hub|failed"
```

---

## Phase 3: Create a User at Logan Store 1

Register Alice at Logan Store 1 to test user creation and EventQueue generation.

```bash
echo "=== Register Alice at Logan Store 1 ==="
RESPONSE=$(curl -s -X POST http://34.55.170.11:8000/backend/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice@codepop.local",
    "email": "alice@codepop.local",
    "password": "testpass123",
    "first_name": "Alice",
    "last_name": "Test"
  }')

echo "$RESPONSE" | python -m json.tool

# Extract token and user_id for later use
ALICE_TOKEN=$(echo "$RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('token', ''))")
ALICE_ID=$(echo "$RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('user_id', ''))")

echo "Saved: ALICE_TOKEN=$ALICE_TOKEN"
echo "Saved: ALICE_ID=$ALICE_ID"
```

**Expected:** `201` status with token, user_id, and user details.

---

## Phase 4: Verify Logan Hub Received Alice's UserCache

Wait ~10 seconds for Celery to deliver the event, then query the hub for Alice.

```bash
echo "=== Hub store-location lookup for Alice ==="
curl -s "http://34.136.12.86:8000/backend/hub/store-location/?email=alice@codepop.local" \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" | python -m json.tool
```

**Expected:**
```json
{
  "status": "found",
  "store_id": 1,
  "api_endpoint": "http://34.55.170.11:8000"
}
```

If `not_found`, the EventQueue hasn't been processed yet. Retry after a few seconds.

---

## Phase 4a: Verify Master Hub Received Alice (Cross-Region Feature)

Wait ~15 seconds for Celery to forward the user sync from Logan Hub to Master Hub, then verify master has Alice.

```bash
echo "=== Master Hub store-location lookup for Alice ==="
curl -s "http://34.136.12.86:8000/backend/hub/store-location/?email=alice@codepop.local" \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" | python -m json.tool
```

**Expected:**
```json
{
  "status": "found",
  "store_id": 1,
  "api_endpoint": "http://34.55.170.11:8000"
}
```

This confirms that the regional hub forwarded Alice's data to the master hub with the store endpoint embedded.

**If `not_found`:**
- Check Celery is processing EventQueue on Logan Hub
- Check the EventQueue for a pending event pointing to master hub's `/internode/user-sync/`

---

## Phase 4b: Verify Atlanta Hub Can Find Alice via Cascade

Atlanta Hub should NOT have Alice in its local UserCache (she's in Logan), but it should cascade the query to Master Hub and find her.

```bash
echo "=== Atlanta Hub store-location lookup for Alice (via cascade) ==="
curl -s "http://136.115.168.184:8000/backend/hub/store-location/?email=alice@codepop.local" \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" | python -m json.tool
```

**Expected:**
```json
{
  "status": "found",
  "store_id": 1,
  "api_endpoint": "http://34.55.170.11:8000"
}
```

This proves the cascade is working: Atlanta Hub → Master Hub → found.

**If `not_found`:**
- Confirm Phase 4a passed (master has Alice)
- Check for network issues between Atlanta and Master hubs

---

## Phase 5: Direct Inter-Node User Lookup

Simulate Logan Store 2 looking up Alice (who is at Store 1).

```bash
echo "=== Store 2 inter-node lookup for Alice ==="
curl -s -X POST http://34.121.91.135:8000/backend/internode/user-lookup/ \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@codepop.local", "requesting_store_id": 2}' \
  | python -m json.tool
```

**Expected:**
```json
{
  "status": "found",
  "user": {
    "user_id": 1,
    "email": "alice@codepop.local",
    "first_name": "Alice",
    "preferences": [],
    "favorite_drinks": []
  },
  "located_at_store_id": 1
}
```

This tests the 3-stage cascade: Store 2 → Local UserCache → Local User table → Hub lookup.

---

## Phase 6: Visiting User Login at Logan Store 2

Alice registered at Store 1 but logs in at Store 2 using UserCache fallback.

```bash
echo "=== Alice logs in at Logan Store 2 (visiting user) ==="
RESPONSE=$(curl -s -X POST http://34.121.91.135:8000/backend/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alice@codepop.local", "password": "wrong_password"}')

echo "$RESPONSE" | python -m json.tool

ALICE_S2_TOKEN=$(echo "$RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('token', ''))")
ALICE_S2_ID=$(echo "$RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('user_id', ''))")

echo "Saved: ALICE_S2_TOKEN=$ALICE_S2_TOKEN"
echo "Saved: ALICE_S2_ID=$ALICE_S2_ID"
```

**Expected:** `200` with token, user_id, and user details. The password is wrong intentionally — this triggers the UserCache fallback.

**Note:** If you get `401 Unauthorized`, Alice's UserCache hasn't reached Store 2 yet. Confirm Phase 5 passed.

---

## Phase 7: Verify Visiting User Has No Local Preferences

Alice was created locally at Store 2 during login. Verify she has no preferences (local data is blank).

```bash
echo "=== Alice's preferences at Store 2 ==="
curl -s http://34.121.91.135:8000/backend/users/$ALICE_S2_ID/preferences/ \
  -H "Authorization: Token $ALICE_S2_TOKEN" | python -m json.tool
```

**Expected:** `200` with `[]` (empty list — Store 2 has no preference data for Alice).

---

## Phase 8: Block Duplicate Registration (Same Region)

Try registering Alice again at Logan Store 2 — should fail because she's already at Logan Store 1.

```bash
echo "=== Attempt duplicate registration at Logan Store 2 ==="
curl -s -X POST http://34.121.91.135:8000/backend/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice@codepop.local",
    "email": "alice@codepop.local",
    "password": "newpass123",
    "first_name": "AliceDup",
    "last_name": "Duplicate"
  }' | python -m json.tool
```

**Expected:** `400` with:
```json
{"email": ["A user with that email already exists in another store."]}
```

---

## Phase 8a: Block Duplicate Registration (Cross-Region)

Try registering Alice at Atlanta Store 1 — should fail via the cascade to Master Hub, even though Atlanta hub doesn't know her locally.

```bash
echo "=== Attempt duplicate registration at Atlanta Store 1 (cross-region) ==="
curl -s -X POST http://136.112.202.76:8000/backend/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice@codepop.local",
    "email": "alice@codepop.local",
    "password": "newpass123",
    "first_name": "AliceDup",
    "last_name": "CrossRegion"
  }' | python -m json.tool
```

**Expected:** `400` with:
```json
{"email": ["A user with that email already exists in another store."]}
```

This proves the cross-region cascade is working for uniqueness checks. Atlanta Store 1's `validate_email` queried Atlanta Hub → not found locally → cascaded to Master Hub → found Alice.

---

## Phase 9: Test Atlanta Region Independence

Register Bob at Atlanta Store 1 to verify Atlanta operates independently from Logan.

```bash
echo "=== Register Bob at Atlanta Store 1 ==="
RESPONSE=$(curl -s -X POST http://136.112.202.76:8000/backend/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "bob@codepop.local",
    "email": "bob@codepop.local",
    "password": "testpass456",
    "first_name": "Bob",
    "last_name": "Atlanta"
  }')

echo "$RESPONSE" | python -m json.tool

BOB_TOKEN=$(echo "$RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('token', ''))")
BOB_ID=$(echo "$RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('user_id', ''))")

echo "Saved: BOB_TOKEN=$BOB_TOKEN"
echo "Saved: BOB_ID=$BOB_ID"
```

**Expected:** `201` with token and user_id.

---

## Phase 10: Verify Atlanta Hub Has Bob's UserCache

```bash
echo "=== Atlanta Hub lookup for Bob ==="
curl -s "http://136.115.168.184:8000/backend/hub/store-location/?email=bob@codepop.local" \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" | python -m json.tool
```

**Expected:** `{"status": "found", "store_id": 4, "api_endpoint": "http://136.112.202.76:8000"}`

---

## Phase 11: Verify Cross-Region Discovery Works

Logan Hub should now be able to find Bob (registered at Atlanta Store 1) via the master hub cascade.

**Note:** This now works because regional hubs forward user syncs to the master hub.

```bash
echo "=== Logan Hub lookup for Bob (via cascade to master) ==="
curl -s "http://34.136.12.86:8000/backend/hub/store-location/?email=bob@codepop.local" \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" | python -m json.tool
```

**Expected:**
```json
{
  "status": "found",
  "store_id": 4,
  "api_endpoint": "http://136.112.202.76:8000"
}
```

This proves cross-region discovery is working: Logan Hub queries Master Hub and finds Bob.

---

## Phase 12: Verify Symmetric Cross-Region Discovery

Symmetric test: Atlanta Hub should find Alice (registered in Logan) via the master hub cascade.

```bash
echo "=== Atlanta Hub lookup for Alice (via cascade to master) ==="
curl -s "http://136.115.168.184:8000/backend/hub/store-location/?email=alice@codepop.local" \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71" | python -m json.tool
```

**Expected:**
```json
{
  "status": "found",
  "store_id": 1,
  "api_endpoint": "http://34.55.170.11:8000"
}
```

This proves symmetric cross-region discovery: Atlanta Hub queries Master Hub and finds Alice.

---

## Summary Checklist

Use this checklist to track test results:

| Phase | Test | Expected Result | Pass? |
|---|---|---|---|
| 1 | Health checks | All 6 nodes return `status: ok` | |
| 2 | Store registration | Both hubs list their stores | |
| 3 | User registration | Alice created at Logan Store 1 | |
| 4 | Regional hub sync | Logan Hub finds Alice | |
| 4a | **Master hub sync (NEW)** | **Master Hub finds Alice** | |
| 4b | **Cross-region cascade (NEW)** | **Atlanta Hub finds Alice via cascade to master** | |
| 5 | Inter-node lookup | Store 2 finds Alice via cascade | |
| 6 | Visiting user login | Alice logs in at Store 2 via UserCache | |
| 7 | Visiting user data | Alice has no local preferences at Store 2 | |
| 8 | Duplicate block (regional) | Duplicate registration at Store 2 rejected | |
| 8a | **Duplicate block (cross-region) (NEW)** | **Duplicate registration at Atlanta Store 1 rejected via cascade** | |
| 9 | Region independence | Bob created at Atlanta Store 1 | |
| 10 | Atlanta hub sync | Atlanta Hub finds Bob | |
| 11 | Cross-region gap | Logan Hub finds Bob ✓ (now working!) | |
| 12 | Symmetric gap | Atlanta Hub finds Alice ✓ (now working!) | |

---

## Troubleshooting

### EventQueue not processing
```bash
# Check Celery on the store VM
docker exec <container> celery -A codepop_backend worker --loglevel=info
```

### Hub endpoints returning 403 Unauthorized
Make sure all nodes have the same `INTER_NODE_SECRET=3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71` in their `.env` files.

### Store not appearing in hub's `/hub/stores/`
```bash
# SSH into the store and check that HUB_URL is set correctly in .env
# Then trigger registration manually:
docker exec <container> python manage.py shell -c "
from backend.tasks import register_with_hub
register_with_hub()
"
```

### Network timeouts between regions
```bash
# Verify GCP firewall rules allow port 8000 between all VMs
# Check from Logan Store 1 to Atlanta Hub:
curl -v -m 5 -X POST http://136.115.168.184:8000/backend/internode/health-check/ \
  -H "Authorization: NodeToken 3597b3480971f2aa46484d2a8cad6aa55a979ba01292630d6f247d8224d76d71"
```

---

## Next Phases (Future Sprints)

- **Master hub aggregation:** Cross-region user discovery via master hub
- **Preference sync:** Sync user preferences across regions
- **Supply chain:** Implement supply request approval workflow
- **Machine status:** Real-time machine status updates and repair scheduling
