# **Code Pop High-Level Design Document - Revised**

## **3. Architecture Design**

### **Architecture Overview**

This section describes a **planned future architecture** for CodePop's transformation from a single-location system to a nationwide distributed network. The current implementation is a centralized single-store system. This document serves as the architectural blueprint for the distributed system upgrade.

CodePop will employ a **federated distributed system architecture** where each physical store location operates as an independent node with regional coordination hubs. This is **not** a true peer-to-peer system but rather a **hub-and-spoke model with store autonomy**.

**Key Architectural Principles:**

* **Decentralization**: No central server controls the entire system. Each store runs its own complete backend stack (Django + PostgreSQL) and can operate independently during network partitions.

* **Regional Coordination**: Seven regional supply hubs provide logistics coordination, peer discovery, and inventory management for stores within their geographic regions. Hubs are **not** customer-facing and do not process drink orders.

* **Hybrid Communication Model**:
  - **Hub as Service Registry**: Stores register with hub on startup; hub maintains "phone book" of stores in region
  - **Hub for Discovery**: When Store B needs data from Store A, it first asks hub "where is Store A?"
  - **Direct Store-to-Store for Data**: Once Store B has Store A's address, they communicate directly (peer-to-peer) without hub mediation
  - **Hub for Logistics**: Supply requests, revenue aggregation, and machine status reporting still go through hub

* **Fault Isolation**: Failures or outages at one store or hub do not prevent other stores from continuing normal operations. The system is designed to gracefully handle network partitions and temporary connectivity loss.

* **Local-First Data**: Each store maintains its own operational data (orders, inventory, revenue, machine status) in its local database. Only specific data types (user accounts, preferences, favorites) are synchronized across the network on-demand.

---

### **Network Topology:**

```
┌─────────────────────────────────────────────────────────────────┐
│          Supply Hub Network (7 Regional Hubs)                   │
│  Chicago IL │ New Jersey NY │ Logan UT │ Dallas TX │ etc.       │
│  - Service registry (lists stores in region)                    │
│  - Logistics coordination (supply requests)                     │
│  - Regional inventory aggregation                               │
│  - User account lookup service                                  │
└────────────┬────────────────────────────────┬───────────────────┘
             │                                │
             │    Hub-Store Communication     │
             │    (REST APIs + Event Queue)   │
             │                                │
    ┌────────▼────────┐              ┌───────▼────────┐
    │  Store Node A   │              │  Store Node B  │
    │  - Django API   │◄─────────────►  - Django API  │
    │  - PostgreSQL   │ (direct P2P) │  - PostgreSQL  │
    │  - Local Data   │              │  - Local Data  │
    │  - Event Queue  │              │  - Event Queue │
    └────────┬────────┘              └───────┬────────┘
             │                                │
    ┌────────▼────────┐              ┌───────▼────────┐
    │  Mobile Client  │              │  Mobile Client │
    │  (React Native) │              │  (React Native)│
    └─────────────────┘              └────────────────┘
```

Each store node includes:
- **Django Backend**: Full REST API implementation with all business logic
- **PostgreSQL Database**: Complete local data storage for that store
- **Inter-Node Communication Layer**: REST endpoints for hub-to-store and store-to-store communication
- **Event Queue**: Celery workers with Redis broker for asynchronous message processing
- **Service Registry Client**: Maintains connection to regional supply hub for peer discovery

Each supply hub includes:
- **Same Django Codebase**: Supply hubs run the same Django backend as stores but with different configuration
- **No Customer Operations**: Supply hubs do NOT have robotic machines, do NOT accept customer orders, and are NOT customer-facing
- **Logistics Functions Only**: Manage supply requests, track regional inventory, maintain store registry

---

### **Mobile Client Interaction:**

The React Native mobile app uses geolocation to discover nearby operational stores via the store discovery API.

**Store Discovery Flow:**
1. User opens app → App requests device location (latitude, longitude)
2. Backend queries Store table for stores within radius, returns sorted list of nearby stores
3. User selects store (or app auto-selects closest operational store)
4. All subsequent orders and interactions target that specific store's API endpoint
5. If selected store becomes unavailable (health check fails), the app can switch to another nearby store

CodePop uses a **lazy replication model** for user data:

- **NOT Proactive Replication**: User accounts are NOT automatically replicated to all stores
- **NOT Eventual Replication**: There is NO background process that eventually propagates all user data everywhere
- **Lazy On-Demand**: User data is replicated to a store ONLY when that user logs in at that store for the first time

**Why Lazy Replication?**
- **Scalability**: With thousands of stores nationwide, eagerly replicating millions of user accounts to every store would be prohibitively expensive
- **Data Locality**: Most users visit the same store repeatedly, so local caching after first visit is efficient
- **Reduced Sync Traffic**: Only active users generate sync traffic, not dormant accounts
- **Privacy**: User data is only distributed to stores where the user has actually been

---

### **Cross-Region User Discovery**

When a user from one region logs in at a store in a different region, the system uses **hierarchical hub coordination** to locate the user's origin store:

1. **Discovery**: Hubs query all 6 other regional hubs in parallel to find users
2. **Transfer**: Stores talk directly to each other, bypassing hubs
3. **Caching**: After first login, subsequent logins are much quicker (no re-querying)

```
User from Logan (Region C) logs in at New York Store (Region B)
        ↓
New York Store: checks local DB → not found
        ↓
New York Store → New York Hub: "Where is user alice@example.com?"
        ↓
New York Hub: queries NY stores → not found locally
        ↓
New York Hub: broadcasts to OTHER 6 REGIONAL HUBS
    "Does anyone have user alice@example.com?"
        ↓
    ┌───────┼───────┬────────┬─────────┐
    ▼       ▼       ▼        ▼         ▼
Chicago Dallas Phoenix Atlanta Logan Boise
  Hub     Hub     Hub      Hub    Hub   Hub
    ↓       ↓       ↓        ↓      ↓     ↓
   No      No      No       No    YES!  No
                                   ↓
                    Logan Hub responds:
            "Yes! User at store-logan-001.codepop.com"
                                   ↓
        New York Hub tells New York Store:
            "User found at Logan Store (Region C)"
                                   ↓
        New York Store → Logan Store (direct P2P)
            "Please send user alice's data"
                                   ↓
            Logan Store → New York Store
            (sends user account + preferences)
                                   ↓
        New York Store replicates user locally
                                   ↓
                User logs in successfully!
```

---

### **Revenue Aggregation for Logistics Managers**

**Architecture:**
1. **Revenue stays local**: Each store's Revenue table contains only that store's transactions
2. **Supply hub does NOT store revenue**: Hub has no Revenue table
3. **On-demand polling**: When logistics manager requests regional report, hub queries all stores in region

---

### **Nationwide Revenue Aggregation for Super Admins**

CodePop uses a **master hub** (e.g., Logan Hub) as the primary aggregation point with **client-side fallback** for resilience.

**Primary Path (Master Hub):**
```
Super Admin Dashboard → Master Hub → 7 Regional Hubs → ~140 Stores
```

The master hub queries all regional hubs in parallel, each regional hub aggregates its stores, and the master hub combines results. Results are cached for 1 hour.

**Fallback Path (Client-Side):**

If the master hub is unavailable, the dashboard queries all 7 regional hubs directly in parallel and aggregates results client-side. Slower (~10-15 seconds) but ensures system remains operational.

**Other Nationwide Metrics:**

The same hierarchical pattern applies to inventory status (items critically low, out-of-stock), order statistics (total orders, popular drinks), and machine health (machines by status, stores needing repair). All use master hub aggregation with client-side fallback.

---

### **Machine Status State Machine**

Machines can transition between the following states:

* **NORMAL**: Machine operating within normal parameters; no issues detected
* **WARNING**: Non-critical issue detected; machine still operational but requires attention within 1-2 weeks
* **ERROR**: Critical issue detected; machine operational with degraded performance; requires repair within 7 days
* **SCHEDULE-SERVICE**: Machine operational but due for scheduled preventive maintenance within 1 month
* **OUT-OF-ORDER**: Machine not operational; cannot process orders; requires immediate repair
* **REPAIR-START**: Repair staff has begun servicing the machine; machine offline during repair
* **REPAIR-END**: Repair work completed; machine undergoing post-repair testing before returning to service

**Status Updates to Hub:**
- Stores push machine status changes to regional hub immediately
- Hub dashboard shows real-time machine status for repair staff and logistics managers
- Repair staff can filter machines by status (e.g., show all OUT-OF-ORDER machines in region)

---

### **Technology Stack**

**Frontend: React Native (Expo 51.0.38)**
- Cross-platform mobile app framework for iOS and Android
- Supports geolocation-based store discovery, connection resilience, and offline caching

**Backend: Django 5.1 + Django REST Framework 3.14**
- Each store and hub runs its own Django instance with complete REST API
- Supports node identity, peer registry, inter-node endpoints, and asynchronous event publishing for distributed operations

**Database: PostgreSQL 15**
- Each store runs its own independent PostgreSQL instance (database-per-store architecture)
- Provides data autonomy, fault isolation, and independent scaling
- JSONB support for semi-structured data (store hours, supply requests)
- No global transactions; uses eventual consistency for cross-store operations

**Asynchronous Task Queue: Celery 5.3+ with Redis 7.0+**
- **Celery**: Distributed task queue system that executes background jobs asynchronously using worker processes
- **Redis**: In-memory data store used as the message broker (queue) between Django and Celery workers
- **Why needed**: Without async processing, operations like "sync user account to 5 peer stores" would block the user's API request for seconds. With Celery, the API returns immediately (~50ms) while background workers handle the slow operations.
- Supports event processing (user data sync), heartbeat monitoring (peer health checks), and automated supply alerts
- Built-in retry logic handles transient network failures when communicating with peer stores

**Artificial Intelligence:**
- **Scikit-Learn 1.3+**: Content-based and collaborative filtering for personalized drink recommendations
- **Time-Series Forecasting**: Predicts inventory depletion and automates supply request triggers
- **Route Optimization**: Genetic algorithms for efficient repair staff scheduling across multiple stores
- **DialoGPT (Hugging Face)**: Natural language chatbot for customer service (transformers 4.30+, torch 2.0+)
- **Gemini API**: Decorative image generation for app graphics

---

## **5. Data Design**

The CodePop data model has been extended to support multiple store locations, regional supply hubs, machine maintenance tracking, and logistics coordination. The model follows a **database-per-store design** where some entities are local to each store (Orders, Inventory, Machines) while others are **lazily replicated** across the network on-demand (User, Preference, Drink).

---

### **User**

User accounts are global across all stores via lazy replication.

| Field | Description |
|-------|-------------|
| **id** | Globally consistent user ID (primary key) |
| **username** | Login username (unique) |
| **password** | Password (PBKDF2-SHA256, configurable to Argon2) |
| **email** | Email address (AES-256 encrypted at rest) |
| **is_staff** | Staff privileges flag |
| **is_superuser** | Superuser privileges flag |

---

### **UserProfile**

Tracks replication metadata and store preferences.

| Field | Description |
|-------|-------------|
| **user** | Links to User table (one-to-one) |
| **is_replicated** | True if replicated from another store |
| **source_node_id** | Original store where account was created |
| **preferred_store** | Links to Store table (optional) |

---

### **UserRole**

Defines user roles and their scope.

| Field | Description |
|-------|-------------|
| **user** | Links to User table |
| **role_type** | ACCOUNT_USER, GENERAL_USER, MANAGER, ADMIN, LOGISTICS_MANAGER, REPAIR_STAFF, SUPER_ADMIN |
| **store** | Links to Store table (for MANAGER, ADMIN roles) |
| **region** | Links to Region table (for LOGISTICS_MANAGER, REPAIR_STAFF) |
| **is_active** | Whether role is currently active |

---

### **Preference**

Stores flavor preferences for users (one preference per row).

| Field | Description |
|-------|-------------|
| **PreferenceID** | Primary key |
| **UserID** | Links to User table |
| **Preference** | Preference value (e.g., "Strawberry", "No Coconut") |

**Replication**: Lazy - replicated with user account.

---

### **Drink**

Drink combinations (catalog or user-created).

| Field | Description |
|-------|-------------|
| **DrinkID** | Globally unique drink ID (primary key) |
| **Name** | Drink name |
| **SyrupsUsed** | Array of syrups used in drink |
| **SodaUsed** | Array of sodas used in drink |
| **AddIns** | Array of add-ins (fruit, candy, ice) |
| **Price** | Price in USD |
| **User_Created** | True if user-created, False if catalog |

---

### **Region**

Geographic region containing multiple stores and one supply hub.

| Field | Description |
|-------|-------------|
| **region_code** | Region identifier (A-G) - primary key |
| **name** | Region name (e.g., "Logan, UT") |
| **center_latitude** | Geographic center latitude |
| **center_longitude** | Geographic center longitude |

---

### **SupplyHub**

Regional supply hub (runs same Django codebase as stores but configured for logistics only - no machines, no customer orders).

| Field | Description |
|-------|-------------|
| **hub_id** | Primary key |
| **region** | Links to Region table (one-to-one) |
| **name** | Hub name |
| **latitude** | Geographic latitude |
| **longitude** | Geographic longitude |
| **api_base_url** | API endpoint (e.g., "https://hub-logan.codepop.com") |
| **is_operational** | Operational status |

---

### **Store**

Physical CodePop location.

| Field | Description |
|-------|-------------|
| **store_id** | Primary key |
| **store_number** | Store identifier (e.g., "LOGAN-001") - unique |
| **name** | Store name |
| **region** | Links to Region table |
| **supply_hub** | Links to SupplyHub table |
| **latitude** | Geographic latitude |
| **longitude** | Geographic longitude |
| **api_base_url** | API endpoint (e.g., "https://store-logan-001.codepop.com") |
| **is_operational** | Operational status |
| **hours_of_operation** | Store hours by day (JSON format) |

---

### **Inventory**

Ingredient quantities at each store (strictly local, not replicated).

| Field | Description |
|-------|-------------|
| **store** | Links to Store table |
| **ItemName** | Item name |
| **ItemType** | Soda, Syrup, Add In, Physical |
| **Quantity** | Current quantity |
| **ThresholdLevel** | Restock alert threshold |

---

### **Order**

Customer drink order at specific store (strictly local, not replicated).

| Field | Description |
|-------|-------------|
| **store** | Links to Store table |
| **UserID** | Links to User table (nullable for guest orders) |
| **Drinks** | Links to Drink table (many-to-many) |
| **OrderStatus** | pending, processing, completed, cancelled |
| **PaymentStatus** | pending, paid, failed, remade |
| **StripeID** | Stripe payment intent ID |

---

### **Revenue**

Financial transactions by a singular store strictly local to that store.

| Field | Description |
|-------|-------------|
| **store** | Links to Store table |
| **OrderID** | Links to Order table |
| **TotalAmount** | Revenue amount in USD |
| **SaleDate** | Transaction date |
| **Refunded** | Refund status |

---

### **Notification**

Notifications sent to users or managers.

| Field | Description |
|-------|-------------|
| **store** | Links to Store table (nullable for global notifications) |
| **UserID** | Links to User table (nullable for global notifications) |
| **Message** | Notification text |
| **Type** | order_update, inventory_alert, system_message, etc. |

---

### **Machine**

Robotic beverage-making machine (strictly local; status updates pushed to hub).

| Field | Description |
|-------|-------------|
| **machine_id** | Primary key |
| **store** | Links to Store table |
| **machine_type** | Machine type |
| **status** | normal, repair-start, repair-end, warning, error, out-of-order, schedule-service |
| **status_date** | Date status was set |

---

### **MaintenanceLog**

Service history for machines (local; accessible to repair staff via hub).

| Field | Description |
|-------|-------------|
| **machine** | Links to Machine table |
| **repair_staff** | Links to User table (repair staff) |
| **service_type** | routine_maintenance, repair, emergency_fix, part_replacement, cleaning |
| **service_start** | Service start time |
| **cost** | Service cost |

---

### **RepairSchedule**

Repair staff schedules (regional; managed by hub).

| Field | Description |
|-------|-------------|
| **repair_staff** | Links to User table (assigned repair staff) |
| **machine** | Links to Machine table |
| **scheduled_date** | Service date/time |
| **status** | scheduled, in_progress, completed, cancelled |

---

### **SupplyRequest**

Inventory replenishment request from store to supply hub (hub-managed).

| Field | Description |
|-------|-------------|
| **store** | Links to Store table |
| **supply_hub** | Links to SupplyHub table |
| **requested_items** | Items and quantities in JSON format (e.g., [{"item_name": "Cherry Syrup", "quantity": 50, "unit": "bottles"}]) |
| **priority** | low, normal, urgent |
| **status** | submitted, approved, in_transit, delivered, rejected |

---

### **Relationships Summary**

| Relationship | Type | Description |
|--------------|------|-------------|
| User → Preference | One-to-Many | User has multiple flavor preferences |
| User → Order | One-to-Many | User can place multiple orders |
| User → UserRole | One-to-Many | User can have multiple roles (e.g., manager of Store A, admin of Store B) |
| User → MaintenanceLog | One-to-Many | Repair staff logs multiple service activities |
| User → RepairSchedule | One-to-Many | Repair staff has multiple scheduled tasks |
| User ↔ Drink | Many-to-Many | Users can favorite many drinks; drinks can be favorited by many users |
| Region → Store | One-to-Many | Region contains multiple stores |
| Region → SupplyHub | One-to-One | Each region has one supply hub |
| Region → UserRole | One-to-Many | Region has multiple logistics managers and repair staff |
| SupplyHub → Store | One-to-Many | Supply hub services multiple stores |
| SupplyHub → SupplyRequest | One-to-Many | Supply hub receives multiple requests |
| Store → Inventory | One-to-Many | Store has multiple inventory items |
| Store → Order | One-to-Many | Store processes multiple orders |
| Store → Revenue | One-to-Many | Store generates multiple revenue records |
| Store → Machine | One-to-Many | Store has multiple machines |
| Store → SupplyRequest | One-to-Many | Store makes multiple supply requests |
| Store → UserRole | One-to-Many | Store has multiple managers and admins |
| Order ↔ Drink | Many-to-Many | Order contains multiple drinks; drink can be in multiple orders |
| Order → Revenue | One-to-One | Each order generates one revenue record |
| Machine → MaintenanceLog | One-to-Many | Machine has multiple service logs |
| Machine → RepairSchedule | One-to-Many | Machine has multiple scheduled service appointments |

---

### **Database Design**

**Database Type: PostgreSQL 15**

CodePop uses a **database-per-store** model where each store and hub runs its own independent PostgreSQL instance. This provides fault isolation (one store's failure doesn't affect others), data sovereignty (each store owns its data), independent scaling, and reduced latency (no network round-trip to central server). Trade-off: no global transactions (uses eventual consistency) and increased operational overhead (each database must be backed up and maintained independently).

#### **Major Tables in PostgreSQL**

| Table Name | Purpose | Local or Replicated | Key Relationships |
|------------|---------|---------------------|-------------------|
| **auth_user** | User accounts | Lazy replication | → Preference, Order, UserRole |
| **backend_userprofile** | User replication metadata | Lazy replication | → User, Store |
| **backend_userrole** | Role assignments | Lazy replication | → User, Store, Region |
| **backend_preference** | User flavor preferences | Lazy replication | → User |
| **backend_drink** | Drink combinations | Catalog: replicated, User-created: lazy | ↔ User (favorites), Order |
| **backend_region** | Geographic regions | Replicated (static, rarely changes) | → Store, SupplyHub |
| **backend_supplyhub** | Supply hubs | Replicated (static, rarely changes) | → Region, Store, SupplyRequest |
| **backend_store** | Store locations | Replicated (static, rarely changes) | → Region, SupplyHub, Inventory, Order, Machine |
| **backend_inventory** | Store inventory | Local (never replicated) | → Store |
| **backend_order** | Customer orders | Local (never replicated) | → Store, User, Drink |
| **backend_revenue** | Financial transactions | Local (never replicated) | → Store, Order |
| **backend_notification** | User notifications | Local (never replicated) | → Store, User |
| **backend_machine** | Robotic machines | Local (status pushed to hub) | → Store, MaintenanceLog |
| **backend_maintenancelog** | Machine service logs | Local (accessible to repair staff) | → Machine, User (repair staff) |
| **backend_repairschedule** | Repair schedules | Regional (managed by hub) | → Machine, User (repair staff) |
| **backend_supplyrequest** | Supply requests | Hub-managed | → Store, SupplyHub |

**Indexes:**
Django automatically creates indexes on primary keys and foreign keys. Custom indexes optimize performance-critical queries: inventory lookups and low-stock alerts, order dashboards and user history, revenue reports and refund tracking, machine status filtering, and geolocation-based store discovery.

**Data Migrations:**
Django's migration system handles schema changes across all store nodes. Migration files are committed to version control and applied independently at each store. Migrations are backward-compatible during rolling deployments (e.g., new nullable fields don't break old code).

**Data Encryption:**
- **At Rest**: Passwords hashed with PBKDF2-SHA256 (configurable to Argon2), sensitive fields encrypted with AES-256
- **In Transit**: All communication uses HTTPS/TLS 1.3 (client-to-backend and inter-node)
- **Payment Data**: No raw credit card data stored; Stripe handles payment processing (only payment intent IDs stored)

**Backup and Recovery:**
Each store runs automated backups with daily full backups and hourly incremental backups. Backups stored off-site with 30-day retention. Recovery process involves restoring from backup and re-syncing replicated data from peers. Local data (orders, inventory, revenue) must be recovered from backups as they are not replicated.