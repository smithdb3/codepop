# Codepop Low Level Design Document

### Introduction
The purpose of this document is to provide a working description of the product’s system architecture, subsystems, classes, database tables, user interface prototypes, programming languages, libraries, and frameworks that will be used. This document also addresses system performance concerns and potential security risks as well as have a deployment plan for the release of the application. This document borrows heavily from the lasts teams low level design document as many technologies and data structures will remain unchanged. Developers, company management and customers should reference this document to ensure they are on the same page.

### Development plan

#### Sprint Breakdown

* Sprint 1 - 2 Weeks
    * Must have basic functionality 
    * Function over form
* Sprint 2 - 2 Weeks
    * Start implementing should haves and polishing existing features 
    * Implement must haves that weren't completed from previous sprint  
* Sprint 3 - 1 Week
    * Create user manual
    * Test
    * Ensure the application is release ready 

### Sprint Outline

**Sprint 3**

Tasks that need to be completed:
- Implement Decentralized Node Network
  - P2P communication
  - Authentication 
  - Setup GCP
- Add new staff Dashboards
  - Repair Staff
  - Super Admin
  - Logistics Manger
- Add new database Tables
  - Machine table 
  - Schedule table
  - Super Admin table
  - Repair Staff table
  - Logistics Manager table
  - Region table 
  - Supply Hub table
- Set up API integration
  - Setup Maxbox
  - Setup Stripe

**Sprint 4**
- Update UI
  - Change Colors
  - Update customer Dashboard
  - Add darkmode option
  - Update manager dashboard
  - Update Admin dashboard
- Update Old Staff Roles
  - Admin
  - Manager
- Create Test Data 
- Finish critical features from sprint 3

**Sprint 5**

- Feature freeze
- Begin testing
- Create User Manual

### All Tasks Outline

#### UI/UX

+ Standardize UI features across the entire application
  + Create a UI design rules document and place under `.claude/codepop`
    + Define color scheme standards
    + Define logo usage
    + Define button styles and font specifications
  + Apply UI rules consistently across all pages and screens based on the rules document
+ Add new staff dashboards
  + Implement Logistics Manager dashboard
  + Implement Super Admin dashboard
  + Implement Repair Staff dashboard
+ Update all dashboards with new customer-requested features
  + Update manager role restrictions and access controls
+ Implement light/dark mode toggle across the application
+ Add rewards program page with points tracking and redemption interface

#### General User Features

+ Implement nearest store finder based on geolocation

#### Logistics Manager Features

+ Implement logistics optimization bot
+ Implement supply request approval and denial workflow

#### Repair Staff Features

+ Implement CSV schedule upload functionality
+ Implement schedule viewing interface
+ Implement machine status update capabilities

#### Database Tables

+ Add Machine table (tracks robotic machine inventory and status)
+ Add Schedule table (tracks repair staff schedules)
+ Add Super Admin table (tracks super admin accounts and permissions)
+ Add Repair Staff table (tracks repair staff accounts and assignments)
+ Add Logistics Manager table (tracks logistics manager accounts and regional assignments)
+ Add Region table (tracks regional supply hubs and associated stores)
+ Add Supply Hub table (tracks supply hub inventory and operations)

#### Decentralized Node Network Implementation

+ Set up Google Cloud Platform (GCP) infrastructure for distributed deployment
+ Create store and supply hub data models and initial configurations
+ Implement P2P communication protocols
  + Implement store-to-store communication
  + Implement store-to-hub communication
  + Implement hub-to-hub communication
+ Implement user information replication across regional nodes
+ Implement revenue aggregation from distributed stores
+ Implement certificate-based authentication between nodes
+ Implement token-based authentication between nodes

#### Machine Tracking

+ Implement machine status update functionality (change operational states)
+ Implement store query mechanism for retrieving machine status from peer stores
+ Implement repair tracking system to maintain repair history

#### API Integration

+ Integrate Stripe payment processing and implement fake money system for testing
+ Implement Stripe encryption for securing payment transactions
+ Integrate Mapbox for geolocation services
+ Implement ETA calculation based on user geolocation and order queue
+ Update customer service chatbot with Google Dialogflow integration

#### Testing

+ Review existing test coverage in `codepop_backend/backend/tests.py` and add missing edge-case tests
+ Ensure comprehensive testing coverage for all new and updated features:
  + Geolocation features (store discovery, ETA calculation)
  + UI visual consistency (color scheme, fonts, images) across all pages
  + Logistics Manager dashboard and all associated features
  + Repair Staff dashboard and all associated features
  + Super Admin dashboard and all associated features
  + All new database tables (Machine, Schedule, Super Admin, Repair Staff, Logistics Manager, Region, Supply Hub)
  + Decentralized node network implementation including:
    + Peer-to-peer communication between stores and hubs
    + User information replication across regions
    + Revenue aggregation functionality
    + Certificate and token authentication protocols
  + Machine tracking in databases and dashboards
  + Data access control for all user roles (customer, manager, admin, logistics manager, repair staff, super admin)
  + Stripe payment system integration

#### Test Data Creation

+ Create test data for stores and supply hubs across all regions
+ Create test user accounts for each role type
+ Create test Super Admin accounts and configurations
+ Create test Admin accounts and configurations
+ Create test Logistics Manager accounts and regional assignments
+ Create test Manager accounts and store assignments
+ Create test Repair Staff accounts and regional assignments
+ Create test machine inventory data with various statuses
+ Create test repair staff schedules with various scenarios


## System Architecture

### Federated Distributed System

The High Level Design specifies a future transformation to a **federated distributed architecture** where multiple stores operate independently with regional coordination. This section describes the target architecture.

### Network Topology

CodePop will evolve into a **flat hub mesh with 7 equal regional supply hubs**. Hub-to-hub connections are hardcoded static addresses (no dynamic discovery).

**Note:** Hub-to-hub connections are hardcoded static addresses; all hubs know each other's endpoints via configuration (no dynamic hub discovery).

### Store Discovery & Registration

**Store Registration on Startup:**
1. **Node Identification**: Store reads local configuration (store_id, region, location coordinates)
2. **Hub Contact**: Store connects to regional hub via HTTPS
3. **Registration Request**: POST to `/api/hub/register/` with payload:
```json
{
  "store_id": 42,
  "store_name": "CodePop Chicago #1",
  "region": "Chicago",
  "latitude": 41.8781,
  "longitude": -87.6298,
  "api_endpoint": "https://store42.codepop.local"
}
```
4. **Hub Response**: Hub returns registration acknowledgment and list of other active stores in region
5. **Cache Update**: Store stores registry in local cache for peer discovery during partition

**Hub Registry Management:**
- Hub maintains in-memory registry of all stores in region
- Registry persists to PostgreSQL for recovery after hub restart
- Heartbeat every 30 seconds from each store; timeout after 3 failures (90 seconds)
- Failed stores marked as unavailable; mobile clients redirected to healthy stores

**User Lookup Protocol:**
1. Store needs to locate a user's home store
2. Queries regional hub: `POST /api/hub/user-lookup/` with user email
3. Hub responds with home store's API endpoint (same-region) or broadcasts to other hubs (cross-region)
4. Store directly contacts home store (P2P) to fetch user data

---

### Store Startup Sequence

**Initialization Order (Critical):**
1. **Database Connection** (must succeed)
   - Connect to local PostgreSQL
   - Verify schema version matches expected
   - Fail fast if DB unavailable; store cannot operate
2. **Configuration Load**
   - Read `config.json`: store_id, region, regional_hub_url, etc.
   - Load `INTER_NODE_SECRET` from environment (per-node shared secret)
3. **Register with Regional Hub**
   - POST to hub's `/api/hub/register/` endpoint
   - Retry with exponential backoff (1s, 2s, 4s, 8s)
   - Log warning if hub unreachable; continue with cached registry
4. **Bootstrap Local Data** (if new store or DB reset)
   - Seed catalog drinks from CSV/API
   - Initialize empty inventory (manager will replenish)
   - Create admin user account
5. **Start API Server**
   - Django server listens on configured port
   - Health check endpoint returns 200 OK
   - Accept client connections
6. **Start Background Services**
   - Celery worker for async tasks
   - Event queue processors
   - Heartbeat task to hub (every 30 seconds)
7. **Ready for Operations**
   - Log "Store startup complete"
   - Begin accepting orders

**Graceful Shutdown Sequence:**
1. Stop accepting new connections
2. Wait for in-flight requests (timeout: 10 seconds)
3. Deregister from hub
4. Shutdown Celery workers
5. Close database connection

**Data Bootstrap Sources:**
- **Drink Catalog**: Seeded from CSV or admin upload on first startup
- **Inventory**: Start empty; manager creates items via UI
- **User Data**: Lazy-loaded on first login attempts
- **Machine Data**: Manager configures machines post-deployment

---

### Store Autonomy & Resilience

- **Each store runs its own complete backend stack**: Django API + PostgreSQL database
- **Operational independence**: Stores continue functioning during hub/peer outages
- **Local data ownership**: Orders, inventory, revenue, machine status never leave the local database
- **Fault isolation**: Problems at one store do not cascade to others

---

### Hub-Store Communication

**Store Registration (on startup):**
- Store registers with its regional hub
- Hub maintains a directory of operational stores

**Peer Discovery:**
- When Store A needs data from Store B, it queries the hub for Store B's address
- Hub provides Store B's IP/endpoint

**Direct P2P Communication:**
- Once Store B's address is known, Store A communicates directly with Store B
- Bypasses hub for data transfer (reduces latency and hub load)

**Logistics Coordination:**
- Supply requests, machine status updates flow through hub
- Hub aggregates regional inventory and maintenance schedules

---

### Data Replication Strategy

**Replicated Data (Lazily synchronized):**
- User accounts and authentication
- User preferences (for personalization)
- User roles (for access control)
- Drink catalog (standard catalog drinks)
- Store registry and hub information

**Local Data (Never replicated):**
- Orders (each store owns its order history)
- Inventory (each store tracks its own stock)
- Revenue (financial data stays local)
- Notifications (user-specific alerts)
- Machine status (local operational metrics)

**Lazy Replication Model:**
- User data does NOT automatically replicate to all stores
- User data syncs ON-DEMAND when user logs into a new store for the first time
- After first login, user data is cached locally for fast subsequent logins

**Rationale for Lazy Replication:**
- **Scalability**: Replicating millions of accounts to thousands of stores is prohibitively expensive
- **Data locality**: Users typically frequent the same store; local caching is efficient
- **Reduced network traffic**: Only active users generate sync traffic
- **Privacy**: User data only exists at stores they have visited

---

### Cross-Region User Discovery

When a user travels to a different region (e.g., Logan, UT user visiting New York, NY):

```mermaid
sequenceDiagram
    participant User
    participant NYStore as NY Store
    participant NYHub as NY Hub
    participant OtherHubs as Other Hubs<br/>(6 total)
    participant LoganHub as Logan Hub
    participant LoganStore as Logan Store

    User->>NYStore: Login attempt (alice@example.com)
    NYStore->>NYStore: Check local database
    Note over NYStore: User NOT FOUND locally
    NYStore->>NYHub: Query: Find user?
    NYHub->>OtherHubs: Broadcast: Find alice@example.com?
    OtherHubs-->>NYHub: No match (5 hubs)
    LoganHub-->>NYHub: YES! Found at Logan Store #001
    NYHub->>NYStore: User located: Logan Store
    NYStore->>LoganStore: Direct P2P: Request user data
    LoganStore->>NYStore: Transfer user profile + preferences + role
    NYStore->>NYStore: Cache user data locally (24h TTL)
    NYStore->>User: Login successful ✓

    Note over NYStore,LoganStore: Subsequent logins use cached data
    User->>NYStore: Login attempt (2nd visit)
    NYStore->>NYStore: Found in local cache
    NYStore->>User: Login successful ✓
```

**Flow Details:**
1. **Discovery Phase**: NY Store checks local database → user not found → queries NY Hub
2. **Hub Broadcast**: NY Hub broadcasts to 6 other regional hubs asking for the user
3. **Peer Response**: Logan Hub responds with user location (Logan Store #001) and endpoint
4. **Direct Transfer**: NY Store requests user data directly from Logan Store (P2P) via `POST /api/inter-node/user-sync/`
5. **Local Caching**: NY Store caches user data in `VisitingUserCache` table with 24h TTL; user logs in successfully
6. **Subsequent Logins**: Subsequent NY Store logins use cached data (no hub/peer queries needed)
7. **Cache Expiration**: After 24 hours, cached data is automatically deleted; next login triggers re-fetch

---

### Same-Region User Discovery

When a user travels to a different store within the same region (e.g., NY user visiting another NY store):

```mermaid
sequenceDiagram
    participant User
    participant StoreB as Store B
    participant NYHub as NY Hub
    participant StoreA as Store A (Home)

    User->>StoreB: Login attempt (alice@example.com)
    StoreB->>StoreB: Check local database
    Note over StoreB: User NOT FOUND locally
    StoreB->>NYHub: Query: Find user?
    NYHub->>NYHub: Check regional directory
    Note over NYHub: Found in NY region
    NYHub->>StoreB: Home store: Store A (endpoint)
    StoreB->>StoreA: Direct P2P: POST /api/inter-node/user-sync/
    StoreA->>StoreB: Transfer user profile + preferences + role
    StoreB->>StoreB: Cache user data locally (24h TTL)
    StoreB->>User: Login successful ✓

    Note over StoreB,StoreA: Subsequent logins use cached data
    User->>StoreB: Login attempt (2nd visit)
    StoreB->>StoreB: Found in VisitingUserCache
    StoreB->>User: Login successful ✓
```

**Flow Details:**
1. **Local Check**: Store B checks its local database → user not found
2. **Hub Query**: Store B queries NY Hub for user location
3. **Hub Response**: NY Hub checks its regional directory → responds with Store A endpoint
4. **Direct Transfer**: Store B fetches user data directly from Store A (P2P)
5. **Cache**: Store B caches in `VisitingUserCache` with 24h TTL
6. **Subsequent Logins**: Cached data used (no queries needed) until cache expires

---

### Profile Update Propagation

When a user updates their profile (preferences, favorites, account details) at a visiting store:

**Optimistic Update & Immediate Propagation:**

```mermaid
sequenceDiagram
    participant User
    participant VisitingStore as Visiting Store
    participant UI as Mobile UI
    participant HomeStore as Home Store
    participant Queue as Encrypted Queue<br/>(if unreachable)

    User->>UI: Update preferences
    UI->>VisitingStore: POST /profile/update
    VisitingStore->>UI: Apply optimistic update (show immediately)
    VisitingStore->>HomeStore: POST /api/inter-node/profile-update/
    alt Home Store Reachable
        HomeStore->>HomeStore: Apply & persist change
        HomeStore->>VisitingStore: 200 OK { confirmed_data }
        VisitingStore->>VisitingUserCache: Update with confirmed values
        UI->>User: Change saved ✓
    else Home Store Unreachable
        VisitingStore->>Queue: Persist encrypted update
        UI->>User: Saving in background...
        Note over Queue: Retry with backoff: 1s → 2s → 4s → 8s → ...
        Queue-->>HomeStore: Retry delivery when reachable
        alt Update Succeeds
            HomeStore->>VisitingStore: 200 OK
            VisitingStore->>VisitingUserCache: Update cache
            UI->>User: Change synced ✓
        else Max Retries Exceeded
            Queue-->>UI: Notification: "Change couldn't sync"
            UI->>User: In-app notification
        end
    end
```

**Detailed Flow:**

1. **Optimistic UI Update**: User makes change → UI shows change immediately (no waiting for server)
2. **Propagation Attempt**: Visiting store sends `POST /api/inter-node/profile-update/` directly to home store
3. **If Home Store Reachable**:
   - Home store applies change and persists to database
   - Home store returns confirmed data back to visiting store
   - Visiting store updates its `VisitingUserCache` with confirmed values
   - User sees "Change saved ✓"
4. **If Home Store Unreachable**:
   - Change is queued in encrypted local storage (`PendingProfileUpdates` table, AES-256 encrypted)
   - UI shows "Saving in background..."
   - Queue processor retries delivery with exponential backoff: 1s, 2s, 4s, 8s, ...
   - Queue survives container restarts (persisted to local DB)
5. **Retry Exhaustion**:
   - If max retry period exceeded (e.g., 24 hours): stop retrying
   - User notified in app: "Your profile change couldn't be saved. Please try again when your home store is reachable."
   - Queued update remains in local storage (can be manually retried or will retry on next startup)

**Queue Implementation:**

```python
# PendingProfileUpdates table (in VisitingUserCache DB)
class PendingProfileUpdate(models.Model):
    user_id = models.IntegerField()
    changes = models.JSONField()  # encrypted in DB
    created_at = models.DateTimeField(auto_now_add=True)
    retry_count = models.IntegerField(default=0)
    next_retry_at = models.DateTimeField()
    max_retry_datetime = models.DateTimeField()  # 24h from creation
```

**Conflict Resolution:**

If the home store receives conflicting updates for the same user from multiple visiting stores, the **last-write-wins** rule applies:
- Home store compares timestamps
- Later write takes precedence
- Visiting stores that sent earlier updates will receive the authoritative data on next login/sync

---

#### 2.1.8 Revenue Aggregation

**Local Level:**
- Each store maintains its own revenue records
- Managers can view store-level revenue via local dashboard

**Regional Level:**
- Logistics manager requests regional report
- Regional hub queries all stores in region for revenue data
- Hub aggregates results

**National Level:**
- Super admin requests nationwide revenue report
- Dashboard queries all 7 regional hubs in parallel
- Results aggregated client-side (sum revenue across all hubs)

---

### Machine Status Monitoring

Each robotic machine tracks operational status through a **state machine**:

```mermaid
stateDiagram-v2
    [*] --> NORMAL

    NORMAL --> WARNING: Issue Detected
    NORMAL --> SCHEDULE_SERVICE: Routine Maintenance

    WARNING --> NORMAL: Resolved
    WARNING --> ERROR: Critical Failure

    ERROR --> NORMAL: Fixed
    ERROR --> OUT_OF_ORDER: Complete Failure

    SCHEDULE_SERVICE --> REPAIR_START: Assign Technician
    OUT_OF_ORDER --> REPAIR_START: Assign Technician

    REPAIR_START --> REPAIR_END: Work Completed

    REPAIR_END --> NORMAL: Testing Passed
    REPAIR_END --> ERROR: Issues Found
```

**State Descriptions:**
- **NORMAL**: Machine operational, all systems nominal
- **WARNING**: Minor issue detected, monitoring increased
- **ERROR**: Critical system failure, order intake paused
- **OUT_OF_ORDER**: Machine non-functional, repair staff assigned
- **SCHEDULE_SERVICE**: Routine maintenance scheduled
- **REPAIR_START**: Technician on-site, service in progress
- **REPAIR_END**: Repair completed, testing underway

**Real-time Updates:**
- Stores push machine status changes to regional hub
- Hub dashboard provides live health monitoring for repair staff
- Repair staff can filter/prioritize machines by region and status
- Alert escalation when machines enter WARNING or ERROR states

---

### Technology Stack

#### Frontend
- **Framework**: React Native
- **Key Libraries**:
  - React Navigation: Screen routing and navigation
  - Axios: HTTP requests to backend API
  - AsyncStorage: Local persistent data (userToken, userId, userRole, checkoutList)
  - Stripe React Native SDK: Payment processing

#### Backend
- **Framework**: Django with Django REST Framework
- **Authentication**: Token-based authentication (djangorestframework.authtoken)
- **Database**: PostgreSQL 15
- **Asynchronous Processing**: Celery + Redis (planned for distributed architecture)
- **Key Libraries**:
  - psycopg2: PostgreSQL database adapter
  - stripe: Stripe payment API client
  - scikit-learn: ML-based drink recommendations
  - pandas: Data manipulation for ML models
  - transformers + torch: HuggingFace NLP chatbot

#### Infrastructure
- **Containerization**: Docker + Docker Compose (current single-store setup)
- **Database-per-Store**: Each location will have independent PostgreSQL instance
- **Cloud Deployment (Planned)**: Google Cloud Platform (GCP) chosen for:
  - Cost-effectiveness (25% cheaper than Azure)
  - Superior student credits ($300 free trial)
  - Excellent Django support

#### External Services
- **Stripe**: Payment processing (PCI-DSS compliant; no raw card data stored)
- **Mapbox**: Geolocation and proximity tracking
- **Firebase Cloud Messaging (FCM)**: Cross-platform push notifications
- **Dialogflow ES**: NLP-based customer service chatbot
- **Gemini API**: AI-generated decorative graphics for app loading screens

---

### Inter-Node Communication Protocol

**Protocol Details:**
- **Transport**: HTTPS/TLS 1.3 for all inter-node communication
- **Authentication**: Token-based shared secret (Sprint 3); JWT RS256 planned for future
  - Each node has `INTER_NODE_SECRET` per-node shared secret
  - All requests include `Authorization: NodeToken {INTER_NODE_SECRET}` header
  - Endpoints under /api/hub/ and /api/inter-node/ reject requests without valid token (401)
- **Content Type**: JSON with UTF-8 encoding
- **Timeouts**:
  - Connection timeout: 5 seconds
  - Read timeout: 10 seconds
  - Max request size: 10MB
- **Retry Logic**: Exponential backoff (1s, 2s, 4s, 8s) for transient failures

**Inter-Node REST Endpoints:**
```
POST /api/hub/user-lookup/                 # Store queries hub to find user's home store
POST /api/hub/user-broadcast/              # Hub broadcasts cross-region user lookup to other hubs
POST /api/inter-node/user-sync/            # Store fetches user data from home store (P2P)
POST /api/inter-node/profile-update/       # Store pushes profile change to home store
POST /api/inter-node/status-update/        # Machine/store status update to hub
GET /api/inter-node/store-registry/        # Retrieve list of stores from hub
POST /api/inter-node/supply-request/       # Submit supply request to hub
POST /api/inter-node/health-check/         # Peer availability check
```

**Request/Response Format:**
```json
// User Lookup Request (POST /api/hub/user-lookup/)
{
  "email": "user@example.com",
  "requesting_store_id": 42
}

// User Lookup Response (Same-Region or Hub Response)
{
  "status": "found",
  "home_store_id": 101,
  "home_store_endpoint": "https://store101.codepop.local"
}

// User Sync Request (POST /api/inter-node/user-sync/ to home store)
{
  "email": "user@example.com",
  "requesting_store_id": 42
}

// User Sync Response (Allowed Fields Only)
{
  "user_id": 5,
  "username": "alice",
  "email": "user@example.com",
  "hashed_password": "$2b$12$...",  // Django PBKDF2 hash only
  "preferences": ["Coconut", "Fruity"],
  "favorite_drinks": [42, 87, 105],
  "role": "customer"
}

// Profile Update Request (POST /api/inter-node/profile-update/ to home store)
{
  "user_id": 5,
  "changes": {
    "preferences": ["Fruity", "Sweet"],
    "favorite_drinks": [42, 87, 110]
  },
  "timestamp": "2026-03-15T10:30:00Z"
}

// Profile Update Response
{
  "status": "success",
  "user": {
    "user_id": 5,
    "username": "alice",
    "email": "user@example.com",
    "hashed_password": "$2b$12$...",
    "preferences": ["Fruity", "Sweet"],
    "favorite_drinks": [42, 87, 110],
    "role": "customer"
  }
}
```

**Important:** The following fields are NEVER transmitted between nodes:
- Raw passwords (only hashed values)
- Payment methods, card details
- Stripe customer IDs
- Any other sensitive financial data

---

### Data Synchronization & Conflict Resolution

**Lazy Replication Strategy:**
- User data syncs **only on-demand** when user logs into new store
- No background sync process; on-demand queries happen in real-time
- After first successful sync, data cached locally for 24 hours
- Cache invalidation: Manual refresh via API or automatic expiration

**Conflict Resolution Rules:**

| Scenario | Rule | Resolution |
| :---- | :---- | :---- |
| User updates profile at visiting store while home store is reachable | Immediate propagation | Visiting store sends update immediately to home store; home store response is authoritative |
| User updates profile at visiting store while home store is unreachable | Queued update | Change queued in encrypted local storage; retried with exponential backoff (1s, 2s, 4s, 8s) |
| Queued update exceeds max retry period | Notification | User notified in app that change may not be persisted yet |
| User updates preferences at Store A, then logs in at Store B | Store A is authoritative | Store B fetches fresh data from home (Store A); overwrites local cache |
| User's favorite drinks differ between stores | Union approach | Merge favorite lists; Store B gets all of Store A's favorites |
| Duplicate user records created | Merge | Consolidate into single record; redirect references |

**Consistency Model:**
- **Eventual Consistency** for replicated data (user preferences, roles)
- **Strong Consistency** for local data (orders, inventory, revenue)
- **Conflict-Free Replicated Data Type (CRDT)** consideration for future: use for favorite drinks list (append-only set)

---

### Fallback Scenarios & Error Handling

**Hub Unavailability:**
- **Impact**: Store continues operating; new users cannot be discovered from other regions
- **Fallback**: Stores maintain local user cache; queries timeout gracefully
- **Recovery**: Automatic retry after 30 seconds; manual hub reconnection after 5 minutes
- **User Experience**: Non-local users see error message with estimated wait time

**Home Store Unreachable:**
- **Impact**: Cannot fetch user data from home store; user login may fail
- **Fallback**:
  - If visiting user cache exists (data from prior visit within 24h): serve cached data → user can log in
  - If no cached data: deny login with friendly error: "Your home store is currently unreachable. Please try again later."
- **Recovery**: Automatic retry with exponential backoff when connectivity restored
- **HTTP Status**: Return 503 Service Unavailable if no cache available
- **Cached Data**: Cached data from prior visits remains accessible for 24 hours even if home store goes offline

**Network Partition (Store isolated):**
- **Impact**: Store operates independently; orders processed normally
- **Fallback**: All operations queued locally; sync when connectivity restored
- **Outbound**: Status updates queued in Celery; processed when hub available
- **Recovery**: Automatic reconciliation when partition heals; manual override for conflicts

**Database Failure (Local PostgreSQL down):**
- **Impact**: All API operations fail; machine maintenance halts
- **Recovery**: Failover to replica (if configured); manual intervention required
- **User Experience**: Immediate 503 error; recommend contact store management

**Profile Update Retry Exhausted:**
- **Impact**: Queued profile update never delivered to home store after max retry period
- **Fallback**: Stop retrying; user notified in app
- **User Experience**: In-app notification: "Your profile change couldn't be saved to the server. Please try again when your home store is reachable."
- **Data**: Queued update remains in local encrypted queue; can be manually retried when home store is healthy

---

### Inter-Node Authentication & Authorization

**Node Identity & Trust:**
1. **Node Shared Secret**: Each node has a unique `INTER_NODE_SECRET` from environment configuration
   - Store: `export INTER_NODE_SECRET=store42-shared-secret-xyz`
   - Hub: `export INTER_NODE_SECRET=hub-chicago-shared-secret-abc`
2. **Token Format**: Current (Sprint 3) uses shared secret; JWT RS256 planned for future upgrade
   - Current: `Authorization: NodeToken {INTER_NODE_SECRET}`
   - Future: JWT with RS256 signature, 1-hour expiration
3. **Request Validation**:
   - All /api/hub/ and /api/inter-node/ endpoints require `Authorization: NodeToken {INTER_NODE_SECRET}` header
   - Requests without valid token receive 401 Unauthorized
   - Token is validated on every request (no caching)

**Authorization Rules:**
- **Store → Hub**: Can submit supply requests, status updates, revenue reports
- **Hub → Store**: Can query store data, trigger machine status changes, send user lookup responses
- **Store → Store (P2P)**: Can exchange user data for verified users (after hub confirmation)
- **Hub → Hub**: Can receive broadcasts for cross-region user lookups; respond with user location

**Rate Limiting:**
- Inter-node endpoints have rate limits to prevent abuse by compromised nodes
- Recommended: 100 requests/minute per node, with burst allowance for legitimate traffic
- Exceeding limits returns 429 Too Many Requests

In the distributed architecture, stores and hubs communicate via:

- **REST APIs** for synchronous requests (user lookup, user sync, profile update)
- **Event queues** (Celery + Redis) for asynchronous messaging (status updates, alerts)
- **HTTPS/TLS 1.3** for all communications (encryption in transit)
- **Token authentication** between nodes (all requests must include NodeToken header)
- **Hardcoded hub discovery**: All hub endpoints known via static config (no dynamic discovery)
- **Audit logging**: All inter-node transfers logged with timestamp, requesting node, data type, success/failure

---

### Data Flow Example: User Placing an Order

```mermaid
sequenceDiagram
    participant User
    participant App as React Native App
    participant Backend as Django Backend
    participant DB as PostgreSQL
    participant Stripe as Stripe API
    participant FCM as Firebase FCM

    User->>App: Open app
    App->>App: Load backend URL (ip_address.js)

    User->>App: Login
    App->>Backend: POST /auth/login
    Backend->>DB: Validate credentials
    DB-->>Backend: User found
    Backend-->>App: Return auth token
    App->>App: Store token in AsyncStorage

    User->>App: Browse & customize drink
    App->>App: Add to cart (local AsyncStorage)

    User->>App: Proceed to checkout
    App->>Backend: POST /orders/ (with drinks list)
    Backend->>DB: Create Order object
    Backend->>DB: Add Drinks via M2M
    DB-->>Backend: Order created
    Backend->>Stripe: Create payment intent
    Stripe-->>Backend: Return client_secret
    Backend-->>App: Return client_secret

    App->>Stripe: Confirm payment (SDK)
    Stripe->>Stripe: Tokenize card (client-side)
    Stripe->>Backend: Webhook: payment_intent.succeeded
    Backend->>DB: Update Order.PaymentStatus = 'paid'
    Backend->>DB: Generate & store LockerCombo
    Backend->>DB: Create Revenue record
    Backend->>DB: Mark Order.OrderStatus = 'processing'

    Backend->>FCM: Send push notification
    FCM-->>User: "Your drink is ready!"

    User->>App: Receive notification
    App->>Backend: Query order status
    Backend->>DB: Fetch Order + LockerCombo
    DB-->>Backend: Return order details
    Backend-->>App: Display locker code

    User->>Backend: [At store] Enter LockerCombo
    Backend->>DB: Verify LockerCombo matches Order
    DB-->>Backend: Valid!
    Backend->>Backend: Signal robotic machine
    Note over Backend: Robotic machine dispenses drink

    User->>User: Collect drink from locker
```

---

Subsystems and UML Class Diagrams

* App objects: 

```mermaid
classDiagram
        class User {
        -username: String
        -password: String
        -email: String
        -preferences: Preferences
        -isLoggedIn: Boolean
        +signIn(username:String, password:String): Boolean
        +createUser(username:String, password:String): Boolean
        +updatePreferences(preferences: List<String>): void
        +savePreferences(): void
        +logout(): void
    }

    class Cart {
        -drinks: List<Drink>
        -totalPrice: Float
        -userId: String
        +addDrink(drink: Drink): void
        +removeDrink(drinkId: String): void
        +getCartItems(): List<Drink>
        +calculateTotal(): Float
        +checkout(paymentDetails: PaymentDetails): Boolean
    }

    class Drink {
        -drinkId: String
        -name: String
        -size: String
        -ingredients: List<String>
        -price: Float
        +createDrink(ingredients: List<String>, size: String): Drink
        +updateDrink(drinkId: String, updatedDetails: Drink): void
        +getDrinkDetails(drinkId: String): Drink
        +calculatePrice(): Float
    }

    class Admin {
        -adminId: String
        -name: String
        -email: String
        -permissions: List<String>
        +createManager(managerDetails: Manager): void
        +createRepairStaff(repairStaffDetails: RepairStaff): void
        +updateUser(userId: String, updatedDetails: User): void
        +deleteUser(userId: String): void
    }

    class SuperAdmin {
        -superAdminId: String
        -name: String
        -email: String
        -permissions: List<String>
        +createManager(managerDetails: Manager): void
        +createAdmin(adminDetails: Admin): void
        +createRepairStaff(repairStaffDetails: RepairStaff): void
        +createLogisticsManager(logisticsManagerDetails: LogisticsManager): void
        +updateUser(userId: String, updatedDetails: User): void
        +deleteUser(userId: String): void
    }

    class RepairStaff {
        -repairStaffId: String
        -name: String
        -email: String
        +viewMachineStatus(regionId:String): List<MachineStatus>
        +trackPendingRepairs(): List<Machine>
        +logRepairAction(machineId:String, action:String, notes:String): void
        +updateMachineStatus(machineId:String, status:String): void
        +uploadSchedule(csvFile: CSV): void
        +viewSchedule(): list<Schedule>
    }

    class Manager {
        -managerId: String
        -name: String
        -email: String
        -permissions: List<String>
        +getData(): DashboardData
        +updateDrink(drinkId: String, updatedDetails: Drink): void
        +resolveComplaint(complaintId: String, resolution: String): void
        +viewComplaints(): List<Complaint>
    }

    class Complaints {
        -userId: String
        -message: String
        +submitComplaint(userId: String, Location: string, message: String): void
        +getComplaints(): List<Complaints>
    }

    class Preference {
        +int PreferenceID
        +int UserID
        +String Preference
        +updatePreferences(preferences: List<String>): void
    }

    %% relationships
    User --> Cart
    Cart --> Drink
    User <|-- Admin
    User <|-- SuperAdmin
    User <|-- Manager
    User <|-- RepairStaff
    User --> Complaints
    User --> Preference
    Manager --> Complaints
    Admin --> Complaints
    SuperAdmin --> Complaints
```


* Customer user flow:  

```mermaid
flowchart TD
    %% start
    A([Launch App])
    A --> B[Splash Screen]
    B --> C[Home Page]

    %% authentication loop
    C --> D{Logged in?}
    D -->|no| E[Login Page]
    D -->|yes| F{Part of Staff?}
    E --> F
    F -->|no| L[User Dashboard]
    F -->|yes| M[Specific Staff Dashboard]
    M <-->|part of staff| L

    %% main purchase path
    L --> G[Create Drink]
    G --> H[Add to Cart]
    H --> I{Payment}
    I --> J[Confirmation]
    J --> K([Drink Rating])

    %% labels / descriptions (optional)
    %% (removed empty click statement to avoid parse error)
    classDef startEnd fill:#2d6a4f,stroke:#2d6a4f,color:#fff;
    classDef page fill:#393e46,stroke:#ffe066,color:#fff;
    classDef action fill:#1b262c,stroke:#0f4c75,color:#00b4d8;
    classDef decision fill:#1b262c,stroke:#0f4c75,color:#00b4d8;
    classDef userEnd fill:#bb9457,stroke:#bb9457,color:#fff;

    class A startEnd;
    class B,C,E,J,L,M page;
    class G,H action;
    class I decision;
    class K userEnd;

    %% descriptions could be added as subtext if your renderer supports it
    %% e.g. B:::page; B["Splash Screen<br/><small>Brief introduction</small>"]
``` 
 

## User interfaces:

### Accessibility

The CodePop interface is carefully designed to support both usability and accessibility, adhering to the Web Content Accessibility Guidelines (WCAG). A color palette has been selected based on an analysis of common forms of color blindness, ensuring that problematic combinations like teal and purple are not placed next to each other for better readability. Each page is fully compatible with screen readers, offering audio feedback for users with visual impairments. Additionally, tab-controlled navigation is integrated, allowing keyboard users to easily move through the interface without relying on a mouse, ensuring a more inclusive user experience.

### Flow and design for page layout

**(M) Nav bar**

* Home page  
* Drink design page
* Cart button
* Chat page
* Profile page

**(M) Home page**

* (S) Seasonal drinks menu carousel
* If not signed in:
  * (M) Large CodePop logo displayed
  * (S) "Sign in or create an account" message
  * (S) Email input field
  * (S) "Continue with email" button
    * If email recognized → navigate to password entry screen
    * If email not recognized → navigate to sign-up screen with email pre-filled
* If signed in:
  * (S) CodePop logo in header bar
  * (M) Generate random button (from AI) - 2 options:
    * (S) Generate based off my preferences
    * (S) Try something new
  * (M) Saved drinks - with options to delete or add to cart (UI for size selection follows 'add to cart' button)
  
**(M) Sign-in page**

* Email/Username Input
* Password Input with Toggle (Show/hide password icon)
* "Forgot Password" Link
* Sign-Up Link
* Error Messages - red error message at top of the screen

  Additional Features (C): 
* Social Login (Google, Apple sign-in) 
* "Remember Me" Checkbox
* Biometric Login (Face ID / Fingerprint on mobile)
  * (React Native supports this)
* Two-Factor Authentication (2FA)- accounts with saved payment info
* Goes to a tutorial of how to use app after signed in - skip button optional

**(M) Sign-up/Create Account Page**

* Email Input
  * Real-time validation: check email format and if email already exists
  * Error message if email taken: "This email is already registered. Sign in instead?"
* Password Input with Toggle (Show/hide password icon)
  * Real-time password strength indicator (visual bar: Weak → Medium → Strong)
  * Display requirements: "8+ characters, uppercase, lowercase, number, special character"
  * Error message if password weak: "Password must include uppercase, lowercase, number, and special character"
* Confirm Password Input with Toggle
  * Error message if passwords don't match: "Passwords do not match"
* Terms & Conditions Checkbox (Required to proceed)
  * Error message if unchecked: "You must accept the Terms & Conditions to continue"
  * Link to Terms and Privacy Policy (policy found in codepop/misc)
* Error Messages
  * Red error message at top of the screen for all validation failures
* Create Account Button
* Sign-In Link ("Already have an account? Sign in")

  Additional Features (C):
* Social Login (Google, Apple sign-in)
* Store Selection during Signup
  * Allows user to set home store for preferences and lazy replication
* Preference Onboarding (skippable)
  * Ask simple preference questions (favorite flavors) to bootstrap AI recommendations
* Email Verification Flow
  * Send verification email post-signup
  * Show: "Check your email to verify your account"
  * "Resend verification email" button if not received
  * Link expires handling: "Verification link expired. Request new link?"
* Geolocation Permission Prompt
  * Ask post-signup, not during (reduces friction)
  * Explain: "We'll use this to find nearby CodePop locations"
* Tutorial/Onboarding (skip button optional)
  * Goes to a tutorial of how to use app after account verified and signed in
* Password Requirements Display
  * Show as user types: checkmarks next to each requirement as they're met

**(M) Drink design page**

* (C) generative/responsive graphic created when a user makes drinks
* (M) An add to cart button by the graphic - must have a soda selected (other options default to none) - size selection occurs after hitting 'add to cart'
* (S) A 'Save as favorite' button by the graphic (saves drink to the user's favorites)
* (M) Drink design options (little graphics or emojis included with option names):
  * Soda - can select/deselect multiple - search bar included at top of this section
  * Syrups - can select/deselect multiple - search bar included at top of this section
  * Juices - can select/deselect multiple - (lemon, lime, pineapple, coconut etc.) - no search bar needed
  * Ice - can select one - (light, regular, extra, no ice) - no search bar needed
  
**(M) Cart page - also links to a payment page and a confirmation page**

* Cart page:
  * (M) Contains a bar of a graphic of the drink, drink name, edit button, price, and quantity controls
  * (M) Quantity Controls
    * +/- buttons for each item (or quantity input field)
    * Price updates automatically
  * (M) Empty State
    * If cart is empty: "Your cart is empty" message
    * Button: "Browse Drinks" to return to home
  * (M) Order Summary Section
    * Subtotal
    * (C) Taxes
    * Total (bold, highlighted)
  * (M) Checkout button
  * (C) Promo Code / Discount
    * Input field for discount code
    * Apply button
    * Display savings
  * (C) Apply Rewards button
    * Included in the cart page could be a graphic that shows the user's total rewards points
    * By "Checkout" button is an option that says, "Pay using ___ points"
  * (C) Saved Drinks
    * "Quick add" section showing previously ordered drinks
    * One-tap add to cart

* (M) Payment page
  * User is taken here from the “checkout” button in the cart
  * (M) Order Review Summary (Before Payment)
    * Show items being purchased
    * Show store location
    * Show estimated pickup time
    * Show total amount to be charged
  * (M) Payment Method Selection
    * Stripe API used to take user payment information *(BACKEND NOT IMPLEMENTED)*
    * Radio buttons or tabs:
      - Credit/Debit Card
      - Apple Pay / Google Pay *(BACKEND NOT IMPLEMENTED)*
      - Saved cards (if (C) "Save this card" implemented) *(BACKEND NOT IMPLEMENTED)*
  * (C) Save Card Checkbox *(BACKEND NOT IMPLEMENTED)*
    * Link to privacy policy
    * Show saved card last 4 digits for future orders
  * (M) Security Indicators
    * SSL lock icon
    * "Secure payment powered by Stripe"
    * Disclaimer: "Your card info is secure"
  * (M) Error Handling & Retry *(BACKEND NOT IMPLEMENTED)*
    * If payment fails: "Payment declined. Please try again or use different card"
    * Retry button with attempt counter
    * Link to chat page for persistent issues
  * (M) Loading State During Payment
    * Disable button during processing
    * Show spinner: "Processing payment..."
    * Prevent accidental double-clicks
  * (C) Input that says "make this order recurring"
  ---
  Geolocation/Timing
  * (M) Visual Store Location *(BACKEND NOT IMPLEMENTED)*
    * Show selected store name prominently
    * (C) Small map preview showing store location
    * Store hours display
  * (M) ETA/Timing Summary *(BACKEND NOT IMPLEMENTED)*
    * If geolocation selected:
      * "Estimated pickup: 8 minutes from now"
      * Real-time ETA updates as user location changes
    * If scheduled time:
      * "Pickup at: 3:45 PM today"
      * (S) The system should estimate how long each order will take based on how many orders are in the queue
      * (S) If the user sets a time that is sooner than the system's estimated time, the user will be notified of the estimated finish time
  * (M) Change Options Button
    * Users can switch between geolocation/scheduled time
    * Doesn't require restarting payment flow
  ---
  Recurring Orders *(BACKEND NOT IMPLEMENTED)*
  * (M) Recurring Order Confirmation Screen
    * If this option is selected the user will receive a text box that says, 
      "By selecting this option, your order will be automatically placed and your saved payment method will be charged $___ 30 minutes before your scheduled time. You can modify or cancel recurring orders at any time in your account settings."
    * Show full recurrence details:
      - "Every [frequency]"
      - "On [days]"
      - "Until [end date]"
      - "Charge amount: $X.XX"
      - "Payment date: 30 minutes before order time"
      ```
      ----------------------------------------
      CUSTOM RECURRENCE
      ----------------------------------------

      Repeat every:   [ 1 ] (week)

      Repeat on:      S  M  T  W  T  F  S
                                  [S]

      Ends:
        (*) Never
        ( ) On:      [ Feb 14, 2026 ]
        ( ) After:   [ 13 ] occurrences

      ----------------------------------------
      [ Cancel ]                      [ Done ]
      ----------------------------------------
      ```
      
* (M) Confirmation page
  * (C) After a user pays for their drink, they are taken to a page with a link to the complaints page (Didn’t get their drink?” button) as well as a rate your drink section where a user can rate their drink out of 5.
    * (C) Included will also be an input box that says, "Leave a review"
  * (M) In addition, there will be an order code displayed (which is what they type in a locked cooler to get their drink).
  * (S) The order code will also be visible on the home screen should the user leave the app and return. 
    * The order code goes away 5 minutes after the order number is typed into the cooler.
  * (C) There will also be a link to Instagram, X, or Facebook that says, "Share my drink"
    * Once clicked, the app goes to the selected platform and a pre-populated post template that includes the hashtag #socialdrinker appears *(BACKEND NOT IMPLEMENTED- API for pre-population)*
    ---
* Post-Payment
  * (M) Order Confirmation Screen
    * ✓ Order number/code
    * Order total & itemized receipt
    * Pickup location & ETA
    * Store address & hours
    * (C) Option to print/email receipt *(BACKEND NOT IMPLEMENTED)*
  * (M) Order code - what they type in a locked cooler to get their drink
  * (C) Order Tracking *(BACKEND NOT IMPLEMENTED)*
    * Status updates: "Preparing" → "Ready for Pickup"
    * Push notification when ready
    * Live location of order in queue
  * (C) Feedback/Rating Prompt
    * "Rate your drink" (5 stars)
    * "Leave a review" (text)
    * "Share on social media" 
      * Link to Instagram, X, or Facebook
      * App transitions to the selected platform and a pre-populated post template that includes the hashtag #socialdrinker *(BACKEND NOT IMPLEMENTED)*
  
**(M) Chat page**

* Simple page with a text entry box with a complaint prompt \- users will receive AI generated response messages after entering complaints
* (M) Chat Container
  * Full screen or modal overlay
  * Close/back button at top
  * "Chat with CodePop" header
* (M) Input Area
  * Text input with placeholder: "Describe your issue..."
  * Disable send if empty
* (C) Typing Indicator
  * Show "CodePop Bot is typing..." while waiting for response
  * Animated dots
* (M) Loading State
  * Prevent user from sending multiple messages while processing
  * Timeout handling (if AI doesn't respond in 5-10 seconds)
* (M) Error Handling
  * If AI response fails: "I'm having trouble right now. Please try again or contact support."
  * Retry button
  * Link to support if issue persists *(BACKEND NOT IMPLEMENTED)*
* (C) Response Confidence Indicator *(NOT IMPLEMENTED)*
  * If AI is unsure: Show disclaimer or "This might help, but..."
  * Allow user to rate response: "Was this helpful?" with Yes/No buttons
* (C) Suggested Responses / Quick Replies *(BACKEND NOT IMPLEMENTED)*
  * Show 2-3 suggested follow-up questions based on topic
  * One-tap buttons to ask common follow-ups
  * Examples:
    * "Report an issue with my order"
    * "Track my delivery"
    * "Request a refund"
* (C) Human Escalation Option *(NOT IMPLEMENTED)*
  * "Talk to a human?" button or link 
  * Shows estimated wait time 
  * Transitions to live support (if available) 
  * Fall back to email: "support@codepop.com"
* (C) Context Preservation *(NOT IMPLEMENTED)*
  * Include order number in chat (if user has active order)
  * Pass conversation to human agent if escalated
  * Show previous issues/complaints in agent view
* (C) Complaint Categorization *(NOT IMPLEMENTED)*
  * Detect complaint type:
    - "Order not received"
    - "Drink quality issue"
    - "Payment problem"
    - "App bug"
    - "Other"
  * Route to appropriate resolution path
* (C) Auto-Suggest Solutions *(NOT IMPLEMENTED)*
  * Based on complaint type, suggest actions:
    - If "Not received": "Track your order" + link
    - If "Quality issue": "Request refund" button
    - If "Payment failed": "Update payment method"
* (C) Satisfaction Rating
  * After conversation ends: "Rate this support experience" (1-5 stars)
  * Optional text feedback
  * Used to improve AI training *(BACKEND NOT IMPLEMENTED)*
  
**(M) Profile page**

* (M) Update preferences
  * Soda, syrups, ice quantity.
* (M) Settings
  * (M) Set location for geolocation. *(BACKEND NOT IMPLEMENTED)*
  * (S) account settings
    * (S) change email/password. *(BACKEND NOT IMPLEMENTED)*
    * (C) dark mode/light mode. *(FRONTEND NOT YET IMPLEMENTED)*
  * (C) Manage Recurring Orders
    * View all active recurring orders
    * Skip next occurrence button
    * Edit recurrence details
    * Pause temporarily
    * Cancel recurrence
---
Profile Header
* (M) User Profile Info
  * User avatar (initials or image placeholder)
  * Email display
  * Member since date 
  * Loyalty points balance (if using rewards program)
  * Edit Profile button (for avatar/name)
* (C) Account Quick Actions
  * Notification settings (toggle)
  * Help/FAQ link
  * Logout button (prominent at bottom)
---
Update Preferences
* (M) Preference Categories with Toggles
  * Sodas: Checkboxes for favorites (Sprite, Coke, Fanta, etc.)
    - With search bar to filter products
  * Syrups: Checkboxes for favorites (Vanilla, Caramel, Hazelnut, etc.)
  * Ice Quantity: Radio buttons or slider
    - Options: No Ice, Light, Regular, Extra
    - Visual preview (cup with ice level)
* (M) Save Changes Button
  * Only enabled if changes made
  * Show "Saved!" confirmation message
  * Auto-save option (toggle)
* (C) Reset Preferences
  * "Reset to Defaults" button with confirmation dialog
  * Clears all selections
---
Settings
* (M) Settings organized in sections (tabs or accordion):
* TAB 1: LOCATION & DELIVERY *(BACKEND NOT IMPLEMENTED)*
  * (M) Primary Store Location
    - Map picker or address search
    - Shows store name, hours, address
    - "Change Location" button
* TAB 2: ACCOUNT SETTINGS
  * (M) Email
    - Current email display
    - "Change Email" button → verification flow
  * (M) Password
    - "Change Password" button
    - Requires current password verification
    - New password with strength indicator
    - Confirm new password
  * (C) Two-Factor Authentication (2FA) *(NOT IMPLEMENTED)*
    - Enable/disable SMS or authenticator app
    - Phone number verification
  * (C) Session Management *(NOT IMPLEMENTED)*
    - View active sessions (devices, last login)
    - Sign out from other devices
    - View login history
* TAB 3: PREFERENCES & PRIVACY
  * (C) Dark Mode / Light Mode *(UI NOT IMPLEMENTED)*
    - Radio buttons: System Default, Light, Dark
  * (C) Notifications
    - Order status notifications (toggle)
    - Promotional emails (toggle)
    - New menu items alerts (toggle)
    - Push notifications (toggle)
  * (C) Privacy Settings *(NOT IMPLEMENTED)*
    - Share preferences with store (toggle)
    - Allow personalized recommendations (toggle)
    - Opt-out analytics (toggle)
* TAB 4: RECURRING ORDERS
  * (M) List of all active recurring orders
    - Order name/items (e.g., "Weekly Vanilla Latte")
    - Next charge date
    - Recurrence pattern (e.g., "Every Monday")
    - Payment method used
    - Status badge (Active, Paused, Pending)
  * (M) Per-Order Actions
    - "View Details" → shows full recurrence config
    - "Skip Next" button (skip 1 occurrence)
    - "Edit" → modify items/time/frequency
    - "Pause" → temporarily pause (with pause duration selector)
    - "Cancel" → delete recurring order (with confirmation)
  * (C) Recurrence Summary *(NOT IMPLEMENTED)*
    - Total monthly cost of all recurring orders
    - Next charge date across all orders
---
Tab Navigation / Layout
* (M) Navigation Structure
  * Accordion/Collapsible Sections
    ▼ Update Preferences
    ▼ Location & Delivery
    ▼ Account Settings
    ▼ Manage Recurring Orders
    ▼ Privacy & Notifications
---
Confirmation Dialogs
* (M) Destructive Actions Need Confirmation
  * Delete recurring order: "Are you sure? This can't be undone."
  * Change email: "Verification link will be sent to new email"
  * Change password: "You'll be logged out after change"
  * Reset preferences: "This will clear all favorites"
  * Cancel pause: "Resume order next scheduled time?"
---
Data Management & Privacy
* (C) Data Management Section
  * Delete Account
    - Permanent deletion warning
    - Requires password confirmation
  * Data Privacy
    - Link to full privacy policy
    - GDPR/CCPA compliance info
---
Visual Design & UX
* (M) Loading & Success States
  * Skeleton loaders while fetching user data
  * "Saving..." indicator during updates
  * "Saved!" confirmation with checkmark
  * Error messages with retry button
  
**(C) Rewards page**

* Should this be included, there will be a section added to the nav bar called "Rewards":
  - "Home | Order | Cart | Rewards | Chat | Account"
* The Loyalty Program will include a dedicated “Rewards” section in the main navigation. Logged-in users can view their total point balance, earning history, and upcoming expirations. Points are awarded after order pickup and excluded for canceled orders. Expiration notifications will appear as dashboard alerts. Checkout will include a placeholder section for future point redemption functionality.
---
Points Dashboard / Hero Section
* (M) Main Points Card
  * Large, prominent display of total points
  * Visual: "2,450 Points"
  * Subtitle: "$24.50 value" (estimated redemption value)
  * Animated counter (counts up when points earned)
* (M) Tier/Level System
  * Current tier badge (e.g., "Epic Member")
  * Progress bar to next tier
  * "50 points until Legendary" indicator
  * Tier benefits display: "2x points on all orders"
  * Tiers: Common (0), Rare (500), Epic (1500), Legendary (3000)
* (C) Quick Stats Cards
  * This month earned: 250 points
  * Expiring soon: 100 points (30 days)
  * Lifetime total: 5,200 points
  * Streak: "5 orders in a row"
* (C) Earning Breakdown Tooltip
  * Hover/tap on points to see:
    - Base points: 100 (1 point per $1)
    - Bonus multiplier: 25 pts (Gold tier 1.25x)
    - Total: 135 pts
---
Checkout Integration-  this would be integrated into the checkout screen
* (M) Point Value Calculator
  * Interactive slider: "Redeem X points"
  * Shows dollar value: "= $5.00 off"
  * Minimum redemption: 100 points
  * Can't redeem more than balance
* (C) Partial Redemption
  * Use points + pay difference
  * Example: Order is $15
    - "Apply 100 points ($5 off)"
    - New total: $10 + pay with card
  * Visual: Show point reduction on total
* (M) Points Preview
  * Order Summary Before Payment:
    - Subtotal: $18.50
    - Tax: $1.34
    - Points applied: -$24.50
    - **New Total: FREE (+ $4.66 credit)**
  * Warning if points exceed total: "You'll get $4.66 as store credit"
* (C) Earn Points Display
  * "You'll earn: XXX points with this order"
  * Before checkout: Estimate points for order
---
Bonus Features & Gamification
* (C) Birthday Bonus
  * Month before birthday: Show alert
  * Birthday month: 50 bonus points automatically awarded


**(M) Super Admin Dashboard**

Global Navigation Panel
* (M) Header/Top Bar
  * CodePop Logo
  * "Super Admin Dashboard" title
  * (S) Current user: "Admin Name" with logout
  * (S) System status indicator: "All Systems Operational" (green/red)
  * (C) Time last updated: "Updated 2 min ago"
* (M) Region Selector (Dropdown/Tabs) - this is for "Regions & Stores" and "Supply Hubs" pages
  * 7 regional options: Chicago, New Jersey, Logan, Dallas, Phoenix, Atlanta, Seattle
  * (C) Visual: Map with region highlights
  * Shows stores/hubs in selected region 
* (M) Navigation Sidebar/Menu
  * Dashboard (home)
  * Regions & Stores
  * Supply Hubs
  * User Management
  * AI Configuration
  * Reports & Analytics
  * Audit Logs
  * System Settings
  * Help & Documentation
* (M) Store/Hub Data Views
  * Searchable store list (search by name, location)
  * Filterable by: Region, Status (Online/Offline), Issue Level
  * Quick stats per store:
    - Store name & location
    - Current status (green/red/yellow)
    - Active orders count
    - Current inventory %
    - Machine status summary
    - Revenue this month
    - Last health check timestamp
  * Click store to drill down to details
* (C) Role & Permissions Access
  * Quick link: "Manage Roles"
  * Shows current roles: Super Admin, Admin, Logistics Manager, Repair Staff
  * Hover/tap to view permissions
  * "Create New Role" button
---
System Overview Panel
* (M) Real-Time Status Board
  * Large status indicators:
```  
    ┌──────────────────────────────┐
    │ NETWORK STATUS: HEALTHY ✓    │
    │ Uptime: 99.9% (12 days)      │
    │ Last Incident: 3 days ago    │
    └──────────────────────────────┘
```
* (M) Key Metrics Cards (4-6 metrics)
  * Active Orders: 127 (↑ 15% from yesterday)
  * Revenue Today: $4,250 (target: $5,000)
  * Inventory Health: 85% (adequate stock)
  * Machine Uptime: 98.5% (1 down)
  * API Response Time: 120ms (target <200ms)
  * Network Latency: 45ms (avg)
  * Each metric clickable for drill-down=
* (M) Regional Status Grid
  * 7 boxes, one per region
  * Each shows:
    - Region name
    - Number of stores online/total
    - Alerts count (⚠️  2 alerts)
    - Revenue this month
    - Status: 🟢 Healthy / 🟡 Degraded / 🔴 Critical
  * Tap to drill into region details
* (M) Active Alerts / Issues Panel
  * List of current issues sorted by severity
  * Color-coded: 🔴 Critical, 🟡 Warning, 🟢 Info
  * Examples:
    - 🔴 "Dallas Hub: High latency detected (500ms)"
    - 🟡 "Logan Store #3: Machine offline - needs maintenance"
    - 🟡 "Inventory Alert: Vanilla syrup running low (5% stock)"
    - 🟢 "Atlanta: 3 new orders received"
  * Each alert shows:
    - Time: "2 minutes ago"
    - Affected region/store
    - Action button: "View Details" or "Acknowledge"
  * Auto-dismiss or manual clear
* (C) Timeline / Alert History
  * Last 24 hours in timeline view
  * Shows when each issue occurred
  * Severity timeline (red/yellow/green bar)
  * Hover to see details
  * Export alert history
* (C) Emergency Override Indicators
  * Show if any overrides are active:
    - ⚠️  "System in Maintenance Mode" (red banner)
    - ⚠️  "Store #5 Manual Override Active"
  * Show who initiated override and when
  * "Clear Override" button (with confirmation)
* (C) Performance Graphs
  * Network latency over 24h (line graph)
  * Order volume over time
  * API response times
  * Machine uptime trends
  * Auto-refresh every 30 seconds
---
Configuration & Control Section
* (S) Global AI Parameter Controls
  * Section: "AI Configuration"
  * Controls for:
    - Recommendation Engine
      * Confidence threshold: [slider 0.5-0.95]
      * Suggestion frequency: [slider 1-10]
      * Personalization level: [Low] [Medium] [High]
    - Chatbot Settings
      * Response confidence min: [slider]
      * Enable escalation at: [slider] confidence level
      * Max retry attempts: [input field]
    - Forecasting Engine
      * Update frequency: [Every hour] [Every 6 hours] [Daily]
      * Prediction accuracy threshold: [slider]
      * Enable auto-restock: [toggle]
  * (C) Each setting has "Learn More" tooltip
  * "Save Changes" button (disabled until changes made)
  * "Reset to Defaults" button
* (M) System Override Toggles
  * Emergency controls (red background)
  * Toggles with confirmation dialogs:
    - 🔴 Maintenance Mode (disables all orders)
      * Show: "Maintenance window until [date/time]"
      * (C) Broadcast message to users option
    - 🔴 Pause All Recurring Orders
      * Show: "Paused 145 recurring orders"
      * "Resume All" button
    - 🔴 Disable Geolocation Tracking
      * (C) Show: "All stores using manual time-based ordering"
    - 🟡 Rate Limiter Override
      * Show: "Current limit: XXX requests/minute"
      * Temporarily increase for testing
  * (S) All overrides log who activated and when
* (C) Role Creation & Permission Editor
  * "Manage Roles" section
  * List current roles:
    - Super Admin (read-only)
    - Admin (edit/delete)
    - Logistics Manager (edit/delete)
    - Repair Staff (edit/delete)
    - [+ Create New Role]
  * Click role to edit permissions:
```
┌─────────────────────────┐
│ Role: Logistics Manager │
├─────────────────────────┤
│ ☑ View Orders           │
│ ☑ View Inventory        │
│ ☑ Create Supply Req     │
│ ☐ Approve Supply Req    │
│ ☐ Manage Stores         │
│ ☐ View Analytics        │
│ ☐ Manage Users          │
└─────────────────────────┘
```
  * "Save Changes" button
  * "Delete Role" button (if unused)
* (C) User Management
  * "Manage Users" section
  * Admins, logistics managers, repair staff list
  * Per user:
    - Name, email, role
    - Region(s) assigned
    - Last login
    - Status (Active/Inactive)
    - Actions: Edit, Reset Password, Disable, Delete
  * "Create New User" button with form
  * Bulk actions: Disable all, Reset passwords
---
Additional Sections
* (S) Store Management
  * Create new store
  * Edit store details (address, hours, machines)
  * Assign stores to regions
  * View store status
  * Force offline/maintenance mode per store
* (S) Hub Viewing
  * View hub status
  * Hub-level metrics
* (C) Hub Management
  * Create supply hubs
  * Assign stores to hubs
* (M) Reports & Analytics
  * Revenue reports (nationwide, by region, by store)
  * Order trends
  * Inventory trends
  * Machine uptime reports
  * (C) Export to CSV/PDF
* (C) Audit Logs / Activity History
  * Who: User performing action
  * What: Action taken (e.g., "Created user", "Changed AI threshold")
  * When: Timestamp
  * Where: Affected resource (store, region, order)
  * Result: Success/Failure
  * Filterable by: User, Action type, Date range, Status
  * Export audit logs
* (C) Maintenance Mode
  * Global maintenance toggle
  * Broadcast message to all users
  * Schedule maintenance window (date/time)
  * Auto-resolve after maintenance period
* (C) Notification/Alert Settings
  * Configure alert thresholds:
    - Critical latency: [slider] ms
    - Low inventory: [slider] %
    - Machine downtime: [slider] hours
  * Choose notification channels: Email, In-app, SMS
  * Alert routing: Who gets notified for what
* (C) Backup & Recovery
  * Last backup timestamp: "Yesterday 2:00 AM"
  * Backup frequency: [Daily] [Weekly]
  * "Backup Now" button
  * Restore from backup option
  * Retention policy: [30 days] [90 days] [1 year]
* (C) System Health Dashboard
  * Database health (connection pools, query performance)
  * Cache health (Redis/Memcache)
  * Queue health (Celery tasks)
  * External service status (Stripe, Mapbox, Dialogflow)
  * Each shows: Status, Uptime, Last checked
---
Key Features Needed
* (M) Real-Time Updates
  * Dashboard auto-refreshes (every 30 sec)
* (M) Drill-Down Navigation
  * Click region → see stores in region
  * Click store → see details (inventory, machines, orders)
  * Click alert → see affected resource & remediation options
* (M) Search & Filter
  * Global search: Find store, user, hub by name
  * Filter by: Region, Status, Issue type
  * Save custom views/filters
  
**(M) Repair Staff Dashboard**

* (M) Regional Overview Panel
  * (M) Store selector
  * (C) Summary cards to give immediate visibility into machine health
* (M) Machine Status Table- A sortable, filterable data table showing all machines within the assigned region.
* (M) Repair Schedule Manager- Calendar or timeline view showing:
  * Upcoming repairs
  * In-progress service jobs
  * Overdue maintenance
* (S) Machine Detail View
  * When selecting a machine, show repair status, history, and any notes
* (C) Schedule Optimization Tool
  * A utility panel that suggests route grouping and recommends optimal scheduling
  

**(M) Repair Staff Dashboard**

Global Navigation & Context
* (M) Header/Top Bar
  * CodePop Logo
  * "Repair Staff Dashboard" title
  * Current user: "Technician Name" with region assignment
  * Quick support: Help icon, Manager contact button
  * Logout
* (M) Regional Filter/Selector (Sticky)
  * Assigned region display: "Assigned to: [Chicago]"
  * Shows: "X stores, Y machines" in selected region
* (M) Breadcrumb Navigation
  * Dashboard → [Region] → [Store] → [Machine] (context trail)
  * Quick "Back" to previous view
* (M) Notifications/Alerts Hub
  * Alert bell icon with unread count
  * Dropdown with priority alerts:
    * 🔴 "Machine X critical downtime (2+ hours)"
    * 🟡 "Part for Machine Y arrived in stock"
    * 🟡 "Manager needs approval on your escalation"
    * 🟢 "Repair #123 marked complete by you"
  * Toast notifications (push style) for urgent events
  * Mark as read, dismiss, or act on each alert

---
Today's Schedule Panel
* (M) "Today's Schedule" Widget (Sticky/Prominent)
  * Time*blocked view (8am * 6pm)
  * Current status card: "Currently: [In Transit] / [Repair: Machine X] / [Free]"
  * Next 3 jobs with:
    * Estimated start time
    * Store location & address (clickable to map)
    * Machine status (critical/urgent/routine)
    * Estimated duration
    * One*click "Navigate" button (to map/GPS)
  * "Route Optimization" button → shows suggested grouping/order
* (M) Critical Downtime Alert Banner (Red)
  * If machines critical: "⚠️   2 machines critical downtime * revenue impact: $XXX/hour"
  * Filter/focus on these machines

---
Machine Status Table
* (M) Sortable, Filterable Data Table showing all machines in assigned region
  * Columns:
    * Machine ID & Location (Store name, address)
    * Model & Serial Number
    * Status (🔴 Critical Down / 🟡 Degraded / 🟢 Operational)
    * Downtime Duration (how long offline, if applicable)
    * Last Service Date & Next Scheduled Maintenance
    * Assigned Technician (if scheduled repair)
    * Repair Priority Score (based on downtime cost + urgency)
    * Revenue Impact (orders affected if down)
    * Quick Actions buttons → [Details] [Start Repair] [Escalate]
  * (M) Filters:
    * By Status: Critical, Degraded, Operational, Offline
    * By Store
    * By Machine Type
    * By Urgency: Today, This Week, Overdue, Maintenance Only
    * By Parts Availability: "Has parts", "Waiting on parts", "Back*order"
  * (M) Sort by: Status, Priority, Downtime duration, Revenue impact, Location
  * (M) Bulk actions: "Select machines" → "Plan route for selected"
---
Machine Detail View
* (M) When clicking machine, open side panel or modal showing:
  * Machine Info Header
    * Machine ID, Model, Serial, Location, Status indicator
    * (C) Current technician (if assigned)
    * (C) Warranty status, install date
  * Current Repair Status
    * Current state: Healthy / In Progress / Awaiting Parts / Scheduled / Overdue
    * (C) If in progress: Started by [Technician], started [X hours ago]
    * (S) Estimated completion time
    * (S) Progress notes (last update)
  * (M) Quick Actions Bar
    * [Start Repair] / [Continue Repair] / [Mark Complete]
    * [Request Parts]
    * [Add Notes/Photos] (camera icon for field uploads)
    * [Request Help / Escalate]
    * [Schedule Future Maintenance]
  * (C) Machine History
      * Timeline of last 10 repairs:
        * Date, technician, issue, resolution, time spent
      * Parts used, cost
      * Customer satisfaction rating (if captured)
    * Common issues for this model (ML-generated insights)
  * (C) Repair History
    * Expandable sections per repair with: Issue, diagnosis, steps taken, parts replaced, outcome
  * (M) Parts Status
    * Common parts for this model & their availability:
      * "In stock at hub", "Order pending", "Back-order (ETA: date)"
    * (C) Quick request button if parts needed
  * (C) Customer Impact
    * Number of active orders affected
    * Estimated revenue loss per hour of downtime
    * Show to emphasize priority
  * (S) Notes Section
    * Internal notes (for staff only)
    * Customer-facing notes (what was explained to customer)
    * Attachments: photos, documents, receipts
---
Repair Schedule Manager
* (S) Multi-view calendar/timeline system:
  * (S) Timeline View (Main)
    * Horizontal timeline grouped by technician
    * Each technician has swim lane showing:
      * Scheduled repairs (time blocks with machine ID, location)
      * In-progress repairs (highlighted different color)
      * Free time blocks
      * Travel time between locations (gray blocks)
    * Color coding:
      * 🔴 Critical/urgent repairs
      * 🟡 Standard repairs
      * 🟢 Preventive maintenance
      * Gray: Travel time
    * Drag-to-reschedule repairs
    * (C) Suggested optimization: "Reorder for better route?" with accept button
  * (S) Calendar View (Secondary)
      * Monthly view showing:
        * Days with repair load (color intensity)
      * Hover to see details
      * Upcoming maintenance deadlines (flagged)
    * Quick jump to specific date
  * (M) Categorized Lists
      * Today's Schedule
        * All repairs scheduled for today
      * Grouped by store location for route planning
      * (S) "Start Route" button launches optimized sequence
    * Upcoming (This Week)
      * All scheduled repairs next 7 days
      * (S) Drag to reschedule
      * Edit/cancel options
    * Overdue Maintenance
      * Machines past maintenance window (red indicator)
      * "Schedule Now" button with suggested time slots
    * Scheduled Future Maintenance
      * Preventive maintenance already scheduled
      * Edit timing if needed
    * (S) Waiting on Parts
      * Repairs on hold waiting for parts delivery
      * ETA, notification when parts arrive
---
Schedule Optimization Tool
* (C) Dedicated panel for route & time planning:
  * Input Section
    * "Select machines to optimize" or "Optimize my today's schedule"
    * Constraints: [Max drive time] [Parts availability] [Time window]
    * Preferences: [Group by store] [Minimize travel] [Earliest start time]
  * Output: Recommended Route
    * Sorted sequence of machines
    * Estimated travel time between locations
    * Total time estimate: "8:30am * 4:15pm (7h 45m job time, 1h 30m travel)"
    * Map view showing route with pins
    * One*click: "Accept & Load My Schedule"
  * Optimization Metrics
    * "This route saves 45 minutes vs. current order"
    * Efficiency score (0*100%)
    * (C) Carbon footprint / fuel estimate
  * Machine Grouping Suggestions
    * "Both machines at Chicago Store #2, repair together"
    * Parts consolidation: "Machine A & B need same part, order once"
    * Load balancing: "Your schedule is 20% lighter than team average today"
---
Quick Actions Bar
* (C) Persistent fixed at bottom of screen or sticky in machine detail:
  * Primary actions: [Start Repair] [Complete] [Pause]
  * Secondary: [Add Notes] [Request Parts] [Take Photo]
  * Emergency: [Request Help] [Escalate to Manager]
  * Context: Changes based on currently selected machine
---
Performance Metrics Dashboard
* (C) Personal technician stats (weekly/monthly view):
  * Repairs completed this week: X
  * Avg. repair time (vs. estimated)
  * On-time completion rate: %
  * First-time fix rate: % (no return visits)
  * Customer satisfaction (if available): X/5 stars
  * Parts accuracy: Times ordered correct parts on first try %
  * Downtime prevented: $X this week
  * Compare to team average (benchmark)
  * (C) Trend visualization: Charts showing improvement/decline over time
---
Communication & Escalation
* (S) Quick Escalation Panel
  * "Contact Manager" button (phone, email, message)
  * "Request Expert Help" → Select from available senior technicians
  * Auto-populated with: Machine ID, current status, what you've tried
  * Message drafting interface
* (C) Internal Chat/Notes
  * Message manager or assigned expert in real-time
  * Attach photos/videos from machine scene
  * Inline responses don't close dashboard
* (S) Customer Contact
  * One-click call/text to store contact
  * Pre-populated templates: "ETA", "Found issue", "Complete"
  * Call history & timestamps logged

---
Parts & Inventory Integration
* (M) Parts Availability Sidebar (Collapsible)
  * Search parts by machine or model
  * Shows:
    * Part name & number
    * In stock quantity (location)
    * Price, lead time if ordering
    * (S) Similar/compatible parts
  * One-click: "Request delivery to my location" or "Pick up at hub"
  * (S) Notification when parts arrive
* (M) Parts Order Tracking
  * Show all open parts requests
  * ETA for each
  * Received ✓ or delayed ⚠️
---
Offline Support
* (C) App caches today's schedule offline
* (C) Notes/photos can be drafted offline
* (C) Auto-sync when connection restored
* (C) Indicator: "Working offline" banner with sync status
---
Color Coding & Status Indicators
* 🔴 Critical: Machine offline >2 hours, revenue impact immediate
* 🟡 Urgent: Scheduled repair, degraded performance, preventive maintenance overdue
* 🟢 Operational: Working normally, preventive maintenance scheduled
* ⚪ Idle: Not in use
---
Key User Flows
* (M) Daily Start
  * Log in → See "Today's Schedule" summary
  * Tap "Load Today's Schedule" → Route optimized, ordered by efficiency
  * Tap first machine → Navigate to store
  * Arrive → Tap "Start Repair", take photos, add notes
  * Complete repair → Tap "Mark Complete", request parts if needed
  * Move to next machine in optimized route
* (M) Mid-Day Interruption
  * Manager assigns new urgent repair (alert notification)
  * Accept → Dashboard re-optimizes remaining schedule
  * Finish current job → Navigate to urgent machine
* (S) End of Day
  * Complete final repair
  * Dashboard shows: "Today: 6 repairs, 8h 15m, $12,400 downtime prevented"
  * Auto-submit performance data
  
**(M) Logistics Manager Dashboard**
Regional Overview
* (M) Hub Status Panel
  * Current inventory levels (% full)             
  * Alert count (🟢/🟡/🔴 badges)
  * Quick stats: Active deliveries, stores needing restock, orders pending
* (M) Store Supply Status Grid
  * Filterable/searchable store list
  * Per-store display:
    * Store name & location
    * Overall supply health (🟢/🟡/🔴)
    * Days until critical depletion (AI forecast)
    * Recommended restock date
    * Action button: [View Details] [Request Supply]
---
Supply Inventory Management
* (M) Supply Levels Summary
  * Grid showing all ingredient categories: Syrups, Sodas, Add-ins
  * Per ingredient: Current level, average daily usage, days remaining
  * Sort by: Days remaining, usage trend, category
  * (C) Visual indicators: Low/Medium/High stock
* (M) Usage Trends & Popularity
  * AI-generated report showing:
    * Top trending ingredients (this month/week)
    * Regional variations (which stores prefer what)
    * Seasonal patterns (time of year trends)
    * Comparison to historical average
  * Sortable by: Trend %, Region, Category
---
Delivery Planning & Optimization
* (M) Planning View
  * Forecasted depletion dates per store (AI calculated)
  * Suggested restock window (green zone for optimal ordering)
  * Stores needing immediate restock (red alert)
  * One-click: [Suggest Delivery Route] or [Manual Planning]
* (C) Route Optimization View
  * (C) AI-Suggested Optimal Route
    * Stores ordered by: delivery efficiency, depletion urgency
    * Map view with pins & route line
    * Estimated delivery time per stop
    * Total route time estimate
    * One-click: [Accept & Schedule] or [Customize]
  * (S) Manual Route Builder
    * Drag stores into delivery sequence
    * Adjust order as needed
    * Real-time time estimate updates
  * (C) Automated Scheduling
    * Set recurring delivery patterns (weekly, bi-weekly)
    * System auto-schedules based on depletion forecasts
    * Edit/pause/cancel recurring deliveries

---
Supply Request Workflow
* (M) Quick Request Panel
  * Pre-filled with: Current hub, requesting store, recommended order quantities (AI)
  * Two submission options:
    * [Request from Supply Hub] (default, faster)
    * [Request from Nearby Store] (choose store within 100-mile radius)
  * (S) View pending requests with status: Approved, In Transit, Delivered
  * (C) History of past supply movements & requests
---
Key Metrics (Summary Cards)
* (M) Top-level stats visible on dashboard load:
  * Stores at critical supply levels: X
  * Deliveries in transit: X (ETA times)
  * Pending supply requests: X
  * Most trending ingredient this week: [Name]
  * Forecast accuracy: X% (vs. actual usage)

**(M) Manager Dashboard**

Navigation Hub
* (M) Quick Access Cards (at top of dashboard):
  * [Notifications] (badge shows count)
  * [Revenue Report]
  * [Inventory Report]
  * [Order Statistics]
  * [Supply Requests]
  * (S) [Settings]
---
Notifications Center
* (M) Alert Panel showing:
  * Stock-level alerts: "Vanilla syrup at 15% - suggest ordering 50 units from Supply Hub by Friday"
  * (S) Incoming deliveries: "Supply delivery arriving today 2-4pm"
  * (C) Anomalies: "Order volume 30% above average today"
  * (S) Auto-acknowledge or dismiss individual alerts
  * (S) Alerts sorted by: Urgency, timestamp
---
Revenue & Performance Report
* (M) Key Metrics Display:
  * Total revenue (this month, today, trend vs. last month)
  * Inventory costs (this month, % of revenue)
  * Total user accounts assigned to location
  * Active orders count
  * (S) Customer satisfaction score (if available)
* (M) Drill-down capability: Click any metric to see details/breakdown
---
Inventory Report
* (M) Current Inventory Grid
  * Categories: Syrups, Sodas, Add-ins
  * Per-item: Current level, % capacity, days remaining, usage trend
  * Sort/filter by: Category, stock level, urgency
  * Visual indicators: Low/Medium/High
* (M) Cooler Status Grid
  * List of all coolers: Status (🟢 Full / 🟡 Partial / 🔴 Empty)
  * For full coolers: Age of drink sitting inside, replacement recommendation
* (M) AI Ordering Recommendation
  * Suggested quantities for each ingredient this month
  * Recommended suppliers (ranked by price/delivery time)
  * "Accept & Order" button (routes to supply request)
* (C) Nearby Store Inventory Comparison
  * Quick view of neighboring store levels (for manual transfers if needed)
* (C) Supply Hub Inventory
  * View available stock at assigned hub
---
Order Statistics
* (M) Order Trends
  * Popular items (syrups, sodas, add-ins) ranked by popularity
  * Time-based trends: Peak hours, peak days
  * (S) Historical data: Last 30/90 days
* (M) Performance Metrics
  * (C) Average order fulfillment time: Order placed → Picked up
  * Order volume trend: Up/down vs. last week/month
  * (C) Customer satisfaction with orders (if available)
---
Supply Request Management
* (M) Request Submission Form
  * (S) Pre-filled with: Current store location, recommended order quantities
  * Two options:
    * [Request from Supply Hub] - primary option
    * (C) [Request from Nearby Store] - select from list of stores within 100 miles
  * [Submit Request] button
* (M) Pending Requests Tracker
  * Status display for each request: Submitted, Approved, In Transit, Delivered
  * (S) ETA tracking (like package tracking UI)
  * Click to see: Quantity ordered, submission date, expected delivery
* (S) Supply Movement History
  * Timeline of past requests: Date, quantity, source, delivery status
  * Filter by: Status, date range, item type

**(M) Admin Dashboard**

User Management
* (M) User Accounts (Searchable/Filterable)
  * Three tabs: Active, Disabled, Deleted
  * Per user displayed:
    * Name, email, assigned location/region
    * Role (Manager, Staff, etc.)
    * Last login timestamp
    * Account status
  * (M) Quick Actions:
    * Active accounts: [Edit] [Disable] [Make Manager] [Delete]
    * Disabled accounts: [Edit] [Enable] [Delete]
    * Deleted accounts: View only (non-recoverable log)
  * (M) Bulk actions: [Disable All] [Reset Passwords] [Export List]
  * (M) Create New User: [+ Add User] button opens form
---
Manager Accounts
* (M) Managers List (Searchable/Filterable)
  * Per manager displayed:
    * Name, email, assigned region(s)/store(s)
    * Last login timestamp
    * Reports to: (Super Admin or other manager)
    * Active user count under this manager
  * (M) Quick Actions: [Edit] [View Reports] [Reset Password] [Disable]
  * (M) Create New Manager: [+ Promote to Manager] (select user from active accounts)
---
Role & Permission Management
* (M) Roles Overview
  * List of all roles: Super Admin, Admin, Manager, Staff, Repair Staff
  * Per role: Permission count, active user count, edit/delete options
  * (M) Edit Role: Opens permissions editor showing checklist of capabilities
  * (C) Create New Role: [+ Custom Role] button
---
System Audit Trail
* (S) Recent Admin Actions
  * Log of: Who, What action, When, Status (Success/Failed)
  * Filter by: Action type, user, date range
  * (C) Export audit log

**(M) Error Messages**
    
* The system will implement contextual error messaging including inline validation for form inputs, permission-based access alerts, scheduling conflict warnings, payment processing errors, geolocation prompts, and system-level failure notifications. Errors will be visually distinct, non-destructive to user input, and include actionable guidance for resolution.
  
**(C) Special messages**

* Store closures:
  * Home screen message: If the store is closed for a holiday or other reason, a large notification will appear on the home screen stating that it is closed and when it reopens. It will also contain a link that takes the user to store hours/closures.
  * Cart message: Before the user can checkout there will also be a message in bright text telling reminding the user that the store is closed and that they must schedule out their order. The option for geolocation will be grayed out and the user must click on the "Schedule my order" option.
    * The scheduling order UI will show the closure dates/times as grayed out and non-selectable, forcing the user to choose a date/time that is open.

**(C) codepop Notifications**
  * (C) When app is first opened, they will receive a system prompt that says "Allow notifications for this app?"
  * (C) Failed Payment Handling for Recurring
    * Notify user when charge fails
    * Retry logic (e.g., retry next day)
    * Option to update payment method

## Database tables

### Overview

CodePop uses a **database-per-store architecture** where each physical store location maintains its own independent PostgreSQL instance. Data is categorized as either **replicated** (synchronized across stores on-demand) or **local** (never replicated). This section documents the core data entities currently implemented in `codepop_backend/backend/models.py`.

---

### User Table

| Field Data | Data Type | Constraints | Notes |
| :---- | :---- | :---- | :---- |
| UserID | int | Primary Key | Built-in Django `User` model |
| Username | String | Unique | User login identifier |
| Password | String | NOT NULL | Hashed using PBKDF2-SHA256 |
| Email | String | NOT NULL | Email address for verification |
| is_staff | Boolean | Default False | Distinguishes managers from regular users |
| is_superuser | Boolean | Default False | Distinguishes admins from regular users |

**Notes:**
- Uses Django's built-in `django.contrib.auth.models.User` for authentication.
- User roles are represented via `is_staff` and `is_superuser` flags rather than a separate role field.
- Role-based access control (staff, admin, customer) is implemented in views and serializers.

---

### Preference Table

| Field Data | Data Type | Constraints | Notes |
| :---- | :---- | :---- | :---- |
| PreferenceID | int | Primary Key | Auto-generated |
| UserID | int | Foreign Key References User(UserID) | Cascade on delete |
| Preference | String (varchar 100) | NOT NULL | Preference label (e.g., "Coconut", "Fruity") |

**Notes:**
- Stores user flavor preferences for the AI recommendation engine.
- One user can have multiple preferences; each preference is a separate row.
- Lazily replicated across stores (only synced when user logs into a new store).

---

### Drink Table

| Field Data | Data Type | Constraints | Notes |
| :---- | :---- | :---- | :---- |
| DrinkID | int | Primary Key | Auto-generated |
| Name | String | NOT NULL | Display name of the drink |
| SyrupsUsed | Array (String[]) | Nullable | PostgreSQL ArrayField; list of syrup names |
| SodaUsed | Array (String[]) | NOT NULL | PostgreSQL ArrayField; list of soda names |
| AddIns | Array (String[]) | Nullable | PostgreSQL ArrayField; list of add-in names |
| Rating | Float | Nullable | User rating (0–5 scale); NULL if unrated |
| Price | Float | NOT NULL | Cost of the drink in USD |
| Size | String | Default "m" | Drink size: "s" (16oz), "m" (24oz), "l" (32oz) |
| Ice | String | Default "normal" | Ice amount: "none", "light", "normal", "extra" |
| User_Created | Boolean | NOT NULL | True if user-created custom drink; False if catalog drink |
| Favorite | M2M → User | Nullable | Many-to-Many relationship; users can favorite many drinks |

**Notes:**
- Catalog drinks (User_Created=False) are replicated to all stores.
- User-created drinks (User_Created=True) are lazily replicated on-demand.
- ArrayField is PostgreSQL-specific; ensures type safety for ingredient lists.

---

### Order Table

| Field Data | Data Type | Constraints | Notes |
| :---- | :---- | :---- | :---- |
| OrderID | int | Primary Key | Auto-generated |
| UserID | int | Foreign Key References User(UserID) | Nullable; allows guest checkout |
| Drinks | M2M → Drink | NOT NULL | Many-to-Many relationship; order contains multiple drinks |
| OrderStatus | String | Choices: pending / processing / completed / cancelled | Default: pending |
| PaymentStatus | String | Choices: pending / paid / failed / remade | Default: pending |
| PickupTime | DateTime | Nullable | Scheduled pickup time (NULL for geolocation-based pickup) |
| CreationTime | DateTime | auto_now_add | Timestamp of order creation |
| LockerCombo | BigInteger | Nullable | Locker access code for drink pickup |
| StripeID | String | NOT NULL | Stripe payment intent ID (non-sensitive token) |

**Notes:**
- `Drinks` is a Many-to-Many field allowing orders to contain multiple drinks.
- `LockerCombo` is generated after successful payment and provided to customer.
- `StripeID` references the Stripe payment intent; raw credit card data never stored locally.
- **Local Data** — never replicated between stores; each store maintains its own order history.

---

### Inventory Table

| Field Data | Data Type | Constraints | Notes |
| :---- | :---- | :---- | :---- |
| InventoryID | int | Primary Key | Auto-generated |
| ItemName | String | NOT NULL | Name of ingredient or physical item |
| ItemType | String | Choices: Soda / Syrup / Add In / Physical | NOT NULL |
| Quantity | PositiveInt | NOT NULL | Current stock level |
| ThresholdLevel | PositiveInt | NOT NULL | Minimum quantity before alert triggers |
| LastUpdated | DateTime | auto_now | Automatically updates on every save |

**Notes:**
- ItemType values: "Soda", "Syrup", "Add In", "Physical" (cups, lids, straws, etc.).
- ThresholdLevel is used by managers and logistics systems to trigger supply requests.
- **Local Data** — each store maintains its own inventory; never replicated.
- `LastUpdated` auto-increments to enable tracking of recent changes.

---

### Notification Table

| Field Data | Data Type | Constraints | Notes |
| :---- | :---- | :---- | :---- |
| NotificationID | int | Primary Key | Auto-generated |
| UserID | int | Foreign Key References User(UserID) | Cascade on delete; NOT NULL if user-specific |
| Message | String | max_length=500 | Notification text content |
| Timestamp | DateTime | Default: now | Creation time of notification |
| Type | String | max_length=50 | Category (e.g., "order_ready", "stock_alert", "system") |
| Global | Boolean | Default False | False = user-specific; True = broadcast to all users |

**Notes:**
- When `Global=True`, the notification is a broadcast message to all users (e.g., store closure notice).
- When `Global=False`, the notification is user-specific (e.g., "Your drink is ready").
- **Local Data** — each store maintains its own notifications; not replicated.
- Push notifications to users triggered via Firebase Cloud Messaging (FCM).

---

### Revenue Table

| Field Data | Data Type | Constraints | Notes |
| :---- | :---- | :---- | :---- |
| RevenueID | int | Primary Key | Auto-generated |
| OrderID | int | NOT NULL | Order reference (plain field, not a FK with DB constraint) |
| TotalAmount | Float | Default 0.0 | Revenue amount in USD; auto-calculated from order drinks |
| SaleDate | DateTime | Default: now | Date/time of transaction |
| Refunded | Boolean | Default False | True if transaction was refunded |

**Notes:**
- `OrderID` is stored as an IntegerField without a foreign key constraint for flexibility.
- `TotalAmount` auto-calculates on save by summing drink prices from the associated order.
- If manually set, auto-calculation is skipped; allows for manual adjustments if needed.
- **Local Data** — each store maintains its own revenue records; never replicated.
- Aggregation happens on-demand when managers/executives request reports (see Architecture section).

---

### SupplyHub Table

| Field Data | Data Type | Constraints | Notes |
| :---- | :---- | :---- | :---- |
| HubID | String | Primary Key | Unique identifier for each supply hub (UUID or short code) |
| Region | Int | Foreign Key | Two‑character region code; each hub is assigned to one region |
| Lat | Float | NOT NULL | Latitude coordinate of hub location |
| Lon | Float | NOT NULL | Longitude coordinate of hub location |
| stores | List(Store) | Nullable | List of store objects associated with this hub |

**Notes:**
- Stores metadata about regional supply hubs used in the federated network.
- `Region` is unique to enforce one hub per geographic area.
- Coordinates are required for mapping and distance calculations.
- `stores` provides quick access to related store records; updated when stores register.
- Hub data is replicated across stores for logistics queries.

---

### Store Table

| Field Data | Data Type | Constraints | Notes |
| :---- | :---- | :---- | :---- |
| id | String | Primary Key | Unique store identifier (e.g., UUID) |
| name | String | Unique | Human-readable store name |
| hubId | String | Foreign Key → Hub(HubID) | Link to associated supply hub |
| region | String | NOT NULL | Region code for the store; used in replication logic |
| lat | Float | NOT NULL | Latitude coordinate of store location |
| lon | Float | NOT NULL | Longitude coordinate of store location |
| users | List(User) | Nullable | List of user objects who have visited this store |

**Notes:**
- `hubId` enforces the hub/store relationship; can be NULL for unassigned stores.
- `region` mirrors the region field in Hub but is required for quick filtering.
- Coordinates used for geolocation features and route optimization.
- `users` is a denormalized list used for quick lookup; updates when user checks in or places order.
- Store records are replicated to other stores for discovery and logistics.

---

### Removed/Consolidated Tables

#### Payment Table (Removed)
- **Previous design**: Separate Payment table for tracking transaction details.
- **Current design**: Payment information consolidated into Order table via `StripeID`.
- **Rationale**: Stripe handles all sensitive payment data; CodePop stores only the non-sensitive payment intent ID.

#### Code Table (Removed)
- **Previous design**: Separate Code table for storing locker access codes.
- **Current design**: Locker combination stored as `LockerCombo` field in Order table.
- **Rationale**: Simplifies schema; each order has exactly one locker code.

---

### Database Indexing Strategy

**Recommended Indexes:**

Create indexes on the following fields to optimize query performance:

| Table | Fields | Purpose |
| :---- | :---- | :---- |
| User | UserID | Primary key (auto-indexed) |
| Order | UserID | Lookup user's orders |
| Order | CreationTime | Range queries for date filtering |
| Order | OrderStatus | Filter orders by status |
| Preference | UserID | Lookup user preferences |
| Inventory | ItemName, ItemType | Quick ingredient lookups |
| Inventory | Quantity | Find low-stock items |
| Notification | UserID, Timestamp | User notification timeline |
| Revenue | SaleDate | Revenue reporting by date range |

**Indexing Guidelines:**
- Primary keys are auto-indexed; do not add duplicate indexes
- Foreign keys should be indexed for join performance
- Timestamp fields should be indexed for range queries
- Status/category fields should be indexed if frequently filtered
- Consider composite indexes for common multi-column filters

---

### Data Validation & Constraints

**Field Validation Rules:**

| Table | Field | Validation Rule | Error Message |
| :---- | :---- | :---- | :---- |
| User | Email | Valid email format (RFC 5322) | "Invalid email address" |
| User | Password | Min 12 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char | "Password does not meet complexity requirements" |
| Preference | Preference | Non-empty string, max 100 chars | "Invalid preference format" |
| Drink | Name | Non-empty string, max 255 chars | "Drink name required" |
| Drink | Price | Float >= 0.00, max 2 decimals | "Price must be positive currency value" |
| Drink | Size | Must be "s", "m", or "l" | "Invalid size; must be s, m, or l" |
| Drink | Ice | Must be "none", "light", "normal", or "extra" | "Invalid ice amount" |
| Order | LockerCombo | 6-digit numeric code (000000-999999) | "Invalid locker combination format" |
| Order | StripeID | Non-empty string, starts with "pi_" or "seti_" | "Invalid Stripe payment intent ID" |
| Inventory | Quantity | Integer >= 0 | "Quantity cannot be negative" |
| Inventory | ThresholdLevel | Integer >= 0 | "Threshold must be non-negative" |
| Revenue | TotalAmount | Float >= 0.00, max 2 decimals | "Invalid revenue amount" |

---

### Migration Considerations

**Key Migration Patterns:**
- **Adding new ingredients**: Insert into Inventory with appropriate ItemType and ThresholdLevel
- **Changing drink recipes**: Update ArrayFields; existing orders retain original recipe
- **Adding new user roles**: Extend is_staff/is_superuser flags or add authorization in views
- **Database replication**: User + Preference replicate on-demand; Order/Revenue stay local
- **Data cleanup**: Archive old orders/revenue after 1 year; cascade delete user records on account deletion

**Zero-Downtime Migration Strategy:**
1. Create new column with default value
2. Deploy code that reads from both old and new locations
3. Backfill data incrementally in background
4. Deploy code that writes to new location only
5. Remove old column in follow-up deployment

---

### Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ PREFERENCE : has
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ ORDER : places
    USER }o--|| DRINK : favorites

    DRINK ||--o{ ORDER : "M2M contains"
    ORDER ||--o{ REVENUE : generates

    STORE ||--o{ INVENTORY : manages
    STORE ||--o{ ORDER : processes
    STORE ||--o{ NOTIFICATION : broadcasts

    REGION ||--|| SUPPLYHUB : "1:1"
    REGION ||--o{ STORE : contains
    STORE ||--|| SUPPLYHUB : "belongs to"

    ORDER {
        int OrderID PK
        int UserID FK
        string OrderStatus
        string PaymentStatus
        string StripeID
        int LockerCombo
    }

    DRINK {
        int DrinkID PK
        string Name
        string[] SyrupsUsed
        string[] SodaUsed
        string[] AddIns
        float Price
        float Rating
    }

    USER {
        int UserID PK
        string Username
        string Email
        string Password
    }

    PREFERENCE {
        int PreferenceID PK
        int UserID FK
        string Preference
    }

    INVENTORY {
        int InventoryID PK
        string ItemName
        string ItemType
        int Quantity
        int ThresholdLevel
    }

    SUPPLYHUB {
        String HubID PK
        int Region FK
        float Lat
        float Lon
        List(Store) stores
    }

    STORE {
        String id PK
        String name
        String hubId FK
        String region
        float lat
        float lon
    }

    NOTIFICATION {
        int NotificationID PK
        int UserID FK
        string Message
        string Type
        boolean Global
    }

    REVENUE {
        int RevenueID PK
        int OrderID
        float TotalAmount
        string SaleDate
    }

    STORE {
        int StoreID PK
        string StoreName
        int RegionID FK
    }

    SUPPLYHUB {
        int HubID PK
        string HubName
        int RegionID FK
    }

    REGION {
        int RegionID PK
        string RegionName
    }
```

### Backend UML:

![Backend](misc/Backend\_UML\_Diagram.png) 

### 

Manager Dashboard Module Functions:

![Manager](misc/Manager\_Dashboard\_Functions.png) 


User Management Module Functions: 

![User](misc/User\_Management\_Functions.png) 

Order Management Module Functions:  

![Order](misc/Order\_Management\_Functions.png) 


Soda Catalog Module Functions:  

![Soda](misc/Soda\_Catalog\_Functions.png) 


AI Recommendation Module Functions: 

![AI](misc/AI\_Reccommendation\_Functions.png)  

## System performance

**Overview:** The CodePop stack benefits from built-in performance optimizations at every layer. React Native renders UI efficiently through its virtual DOM and only re-renders components when state changes. Django's ORM constructs optimized SQL queries and supports connection pooling to reduce database overhead. PostgreSQL handles concurrent reads and writes efficiently at the store level, and its indexing system keeps query times low even as data grows. Beyond these baseline behaviors, the distributed architecture introduced along with other new features raise additional performance concerns. The sections below address the most significant of these.  

### Load Distribution
**Problem:** A single centralized server handling all network traffic creates a bottleneck and a single point of failure.
**Solution:** Flat hub mesh with P2P store communication.
**Description:** Each store runs its own Django API and PostgreSQL instance, scoping traffic and queries to local data. A spike at one store does not degrade performance at others. Stores communicate directly with each other (P2P) for user data; hubs coordinate supply and logistics only (not a data router).  
Implementation: Each store node is deployed as an independent Django server with its own PostgreSQL database. The hub layer handles only coordination (discovery, aggregation) and does not proxy user requests.  

### Database Indexing
**Problem:** Frequently repeated queries on large tables slow down response times.  
**Solution:** Indexed fields on commonly queried columns.  
**Description:** Fields such as user email (for cross-region discovery), machine status, and order status will be indexed in each store's PostgreSQL instance to minimize query time.  
**Implementation:** Django model `Meta` classes will define indexes on `email`, `machine_status`, and `order_status` fields. Migrations will apply these indexes to each store's PostgreSQL instance on startup.  

### Asynchronous Task Handling
**Problem:** Expensive operations like revenue aggregation and hub broadcasts block API responses if run synchronously.  
**Solution:** Celery and Redis for asynchronous task processing.  
**Description:** Heavy inter-node operations are offloaded to a Celery task queue backed by Redis, ensuring the store's primary API remains responsive under load.  
**Implementation:** Celery workers are started as a separate process alongside the Django server (see Store Startup Sequence). Revenue aggregation and hub broadcast calls are wrapped in `@shared_task` decorated functions and dispatched with `.delay()` or `.apply_async()`.  

### Lazy Replication Caching
**Problem:** Fetching user data from a remote home store on every login generates unnecessary cross-region network traffic.
**Solution:** On-demand user data sync with local caching (24h TTL).
**Description:** User data is fetched from the home store only on a user's first login at a visiting store, then cached locally in `VisitingUserCache` table for exactly 24 hours. Subsequent logins within 24h use the local cache, reducing inter-node traffic. After 24h, cache is automatically deleted; next login triggers re-fetch from home store.
**Implementation:** On login, the authentication view first checks the local `User` table (home users). For visitors, it checks `VisitingUserCache`. On a miss, it calls `POST /api/hub/user-lookup/` to locate the user's home store, then `POST /api/inter-node/user-sync/` to the home store to pull data and cache locally in `VisitingUserCache` (with 24h expiration) before issuing a token.  

### Inter-Node Timeout Boundaries
**Problem:** Slow or unreachable nodes can stall request chains and cause cascading failures.  
**Solution:** Defined timeouts with exponential backoff retry logic.  
**Description:** Inter-node requests enforce a 5-second connection timeout and 10-second read timeout. Failed requests retry with exponential backoff (1s, 2s, 4s, 8s), ensuring the system degrades gracefully rather than hanging indefinitely.  
**Implementation:** All inter-node HTTP calls use the `requests` library with explicit `timeout=(5, 10)` parameters. Retry logic is implemented via the `tenacity` library with `wait_exponential(min=1, max=8)` and a maximum of 4 attempts.  

### Dashboard Refresh Rate
**Problem:** Continuously polling dashboards at high frequency puts unnecessary load on store and hub servers.  
**Solution:** 30-second auto-refresh intervals on live dashboards.  
**Description:** Real-time dashboards (Super Admin, Repair Staff, Logistics Manager) refresh every 30 seconds. Auto-refresh only runs on active views and stops in the background, keeping polling traffic proportional to actual usage.  
**Implementation:** Dashboard components use `setInterval` with a 30-second delay to re-fetch data. The interval is cleared via `clearInterval` in the component's cleanup function (React Native `useEffect` return), stopping polling when the user navigates away.  

## Security risks

The CodePop app incorporates a robust security model based on Django’s built-in authentication and authorization system. This system manages user accounts, groups, permissions, and cookie-based sessions, ensuring secure access across different user roles. This is important since many user roles have a direct impact on on day to day operations. 
* Admins have the ability manage user accounts in their area as well as create managers for stores.
* Managers can access their stores information like expense reports and sales figures.
* Logistics Managers have access to an entire regions supplies and can approve or deny requests for supplies.
* Super Admins can view the information of any store nation wide as well as create admin accounts.
If a malicious actor got access to any of these roles they could inflict serious financial harm on the company and our customers so a strong security is a must. To enhance security, features such as password strength checking can be implemented. Staff should also be told about ways the can keep their account secure. The app separates the client and server, utilizing token-based authentication for secure communication. Django’s security features include query parameterization for injection protection and Cross-Site Request Forgery (CSRF) protection to prevent unauthorized actions. Additionally, sensitive data, including user payment information, email addresses, and store revenue reports, will be encrypted using SHA-256 both at rest and in transit. CodePop complies with relevant data protection laws such as GDPR and takes measures to address the OWASP Top 10 security risks. Users will be given the option to opt into features that handle personal data, ensuring transparency and privacy. 

### Risks with AI
With the advent of AI we have seen numerous ways to "jailbreak" them and get them to say or do things they weren't intend to do. Since we have multiple interfaces for communicating with AI in the CodPop app we must take precautions to ensure that a bad actor cannot take advantage of our AI. It should be assumed that our AI *will* be exploited at some point. To minimize the damage this will cause the scope of our AI's abilities should be limited. Our resident customer support bot, Tonic, should only have access to order information to help process refunds. He should not be able to access any other data from our database. This way the worst he can do is say something obscene not leak the fiances of the company. Our Logistics Manager AI is a bit different. It will have access to sensitive documents that are uploaded by the staff. It should not be able to access anything more. To ensure that the AI stays on task we must give them initial prompts that ensure they do what they are told. These prompts should be robust enough to with stand the most common jailbreak prompts. To increase the stability of the AI's they should not be reset when they are no longer needed. Having them remember past conversations is not necessary for the functionality we require and introduces many technical and stability issues with the AI.

* **Authentication and Authorization**: Description of user roles and permission management.  
  * Explanation of admin and manager access and roles:  
    * Admins: 
        * Admins have access to user account information in their store.
        * Admins are able to add/remove general user accounts and create manager accounts for their stores.   
    * Super Admins
        * Super Admins have all the same permissions as a regional Admin but on a national scale.
        * Super Admins can create/remove store admins.
    * Managers:
        * Managers have access to store data such as revenue and expense reports.   
    * Logistics Manager:
        * Logistics Managers have access to regional supply chain information.
        * Logistics Managers determine supply routes.
    * Repair Staff:
        * Repair Staff can view any machine's status in their area.
  * User authentication:
    * Django comes with a built in user authentication system that handles user accounts, groups, permissions and cookie-based user sessions 
      * This system can be expanded and customized to add things like password strength checking to add more security.    
  * To secure the application, the client and server will be separated.   
    * The client and server will talk to each other through token authentication which is already included with Django.   
  * Django security features: [https://docs.djangoproject.com/en/5.1/topics/security/](https://docs.djangoproject.com/en/5.1/topics/security/)  
    * Includes injection protection because queries are constructed using query parameterization  
    * Includes Cross site request forgery (CSRF) protection which prevents attacks that perform actions using other people’s credentials.
  * API endpoints will be used to ensure a user can access a endpoint with their role.
* **Inter-Node Communication Security**: How to keep communications between servers secure
  * **Passwords never transmitted**: Only Django PBKDF2 hashed password values are transferred during user data sync. Raw passwords are never transmitted between nodes under any circumstances.
  * **HTTPS/TLS 1.3 required**: All inter-node communication uses encrypted transport in production. HTTP acceptable only on internal IPs during development; never transmit sensitive data over public IPs without TLS.
  * **Token-based authentication**: All inter-node requests require `Authorization: NodeToken {INTER_NODE_SECRET}` header. Endpoints under /api/hub/ and /api/inter-node/ reject requests without valid token (401 Unauthorized).
  * **Sensitive fields blocked**: The following fields are NEVER transmitted in inter-node data transfers: raw passwords, payment methods, card details, Stripe customer IDs. Only transfer required fields: username, email, hashed_password, preferences, favorite_drinks, role.
  * **JWT tokens validated**: Tokens are validated for expiry and RS256 signature on every request. Expired or malformed tokens are rejected with 401 (currently using shared secrets; JWT RS256 is planned for future upgrade).
  * **Visiting user cache isolation**: Visiting user data stored in separate `VisitingUserCache` table, never joined with home user data in same query. Clear separation prevents data leakage.
  * **Queued updates encrypted**: Profile updates queued for delivery to offline home stores are encrypted at rest (AES-256 or Django encrypted fields). Queued data is protected if the VM is compromised.
  * **Rate limiting**: Inter-node endpoints are rate limited to prevent a compromised node from flooding others with requests. Recommended: 100 requests/minute per node with burst allowance.
  * **Audit logging**: All inter-node data transfers logged with timestamp, requesting_node_id, data_type, success/failure status. Logs retained for at least 30 days for forensic analysis.
  * **Hardcoded hub discovery**: All hub addresses are known via static configuration (no dynamic discovery). This prevents unauthorized hubs from registering.
  * **Nodes deployed in Docker**: Each node runs in isolated Docker container on Google Cloud Platform. Containers are isolated from each other and the host system.
* **Data Encryption**: Explanation of how data will be encrypted (at rest and in transit).  
  * Django user data encryption  
  * Sha 256 encryption  
* **Compliance**: Relevant data protection laws (GDPR, HIPAA).  
  * Pay attention to the OWASP top 10: [https://owasp.org/www-project-top-ten/](https://owasp.org/www-project-top-ten/)  
* **Sensitive data**  
  * User data:  
    * Payment information  
    * Email  
    * geolocation  
  * Store data:  
    * Revenue tables (regional and local) 
  * Hub data:
    * Region's supplies
* **Privacy**  
  * We will make sure that the user has the option to opt into any of the features that handle personal data (geolocation, drink preferences, emails) to ensure that they are able to make an informed choice about their data.
* **Leak Policy**: What to do when a leak occurs and sensitive information gets out.
  * Find leak and patch it ASAP
  * Assess damage, see what got out
    * Contact users about their data and account

## Testing Strategy

CodePop uses Django's built-in test framework on the backend and Jest with React Native Testing Library on the frontend. The goal is to automate as much verification as practical and reserve manual testing for visual and user-experience concerns that are difficult to script.

### Backend Testing (Django)

All backend tests live in `codepop_backend/backend/tests.py`. Test classes extend either Django's `TestCase` or DRF's `APITestCase`. Each class creates isolated test users and auth tokens in its `setUp` method using `Token.objects.create(user=...)` and makes requests through a `APIClient()` instance. Authentication is applied with `self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)`. This pattern is already in use across the existing test suites (`PreferenceTests`, `DrinkTests`, `InventoryTests`, etc.) and will be followed for all new test classes.

**New and updated test suites to be added:**

*UserRoleTests* — Verifies role-based access control for every dashboard. Tests will authenticate as each role (customer, manager, admin, logistics manager, repair staff, super admin) and assert that each can only access endpoints appropriate to their scope. For example, a manager token should return 403 when hitting a super admin endpoint, and a logistics manager token should only see their assigned region's data.

*MachineTests and MaintenanceLogTests* — Tests will cover machine status transitions (NORMAL → WARNING → ERROR → OUT_OF_ORDER → REPAIR_START → REPAIR_END → NORMAL), verify that machines in ERROR or OUT_OF_ORDER states cannot accept new orders, and confirm that `MaintenanceLog` entries are created and associated correctly when repair actions are logged.

*UserReplicationTests* — Tests the lazy replication path. When a user is not found locally, the view should call `POST /api/inter-node/user-lookup/` on the hub and then `POST /api/inter-node/user-sync/` to pull and cache data. Both inter-node calls will be mocked with `patch`, and the test will assert the user is created in the local database and a valid token is returned.

*RevenueAggregationTests* — Tests that regional and nationwide revenue rollup endpoints correctly sum store-level `Revenue` records. Hub-level aggregation will use mocked peer responses to simulate multi-store data without a full distributed setup.

*SupplyRequestTests* — Covers the supply request lifecycle: creation by a manager, status transitions (Submitted → Approved → In Transit → Delivered), and approval/rejection by a logistics manager. Tests will assert that only logistics managers and super admins can approve requests.

*StripePaymentTests* — Uses `unittest.mock.patch` to mock the Stripe API client. Tests will verify that a valid order triggers a payment intent creation, that the `Order.PaymentStatus` is updated to `'paid'` upon a simulated `payment_intent.succeeded` webhook, and that a failed payment returns an appropriate error response.

*GeolocationTests* — Mocks the Mapbox API responses to confirm that the backend correctly calculates ETA, triggers drink preparation at the right time, and handles the fallback case where the user opts out of geolocation and selects a manual pickup time instead.

### Frontend Testing (React Native)

Frontend tests use Jest and React Native Testing Library. Component tests verify that each dashboard (manager, admin, logistics manager, repair staff, super admin) renders its key UI elements, handles loading and error states, and shows or hides sections based on the authenticated user's role. UI color scheme, fonts, and logo compliance will be verified through snapshot tests that are updated whenever intentional design changes are made, catching accidental regressions.

Frontend tests use Jest and React Native Testing Library (`@testing-library/react-native`). Each screen and component gets its own test file under a `__tests__/` directory mirroring the `src/pages/` and `src/components/` structure.

**Component rendering tests** use `render()` from React Native Testing Library to mount a component with controlled props and mock navigation. Assertions target rendered text and elements using `getByText()`, `getByTestId()`, and `queryByTestId()`. For example, the manager dashboard test renders `<ManagerDash />` with a mocked manager token and asserts that the revenue card and inventory report link are present.

### Manual Test Cases

For features that are impractical to automate — such as ensuring correct images render in the app or validating the Mapbox map renders at the right location — a manual test checklist is maintained. A record of manual test cases will be kept to ensure repeatability and adequate coverage or each tesing iteration. A potential table for these manual tests may look like the following:

| # | Feature Area | Test Case | Expected Result |
|---|---|---|---|
| 1 | e.g. UI/UX | Open every page; check color scheme, fonts, and logo match the UI rules document | All pages consistent |
| 2 | e.g. Geolocation | Enable GPS, open payment page, proceed to checkout | ETA displayed; drink prep triggered on arrival |
 
## Programming languages, libraries, frameworks, and third party systems

#### **Front-End**

* Framework: React Native  
* Languages: JavaScript, HTML, CSS

  #### **Middle-End**

* Framework: Django  
* Languages: Python

  #### **Back-End**

* Framework: Django  
* Database: PostgreSQL  
* Languages: Python, SQL

  #### **APIs & External Services**

This is the consolidated **Low-Level Design (LLD)** for the **CodePop** API & Integration architecture. This document bridges the gap between the high-level concept and the technical implementation of AI, payments, and robotic fulfillment.

## **System Architecture & Strategy**

CodePop uses a **Hub-and-Spoke** architecture where the Django backend acts as the central orchestrator. All client requests from React/React Native are routed through Django to secure third-party API keys (Stripe, Mapbox, Dialogflow) and ensure data persistence in PostgreSQL.

---

## **AI Integration: Customer Service (Dialogflow)**

The Customer Service tab will use an asynchronous message exchange. Django acts as the secure gateway to the Dialogflow SessionsClient.

### **Implementation Detail: POST /api/v1/support/chat/**

* **Trigger:** User submits a query in the React/React Native Support tab.  
* **Logic (Django):** 1\. Receive session\_id and text\_input.  
  2\. Initialize google.cloud.dialogflow\_v2.SessionsClient.  
  3\. Call detect\_intent using the session\_path.  
  4\. Store the interaction in SupportTicket model for human review if the AI "fails" (fallback intent).  
* **Data Contract:**

JSON

// Request from Mobile/Web  
{  
  "session\_id": "uuid-v4",  
  "query": "Where is my order \#1234?"  
}

// Response from Django  
{  
  "fulfillment\_text": "I've checked order \#1234. It is currently being mixed and will be ready in 2 minutes\!",  
  "intent": "Order\_Status\_Check",  
  "confidence": 0.98  
}

---

## **AI Integration: "Pop-Gen" Randomizer**

This features a "Surprise Me" mechanic where the AI generates a drink based on user preferences (e.g., "Fruity," "Creamy," "Diet-only").

### **Implementation Detail: POST /api/v1/drinks/generate-random/**

* **Trigger:** User clicks the "AI Random Drink" button.  
* **Logic (Django \+ Dialogflow/LLM):**  
  1. Fetch available inventory from Soda and Syrup tables in **PostgreSQL** to ensure the AI doesn't suggest out-of-stock items.  
  2. Pass preferences to a specialized Dialogflow Intent or an OpenAI/Vertex AI prompt.  
  3. **Constraint Logic:** The backend must validate that the "AI drink" follows business rules (e.g., max 3 syrups) before returning it.  
* **Data Contract:**

JSON

// Request from Frontend  
{  
  "preferences": {  
    "base\_type": "cola",  
    "flavor\_profile": "tropical",  
    "diet\_only": true  
  }  
}

// Response from Django  
{  
  "generated\_drink\_id": "temp\_99",  
  "name": "The Tropic Thunder Bolt",  
  "recipe": {  
    "base": "Diet Coke",  
    "add\_ins": \["Coconut Syrup", "Pineapple Shot", "Fresh Lime"\],  
    "ice\_level": "Extra"  
  },  
  "ai\_description": "A crisp cola base with a wave of island coconut."  
}

---

## 

## **Core Service Integrations**

### **Customer Service AI (Dialogflow)**

The AI is strictly utilized within the **Customer Service Tab** to handle FAQs and order inquiries.

* **Method:** Google Cloud SDK (google-cloud-dialogflow).  
* **Logic:** Django receives message strings, initiates a session with Dialogflow, and returns the fulfillment\_text.  
* **Endpoint:** POST /api/v1/support/chat/  
  * *Input:* { "session\_id": "UUID", "query": "string" }  
  * *Output:* { "reply": "string", "intent": "string" }

### **"Pop-Gen" AI Randomizer**

A generative beverage engine that creates unique drinks based on preferences.

* **Logic:** 1\. Django queries PostgreSQL for available Soda and Syrup inventory.  
  2\. Filters by user preference (e.g., "Diet-only," "Tropical").  
  3\. The AI engine generates a recipe that fits the business logic constraints (max 3 syrups).  
* **Endpoint:** POST /api/v1/drinks/generate-random/

### **Payment Processing (Stripe)**

Since we are using **React Native (Mobile)** and **React (Web)**, we utilize the **Stripe Payment Intents API** to handle the heavy lifting.

### **Implementation Detail: Checkout Flow**

* **Intent Creation:** Frontend calls POST /api/v1/payments/create-intent/.  
  * Django calculates the price of the "Random Drink" or standard order.  
  * Django calls stripe.PaymentIntent.create(amount=total, currency='usd').  
* **Card Collection:** \* **Web:** React uses \<CardElement /\> from @stripe/react-stripe-js.  
  * **Mobile:** React Native uses confirmPayment from @stripe/stripe-react-native.  
* **Webhook Verification:** \* Stripe sends a POST to /api/v1/payments/webhook/.  
  * **Security:** Django uses stripe.Webhook.construct\_event with the endpoint\_secret to verify the payload hasn't been tampered with.  
  * **Action:** On payment\_intent.succeeded, Django updates the Order status in PostgreSQL to PAID and triggers a push notification to the user.

---

**4\. Geolocation & Just-In-Time Fulfillment**

This subsystem ensures "freshness" by syncing user proximity with robotic assembly time.

### **The "Golden Window" Calculation**

The system triggers the robot to pour when the User’s ETA matches the Drink Prep Time.

Trigger = Arrival - Prep

### **GPS vs. Manual Trigger**

* **GPS Tracking:** React Native uses Mapbox SDK to send heartbeats to POST /api/v1/fulfillment/proximity-update/.  
* **Velocity Logic:** Django calculates the rate of approach. If the user stops (e.g., at a red light), the ETA is recalculated to prevent the drink from sitting out too long.  
* **Manual Override:** If GPS is denied, the UI provides a list of stores that can be sorted by hub to be picked  **"Start" button**. This sends an immediate trigger to the robotic queue via POST /api/v1/fulfillment/manual-trigger/.

### **Scheduled Orders**

* **Implementation:** Utilizes **Celery \+ Redis** task queuing.  
* **Logic:** Orders are stored in PostgreSQL with a scheduled\_time. A Celery worker checks every 30 seconds for orders whose $T\_{trigger}$ has arrived, then pushes them to the robot controller.

---

**Technical Specifications & Deployment**

### **Database Schema (Key Entities)**

| Table | Key Fields | Purpose |
| :---- | :---- | :---- |
| **Order** | id, user\_id, status, total, transaction\_id | Core transaction tracking. |
| **Fulfillment** | order\_id, type (GPS/Manual/Sched), last\_eta | Manages the "Golden Window" data. |
| **Inventory** | item\_name, type (Soda/Syrup), is\_in\_stock | Feeds the AI Randomizer. |

### **Infrastructure (GCP Focus)**

| Component | Implementation Detail |
| :---- | :---- |
| **Containerization** | **Docker** (Ubuntu-based Python 3.11 image). |
| **Backend Hosting** | **Google Cloud Run** (Serverless, scales to zero, high AI synergy). |
| **Database** | **Cloud SQL (PostgreSQL)** with automatic backups. |
| **Security** | **GCP Secret Manager** for API keys; SSL via Cloud Run. |
| **CI/CD** | **GitHub Actions** for automated testing and deployment to staging/production. |


## Deployment plan

**1\. Development Environment Setup**

* **Version Control**: Use Git for managing source code. Establish a remote repository (e.g., GitHub, GitLab) for collaboration.  
* **Local Development**: Set up local environments for developers with tools like Docker for containerization to ensure consistency.  
* **Technology Stack**:  
  * Frontend: HTML, CSS, JavaScript, and Reach Native framework  
  * Backend: Django for server-side logic and database management.  
  * Database: PostgreSQL for managing user data, drinks, and store information.  
* **Dependencies**: Use `pip` for Python dependencies and `npm` for any frontend packages.

**2\. Staging Environment**

* **Staging Server Setup**: Deploy a staging environment to test all new features before going live.  
* **Testing**:  
  * **Unit Testing**: For each individual function like `createUser()`, `getDrink()`, etc.  
  * **Integration Testing**: Ensure all components (frontend, backend, database) work together.  
  * **Accessibility Testing**: Verify compliance with WCAG, ensuring color contrast, screen reader compatibility, and tab navigation.  
  * **Load Testing**: Use tools like Apache JMeter to simulate heavy traffic and ensure scalability.  
* **Pre-Deployment Validation**: Test payment flows with the Stripe API, and ensure all security measures (token authentication, CSRF protection) are in place.

**3\. User Acceptance Testing (UAT)**

* Invite key stakeholders (store owners, staff) to use the staging environment and provide feedback.  
* Ensure the interface is intuitive, accessible, and aligns with business needs.  
* Adjust any features or fix bugs found during UAT before final production deployment.

**4\. Production Environment Setup**

* **Hosting**:  
  * **Frontend Hosting**: Deploy frontend assets to a Content Delivery Network (CDN) for fast global access (e.g., AWS S3 or Netlify).  
  * **Backend Hosting**: Use cloud-based services like AWS EC2 or DigitalOcean for running the Django app.  
* **Database Setup**: Deploy the PostgreSQL database using cloud-based solutions (e.g., AWS RDS or Heroku Postgres) for scalability and backup.  
* **Security Setup**:  
  * **SSL/TLS Certificates**: Ensure HTTPS is enabled for secure communication.  
  * **Environment Variables**: Store sensitive data like API keys and database credentials securely (e.g., AWS Secrets Manager).  
  * **Firewall & Access Control**: Set up firewalls and limit access to production servers using SSH keys.  
  * **Backup Plan**: Regular backups of databases and critical assets to prevent data loss.

**5\. Production Deployment**

* **Code Freeze**: Set a code freeze date before deployment to ensure no last-minute changes.  
* **Final Deployment Steps**:  
  * Deploy the frontend and backend to their respective hosting services.  
  * Migrate any production databases and ensure all data from staging is migrated.  
  * Ensure that token-based authentication and secure data encryption (e.g., SHA-256) are fully operational.  
* **Post-Deployment Validation**:  
  * Test all critical functions (sign-in, drink creation, cart, payment).  
  * Check that the admin and manager dashboards are accessible with the correct permissions.

**6\. Post-Deployment Monitoring & Maintenance**

* **Ongoing Monitoring**: Ensure performance metrics are actively tracked, especially during high traffic periods.  
* **Bug Fixes**: Implement a process for quickly addressing user-reported issues or security vulnerabilities.  
* **Regular Updates**: Schedule periodic security patches, updates to libraries, and infrastructure improvements.

**7\. Scaling & Future Enhancements**

* **Auto-Scaling**: Set up auto-scaling for cloud-based infrastructure to handle growing user demand.  
* **Feature Rollouts**: Plan for iterative feature deployment, such as enhanced AI drink recommendations or more detailed analytics for managers and admins.  
* **Performance Optimization**: Regularly review the system’s performance and optimize database queries, asset loading times, and server response times.