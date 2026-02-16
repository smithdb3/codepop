# **CodePop High-Level Design Document - Revised**

## **3. Architecture Design**

### **Architecture Overview**

This section describes a **planned future architecture** for CodePop's transformation from a single-location system to a nationwide distributed network. The current implementation is a centralized single-store system. This document serves as the architectural blueprint for the distributed system upgrade.

CodePop will employ a **federated distributed system architecture** where each physical store location operates as an independent node with regional coordination hubs. This is **not** a true peer-to-peer (P2P) system but rather a **hub-and-spoke model with store-level autonomy**.

**Key Architectural Principles:**

* **Decentralization**: No central server controls the entire system. Each store runs its own complete backend stack (Django + PostgreSQL) and can operate independently during network partitions.

* **Regional Coordination**: Seven regional supply hubs provide logistics coordination, peer discovery, and inventory management for stores within their geographic regions. Supply hubs are **not** customer-facing and do not process drink orders.

* **Hybrid Communication Model**:
  - **Hub as Service Registry**: Stores register with their regional hub on startup; hub maintains a directory of stores in the region
  - **Hub for Discovery**: When Store B needs data from Store A, it queries the hub to locate Store A
  - **Direct Store-to-Store Communication**: Once Store B knows Store A's address, data transfers happen directly between stores without hub mediation
  - **Hub for Logistics**: Supply requests, revenue aggregation, and machine status reporting flow through the hub

* **Fault Isolation**: Failures or outages at one store or hub do not prevent other stores from continuing normal operations. The system gracefully handles network partitions and temporary connectivity loss.

* **Local-First Data**: Each store maintains its own operational data (orders, inventory, revenue, machine status) in its local database. Only user-related data (accounts, preferences, favorites) synchronizes across the network on-demand.

---

### **Network Topology**

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
             │                               │
    ┌────────▼────────┐              ┌───────▼────────┐
    │  Mobile Client  │              │  Mobile Client │
    │  (React Native) │              │  (React Native)│
    └─────────────────┘              └────────────────┘
```

**Store Node Components:**
- **Django Backend**: Full REST API with business logic
- **PostgreSQL Database**: Local data storage
- **Celery + Redis**: Asynchronous task processing and event queue
- **Inter-Node Communication**: REST endpoints for hub and peer store communication

**Supply Hub Components:**
- **Same Django Codebase**: Runs identical backend but configured for logistics operations only
- **No Customer Operations**: No robotic machines, no order processing, not customer-facing
- **Logistics Focus**: Supply request management, inventory tracking, store registry, and revenue aggregation

---

### **Mobile Client Interaction**

The React Native mobile app uses device geolocation to discover and connect to nearby CodePop stores.

**Store Discovery Flow:**
```
┌─────────────┐
│ User Opens  │
│  Mobile App │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Request GPS coords  │
│ (latitude/longitude)│
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────┐
│ Query backend for nearby │
│ stores within radius     │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Display store list       │
│ (sorted by distance)     │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ User selects store OR    │
│ Auto-select closest      │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ All API calls target     │
│ selected store endpoint  │
└──────────────────────────┘
```

If the selected store becomes unavailable (health check fails), the app automatically switches to another nearby operational store.

**Lazy Replication Model for User Data:**

CodePop uses **on-demand replication** rather than proactive synchronization:

- **User accounts are NOT automatically replicated** to all stores
- **No background sync process** propagates user data everywhere
- **Data replicates only when needed**: When a user logs in at a new store for the first time

**Rationale:**
- **Scalability**: Replicating millions of accounts to thousands of stores is prohibitively expensive
- **Data Locality**: Users typically frequent the same store, making local caching efficient
- **Reduced Network Traffic**: Only active users generate sync traffic
- **Privacy**: User data only exists at stores where the user has physically visited

---

### **Cross-Region User Discovery**

When a user from one region visits a store in a different region, the system uses **hierarchical hub coordination** to locate their data:

**Three-Phase Process:**
1. **Discovery**: Regional hubs query each other in parallel to find the user's home store
2. **Data Transfer**: Stores communicate directly (peer-to-peer), bypassing hubs
3. **Local Caching**: After first login, user data is locally cached for fast subsequent logins

**Example: User traveling from Logan, UT to New York, NY**

```
                        User alice@example.com
                        (Home: Logan Region)
                        logs in at NY Store
                                │
                                ▼
                    ┌───────────────────────┐
                    │  NY Store checks      │
                    │  local database       │
                    │  → User NOT FOUND     │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  NY Store asks        │
                    │  NY Hub: "Find user"  │
                    └───────────┬───────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────────┐
        │  NY Hub broadcasts to 6 other regional hubs:  │
        │  "Does anyone have alice@example.com?"        │
        └───────┬───────────────────────────────────────┘
                │
                ▼
    ┌──────┬────────┬────────┬────────┬────────┬────────┐
    │      │        │        │        │        │        │
Chicago Dallas Phoenix Atlanta Logan  Boise   Seattle   |
  Hub     Hub     Hub      Hub    Hub   Hub     Hub     |
    │      │        │        │        │        │        │
   No     No       No       No      YES!      No       No
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │ Logan Hub responds:    │
                        │ "Found at Logan #001"  │
                        └────────────┬───────────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │ NY Hub tells NY Store: │
                        │ "User at Logan Store"  │
                        └────────────┬───────────┘
                                     │
                                     ▼
                    ╔════════════════════════════╗
                    ║   Direct Store-to-Store    ║
                    ║      Communication         ║
                    ╚════════════════════════════╝
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────┐          ┌──────────────────┐         ┌──────────────┐
│  NY Store     │◄─────────┤ User Data        ├────────►│ Logan Store  │
│  requests     │  P2P     │ (account + prefs)│         │ sends data   │
│  user data    │          └──────────────────┘         └──────────────┘
└───────┬───────┘
        │
        ▼
┌────────────────────────┐
│ NY Store caches data   │
│ User logs in ✓         │
└────────────────────────┘
```

---

### **Revenue Aggregation Architecture**

Revenue data remains **local to each store** and is aggregated on-demand when managers request reports.

**Regional Revenue (Logistics Managers):**
```
┌─────────────────────┐
│ Logistics Manager   │
│ requests report     │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────┐
│  Regional Hub        │
│  queries all stores  │
│  in region           │
└──────────┬───────────┘
           │
           ▼
    ┌──────┴──────┬──────────┬──────────┐
    ▼             ▼          ▼          ▼
┌────────┐   ┌────────┐  ┌────────┐  ┌────────┐
│Store 1 │   │Store 2 │  │Store 3 │  │Store N │
│Revenue │   │Revenue │  │Revenue │  │Revenue │
└────────┘   └────────┘  └────────┘  └────────┘
```

**Nationwide Revenue (Super Admins):**

Uses a **master hub** with hierarchical aggregation and **client-side fallback** for resilience.

```
                    ┌──────────────────┐
                    │ Super Admin      │
                    │ Dashboard        │
                    └────────┬─────────┘
                             │
                  ┌──────────▼──────────┐
                  │   Primary Path:     │
                  │   Master Hub        │
                  │   (Logan Hub)       │
                  └────────┬────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Regional Hub │   │ Regional Hub │   │ Regional Hub │
│ Chicago      │   │ New Jersey   │   │ Logan        │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       ▼                  ▼                  ▼
   ~20 stores         ~20 stores         ~20 stores
```

**Fallback Path:** If master hub unavailable, dashboard queries all 7 regional hubs directly in parallel and aggregates results client-side.

**Other Metrics:** The same hierarchical aggregation pattern applies to inventory status, order statistics, and machine health monitoring.

---

### **Machine Status State Machine**

Each robotic drink machine tracks its operational status through a state machine model:

```
                         ┌──────────────┐
                    ┌────┤    NORMAL    ├────┐
                    │    └──────┬───────┘    │
                    │           │            │
          Issue     │           │            │  Routine
         detected   │           │            │  schedule
                    │           │            │
                    ▼           ▼            ▼
            ┌────────────┐  ┌─────────────────────┐
            │  WARNING   │  │ SCHEDULE-SERVICE    │
            └─────┬──────┘  └──────────┬──────────┘
                  │                    │
    Critical      │                    │
    failure       │                    │
                  ▼                    │
            ┌────────────┐             │
            │   ERROR    │             │
            └─────┬──────┘             │
                  │                    │
    Complete      │                    │
    failure       │                    │
                  ▼                    │
        ┌──────────────────┐           │
        │  OUT-OF-ORDER    │◄──────────┘
        └────────┬─────────┘
                 │
                 │  Repair staff
                 │  assigned
                 ▼
        ┌──────────────────┐
        │  REPAIR-START    │
        └────────┬─────────┘
                 │
                 │  Work
                 │  completed
                 ▼
        ┌──────────────────┐
        │   REPAIR-END     │
        └────────┬─────────┘
                 │
                 │  Testing
                 │  passed
                 ▼
           ┌──────────┐
           │  NORMAL  │
           └──────────┘
```

**Hub Communication:**
- Stores push status changes to regional hub in real-time
- Hub dashboard provides live machine health monitoring
- Repair staff can filter and prioritize machines by status

---

### **Technology Stack**

**Frontend: React Native with Expo**
- Cross-platform mobile app for iOS and Android
- Geolocation-based store discovery
- Offline capability for menu browsing
- Stripe SDK integration for payments

**Backend: Django + Django REST Framework**
- Each store and hub runs an independent Django instance
- Complete REST API for business operations
- Token-based authentication
- Support for inter-node communication

**Database: PostgreSQL (Database-per-Store Architecture)**
- Independent PostgreSQL instance at each location
- Local data ownership with fault isolation
- JSONB support for flexible data structures
- Eventual consistency for cross-store data

**Asynchronous Processing: Celery + Redis**
- Distributed task queue for background operations
- Handles user data sync without blocking API requests (~50ms response time)
- Peer health monitoring and automated alerts
- Built-in retry logic for transient network failures

**Artificial Intelligence:**
- **Drink Recommendations**: Machine learning using scikit-learn for personalized suggestions
- **Inventory Forecasting**: Time-series prediction for automated restocking
- **Repair Scheduling**: Optimization algorithms for technician routing
- **Customer Service Chatbot**: NLP conversational AI using HuggingFace transformers
- **Image Generation**: Gemini API for decorative app graphics

---

## **5. Data Design**

The CodePop data model supports distributed operations across multiple stores with regional coordination. The design follows a **database-per-store architecture** where each location maintains its own PostgreSQL instance.

### **Data Distribution Strategy**

```
┌──────────────────────────────────────────────────────────────┐
│                    DATA CATEGORIES                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────┐  ┌────────────────────┐              │
│  │  REPLICATED DATA   │  │    LOCAL DATA      │              │
│  │  (Synchronized)    │  │  (Never synced)    │              │
│  ├────────────────────┤  ├────────────────────┤              │
│  │ • User accounts    │  │ • Orders           │              │
│  │ • User preferences │  │ • Inventory        │              │
│  │ • User roles       │  │ • Revenue          │              │
│  │ • Drink catalog    │  │ • Machines         │              │
│  │ • Store registry   │  │ • Notifications    │              │
│  │ • Region data      │  │                    │              │
│  └────────────────────┘  └────────────────────┘              │
│         ▲                                                    │
│         │                                                    │
│         └─── Lazy replication (on-demand)                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### **Core Data Entities**

**User Management:**
- **User**: Account credentials and authentication (lazily replicated across stores)
- **UserProfile**: Replication metadata and preferred store tracking
- **UserRole**: Role-based access control with store/region scope
  - Roles: Customer, Manager, Admin, Logistics Manager, Repair Staff, Super Admin
- **Preference**: User flavor preferences for AI drink recommendations (replicated with user)

**Product & Ordering:**
- **Drink**: Customizable drink recipes with syrups, sodas, and add-ins
  - Catalog drinks: replicated to all stores
  - User-created drinks: lazily replicated on-demand
- **Order**: Customer orders with payment status and fulfillment tracking (local only)
- **Revenue**: Financial transaction records (local only)

**Network Topology:**
- **Region**: Geographic regions with 7 regional hubs nationwide
- **SupplyHub**: Logistics coordination centers (one per region)
- **Store**: Physical CodePop locations with robotic machines

**Operations:**
- **Inventory**: Ingredient stock levels with automatic reorder thresholds (local only)
- **Machine**: Robotic equipment status and health monitoring (local, status pushed to hub)
- **MaintenanceLog**: Service history for machines (local, accessible to repair staff)
- **RepairSchedule**: Technician assignments and service appointments (managed by hub)
- **SupplyRequest**: Restocking orders from stores to supply hubs (hub-managed)
- **Notification**: User alerts and system messages (local only)

---

### **Entity Relationships**

**High-Level Entity Relationship Diagram:**

```
                    ┌──────────┐
                    │  Region  │
                    └────┬─────┘
                         │ 1:1
                         ▼
                  ┌─────────────┐
                  │ Supply Hub  │
                  └──────┬──────┘
                         │ 1:N
               ┌─────────┼─────────┐
               │                   │
               ▼                   ▼
        ┌────────────┐      ┌──────────────┐
        │   Store    │      │SupplyRequest │
        └─────┬──────┘      └──────────────┘
              │ 1:N
    ┌─────────┼─────────┬─────────┬─────────┐
    ▼         ▼         ▼         ▼         ▼
┌─────────┐┌─────────┐┌───────┐┌────────┐┌─────────┐
│Inventory││ Machine ││ Order ││Revenue ││UserRole │
└─────────┘└────┬────┘└───┬───┘└────────┘└─────────┘
                │         │ N:M               ▲
                │ 1:N     └──────┐            │
                │                ▼            │
                ▼           ┌──────────┐      │
         ┌──────────────┐   │  Drink   │      │
         │MaintenanceLog│   └────┬─────┘      │
         └──────────────┘        │ N:M        │
                ▲                │            │
                │                ▼            │
                │         ┌──────────┐        │
                └─────────┤   User   ├────────┘
                          └────┬─────┘
                               │ 1:N
                               ▼
                         ┌──────────────┐
                         │  Preference  │
                         └──────────────┘
```

**Key Relationships:**

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

### **Database Architecture**

**Database Platform: PostgreSQL**

CodePop uses a **database-per-store architecture** where each store and hub operates its own independent PostgreSQL instance.

**Benefits:**
- **Fault Isolation**: One store's database failure doesn't affect others
- **Data Sovereignty**: Each store owns and controls its operational data
- **Independent Scaling**: Stores can scale database resources based on local demand
- **Reduced Latency**: No network hops to central database

**Trade-offs:**
- **No Global Transactions**: Uses eventual consistency model for distributed data
- **Operational Overhead**: Each database requires independent backup and maintenance

**Data Organization:**

| Data Category | Replication Strategy | Examples |
|---------------|---------------------|----------|
| **User Data** | Lazy (on-demand) | User accounts, preferences, roles |
| **Product Catalog** | Replicated (catalog drinks) | Menu items, standard recipes |
| **Network Topology** | Replicated (static) | Regions, stores, supply hubs |
| **Local Operations** | Never replicated | Orders, inventory, revenue, machines |
| **Logistics** | Hub-managed | Supply requests, repair schedules |

**Key Database Features:**
- **Indexing**: Automatic on primary/foreign keys; custom indexes for geolocation queries, inventory alerts, and reporting
- **Schema Migrations**: Django migration system with backward-compatible changes for zero-downtime deployments
- **JSONB Support**: Flexible storage for semi-structured data (store hours, supply requests, machine status)

**Security & Compliance:**
- **Data Encryption**:
  - At rest: Password hashing (PBKDF2-SHA256/Argon2), AES-256 for sensitive fields
  - In transit: HTTPS/TLS 1.3 for all client and inter-node communication
- **Payment Security**: No raw credit card storage; Stripe handles all payment data (PCI-DSS compliant)

**Backup Strategy:**
- Daily full backups + hourly incrementals
- 30-day retention with off-site storage
- Recovery: Restore from backup + re-sync replicated data from peer nodes