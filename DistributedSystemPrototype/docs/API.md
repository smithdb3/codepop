# API Reference

Complete endpoint reference for the Hub and Store nodes.

**Base URLs:**
- Hub: `http://localhost:5001`
- Store 1: `http://localhost:5002`
- Store 2: `http://localhost:5003`

**Interactive Docs:**
- Hub Swagger: http://localhost:5001/docs
- Hub ReDoc: http://localhost:5001/redoc
- Store 1 Swagger: http://localhost:5002/docs
- Store 2 Swagger: http://localhost:5002/redoc

---

## Authentication

All inter-node endpoints require the `Authorization` header:

```
Authorization: NodeToken {NODE_TOKEN}
```

Example:
```
Authorization: NodeToken supersecrettoken
```

Missing or invalid tokens receive:
```
401 Unauthorized
{
  "detail": "Invalid authentication credentials"
}
```

---

## Hub Endpoints

### GET /health

**Purpose:** Health check, used by Docker and monitoring

**Response:**
```
200 OK
{
  "status": "ok",
  "node": "hub"
}
```

---

### POST /api/hub/register/

**Purpose:** Store registration with the hub (called by each store on startup)

**Headers:**
```
Authorization: NodeToken supersecrettoken
Content-Type: application/json
```

**Request Body:**
```json
{
  "store_id": 1,
  "store_name": "CodePop Chicago #1",
  "region": "Chicago",
  "api_endpoint": "http://store_1:5002"
}
```

**Response:**
```
201 Created
{
  "store_id": 1,
  "store_name": "CodePop Chicago #1",
  "region": "Chicago",
  "api_endpoint": "http://store_1:5002",
  "is_healthy": true,
  "last_heartbeat": "2026-03-01T12:34:56.789123Z"
}
```

**Error Cases:**
```
400 Bad Request
{
  "detail": "Missing required fields: store_id, store_name, region, api_endpoint"
}

401 Unauthorized
{
  "detail": "Invalid authentication credentials"
}
```

---

### POST /api/hub/heartbeat/

**Purpose:** Store heartbeat (called every 30 seconds by each store)

**Headers:**
```
Authorization: NodeToken supersecrettoken
Content-Type: application/json
```

**Request Body:**
```json
{
  "store_id": 1
}
```

**Response:**
```
200 OK
{
  "status": "heartbeat_received"
}
```

**Error Cases:**
```
401 Unauthorized
{
  "detail": "Invalid authentication credentials"
}

404 Not Found
{
  "detail": "Store not found. Did you register first?"
}
```

---

### GET /api/hub/stores/

**Purpose:** List all registered stores and their health status

**Headers:** (optional)
```
Authorization: NodeToken supersecrettoken
```

**Response:**
```
200 OK
[
  {
    "store_id": 1,
    "store_name": "CodePop Chicago #1",
    "region": "Chicago",
    "api_endpoint": "http://store_1:5002",
    "is_healthy": true,
    "last_heartbeat": "2026-03-01T12:34:56.789123Z"
  },
  {
    "store_id": 2,
    "store_name": "CodePop New Jersey #1",
    "region": "New Jersey",
    "api_endpoint": "http://store_2:5003",
    "is_healthy": true,
    "last_heartbeat": "2026-03-01T12:34:55.123456Z"
  }
]
```

---

### POST /api/hub/find-user/

**Purpose:** Broadcast user search to all healthy stores (internal use by stores)

**Headers:**
```
Authorization: NodeToken supersecrettoken
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "alice@example.com"
}
```

**Response (User Found):**
```
200 OK
{
  "status": "found",
  "store_id": 1,
  "api_endpoint": "http://store_1:5002",
  "user_data": {
    "user_id": 5,
    "username": "alice",
    "email": "alice@example.com"
  }
}
```

**Response (User Not Found):**
```
404 Not Found
{
  "status": "not_found",
  "message": "User not found in any store"
}
```

---

### GET /api/hub/store-location/

**Purpose:** Get a specific store's endpoint (used for P2P setup)

**Headers:**
```
Authorization: NodeToken supersecrettoken
```

**Query Parameters:**
```
?store_id=1
```

**Response:**
```
200 OK
{
  "store_id": 1,
  "store_name": "CodePop Chicago #1",
  "api_endpoint": "http://store_1:5002",
  "is_healthy": true
}
```

**Error Cases:**
```
401 Unauthorized
{
  "detail": "Invalid authentication credentials"
}

404 Not Found
{
  "detail": "Store not found"
}
```

---

## Store Endpoints

### GET /health

**Purpose:** Health check, used by Docker and monitoring

**Response:**
```
200 OK
{
  "status": "ok",
  "store_id": 1,
  "store_name": "CodePop Chicago #1"
}
```

---

### POST /api/auth/register/

**Purpose:** Register a new user at this store

**Request Body:**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```
201 Created
{
  "user_id": 5,
  "username": "alice",
  "email": "alice@example.com",
  "token": "9f86d081884c7d6d9ffd60bb51d3e4f0d5c5b4e3",
  "home_store_id": 1
}
```

**Error Cases:**
```
400 Bad Request
{
  "detail": "Email already registered at this store"
}

422 Unprocessable Entity
{
  "detail": "Password does not meet complexity requirements"
}
```

---

### POST /api/auth/login/

**Purpose:** User login (triggers cross-store discovery if user not found locally)

**Request Body:**
```json
{
  "email": "alice@example.com",
  "password": "SecurePassword123!"
}
```

**Response (Local Hit):**
```
200 OK
{
  "user_id": 5,
  "username": "alice",
  "email": "alice@example.com",
  "token": "9f86d081884c7d6d9ffd60bb51d3e4f0d5c5b4e3",
  "location": "local"
}
```

**Response (Replicated via Hub Discovery):**
```
200 OK
{
  "user_id": 5,
  "username": "alice",
  "email": "alice@example.com",
  "token": "9f86d081884c7d6d9ffd60bb51d3e4f0d5c5b4e3",
  "location": "replicated"
}
```

**Response (Cached Hit):**
```
200 OK
{
  "user_id": 5,
  "username": "alice",
  "email": "alice@example.com",
  "token": "9f86d081884c7d6d9ffd60bb51d3e4f0d5c5b4e3",
  "location": "cached"
}
```

**Error Cases:**
```
401 Unauthorized
{
  "detail": "Invalid credentials"
}

404 Not Found
{
  "detail": "User not found in this store or any other store"
}
```

---

### GET /api/users/

**Purpose:** List all users at this store (for demo/debugging)

**Response:**
```
200 OK
[
  {
    "user_id": 5,
    "username": "alice",
    "email": "alice@example.com",
    "home_store_id": 1,
    "created_at": "2026-03-01T12:00:00.000000Z"
  },
  {
    "user_id": 6,
    "username": "bob",
    "email": "bob@example.com",
    "home_store_id": 2,
    "created_at": "2026-03-01T12:05:30.123456Z"
  }
]
```

---

### GET /api/machines/

**Purpose:** List all machines and their statuses

**Response:**
```
200 OK
[
  {
    "machine_id": 1,
    "name": "Machine 1",
    "status": "NORMAL",
    "last_status_update": "2026-03-01T12:34:56.789123Z"
  },
  {
    "machine_id": 2,
    "name": "Machine 2",
    "status": "WARNING",
    "last_status_update": "2026-03-01T12:30:00.123456Z"
  }
]
```

---

### POST /api/machines/{machine_id}/update-status/

**Purpose:** Update a machine's status (with state machine validation)

**Path Parameters:**
```
machine_id: 1
```

**Request Body:**
```json
{
  "new_status": "WARNING"
}
```

**Response (Valid Transition):**
```
200 OK
{
  "machine_id": 1,
  "name": "Machine 1",
  "status": "WARNING",
  "last_status_update": "2026-03-01T12:35:00.000000Z"
}
```

**Response (Invalid Transition):**
```
422 Unprocessable Entity
{
  "detail": "Invalid transition from NORMAL to OUT_OF_ORDER. Valid transitions: ['WARNING', 'SCHEDULE_SERVICE']"
}
```

**Error Cases:**
```
404 Not Found
{
  "detail": "Machine not found"
}
```

**Valid Status Values:**
```
- NORMAL
- WARNING
- ERROR
- OUT_OF_ORDER
- SCHEDULE_SERVICE
- REPAIR_START
- REPAIR_END
```

---

### POST /api/inter-node/user-lookup/

**Purpose:** Inter-node endpoint: check if this store has a user (called by hub during broadcast)

**Headers:**
```
Authorization: NodeToken supersecrettoken
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "alice@example.com"
}
```

**Response (User Found):**
```
200 OK
{
  "status": "found",
  "user_data": {
    "user_id": 5,
    "username": "alice",
    "email": "alice@example.com"
  }
}
```

**Response (User Not Found):**
```
404 Not Found
{
  "status": "not_found"
}
```

**Error Cases:**
```
401 Unauthorized
{
  "detail": "Invalid authentication credentials"
}
```

---

### POST /api/inter-node/user-sync/

**Purpose:** Inter-node endpoint: receive user data from peer store via P2P

**Headers:**
```
Authorization: NodeToken supersecrettoken
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": 5,
  "username": "alice",
  "email": "alice@example.com",
  "password_hash": "pbkdf2_sha256$260000$..."
}
```

**Response:**
```
200 OK
{
  "status": "synced",
  "user_id": 5,
  "email": "alice@example.com"
}
```

**Error Cases:**
```
400 Bad Request
{
  "detail": "User data incomplete"
}

401 Unauthorized
{
  "detail": "Invalid authentication credentials"
}
```

---

### POST /api/inter-node/health-check/

**Purpose:** Inter-node endpoint: simple liveness probe

**Headers:** (optional)
```
Authorization: NodeToken supersecrettoken
```

**Response:**
```
200 OK
{
  "status": "ok",
  "store_id": 1
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "detail": "Human-readable error message"
}
```

**Common HTTP Status Codes:**

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Request succeeded |
| 201 | Created | New resource created (user, etc.) |
| 400 | Bad Request | Invalid input, missing fields |
| 401 | Unauthorized | Invalid/missing auth token |
| 404 | Not Found | Resource doesn't exist (user, store, machine) |
| 422 | Unprocessable Entity | Invalid state machine transition |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Server is down or overloaded |

---

## Usage Examples

### Example 1: User Registration & Local Login

```bash
# Register user at Store 1
curl -X POST http://localhost:5002/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "MySecurePassword123!"
  }'

# Response:
# {
#   "user_id": 5,
#   "username": "alice",
#   "email": "alice@example.com",
#   "token": "...",
#   "home_store_id": 1
# }

# Login at Store 1 (local hit)
curl -X POST http://localhost:5002/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "MySecurePassword123!"
  }'

# Response:
# {
#   "user_id": 5,
#   "token": "...",
#   "location": "local"
# }
```

### Example 2: Cross-Store User Discovery

```bash
# Try to login at Store 2 (different region)
curl -X POST http://localhost:5003/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "MySecurePassword123!"
  }'

# Response:
# {
#   "user_id": 5,
#   "token": "...",
#   "location": "replicated"  # Indicates P2P replication happened
# }

# Next login at Store 2 (cached hit)
curl -X POST http://localhost:5003/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "MySecurePassword123!"
  }'

# Response:
# {
#   "user_id": 5,
#   "token": "...",
#   "location": "cached"  # Cache hit, no hub query
# }
```

### Example 3: Machine Status Transitions

```bash
# Get current machines
curl http://localhost:5002/api/machines/

# Transition NORMAL → WARNING
curl -X POST http://localhost:5002/api/machines/1/update-status/ \
  -H "Content-Type: application/json" \
  -d '{"new_status": "WARNING"}'

# Response:
# {
#   "machine_id": 1,
#   "name": "Machine 1",
#   "status": "WARNING",
#   "last_status_update": "..."
# }

# Try invalid transition NORMAL → OUT_OF_ORDER (should fail)
curl -X POST http://localhost:5002/api/machines/1/update-status/ \
  -H "Content-Type: application/json" \
  -d '{"new_status": "OUT_OF_ORDER"}'

# Response (422):
# {
#   "detail": "Invalid transition from WARNING to OUT_OF_ORDER. Valid transitions: ['NORMAL', 'ERROR']"
# }
```

### Example 4: Check Hub Store Registry

```bash
# List all registered stores
curl http://localhost:5001/api/hub/stores/

# Response:
# [
#   {
#     "store_id": 1,
#     "store_name": "CodePop Chicago #1",
#     "region": "Chicago",
#     "is_healthy": true,
#     "last_heartbeat": "2026-03-01T12:34:56.789123Z"
#   },
#   {
#     "store_id": 2,
#     "store_name": "CodePop New Jersey #1",
#     "region": "New Jersey",
#     "is_healthy": true,
#     "last_heartbeat": "2026-03-01T12:34:55.123456Z"
#   }
# ]
```

---

**Created:** 2026-03-01
