# **Code Pop High-Level Design Document**

## Sections

1. **Introduction**
2. **System Overview**
3. **Architecture Design**
4. **Modules and Components (Internal Interfaces)**
5. **Data Design**
6. **Integration Points (External Interfaces)**
7. **User Interface (UI) Design Overview**
8. **Input and Output (I/O)**
9. **Security and Privacy**
10. **Testing Strategy**
11. **Risks and Mitigations**


## **1\. Introduction**

**Purpose**: This document exists to provide a reference for developers while working on the CodePop app to ensure that the development team can work independent of each other and still have code that will work together to form the final project at the end. 

**Scope**: This document has a large scope that encompasses just about every part of development, but it is more focused on the “why” of each design choice than the “how”. As such it won’t delve too deeply into the specific implementation detail.

**Audience**: This document is meant for developers and stakeholders of the project to ensure development is going in the right direction and everyone is on the same page.

## **2\. System Overview**

### **2.1 Problem Statement**

In the world of "dirty soda" shops, customers are often overwhelmed by excessive options and stalled by long lines. This results in a confusing, high-pressure experience that detracts from the product itself.

### **2.2 Proposed Solution**

CodePop provides a streamlined, AI-powered ordering experience. By utilizing "just-in-time" robotic fulfillment, we ensure customers can order personal or AI-generated drinks and pick them up fresh at the precise moment of arrival.

### **2.3 Nationwide Logistics Model**

CodePop operates as a nationwide franchise using a **Hub-and-Spoke** architecture:

* **The Hubs:** Central regional centers that act as the "axle" of the wheel, managing supply for their territory.  
* **The Spokes:** The transfer routes connecting the Hubs to individual store locations.  
* **The Stores:** Automated fulfillment centers where the robotic "pour" occurs.

## **Hardware & Accessibility Strategy**

### **2.4 Mobile Application**

* **Core Platform:** Initial development focuses on **Android** due to ease of testing, followed by iOS.  
* **UX Design:** Optimized for **Portrait Mode** for one-handed use.  
* **Accessibility:** Large touchscreen targets and buttons to eliminate the need for zooming. Gestures are excluded from v1 to ensure reliability.

### **2.5 Web & Desktop**

* **Mobile Web (M):** A responsive version of the app for browser-based access.  
* **Laptop/Desktop (M):** A responsive website that booth customers and administrators can use..

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

**Deployment**

CodePop will be deployed using **Google Cloud Platform (GCP)** to support the federated distributed architecture. Each store and regional supply hub will run as an independent deployment with its own backend infrastructure.

- **Cloud Platform: Google Cloud Platform (GCP)**: Selected for cost-effectiveness (25% cheaper than Azure), superior student credits ($300 free trial), and excellent Django support

- **Docker**: Containerizes the Django application with all dependencies, ensuring consistent environments across development, testing, and production. Each store/hub deployment uses the same Docker image with environment-specific configuration

## **4\. Modules and Components (Internal Interfaces)** 

* **User Management Module:** Manages customer profiles, authentication, and user interactions.  
  * Responsibilities  
    * User registration and login  
      * Email confirmation (Django)  
    * Profile management  
    * Preferences and order history  
  * Components  
    * User service: Handles user data storage and retrieval  
    * Authentication service: Manages login, sessions, and secure password management  
    * Recommendation service: Manages preferences and order history  

* **Soda Catalog Module:** Manages the inventory of soda products and custom drink options.  
  * Responsibilities  
    * Product listing and categorization  
    * Custom drink creation  
    * Inventory management  
  * Components  
    * Product service: Manages operations for soda products  
    * Customization service: Allows users to create custom sodas  
    * Inventory service: Tracks stock levels and alerts for low inventory  

* **Order Management Module:** Handles the order lifecycle from creation to delivery.  
  * Responsibilities  
    * Order placement and tracking  
    * Payment processing  
    * Order completion scheduling  
  * Components  
    * Order service: Manages order creation, updates, and status  
    * Payment service: Handles payment transactions  
    * Order completion service: Manages scheduling of orders and geolocation tracking  

* **AI Recommendation Module:** Provides personalized and randomized soda recommendations using AI.  
  * Responsibilities  
    * Analyze user preferences and behavior  
    * Generate product suggestions based on preferences  
    * Improve recommendations over time  
    * Generate random product suggestions  
  * Components  
    * Data Analysis Service: Analyzes user data and preferences for insights  
    * AI Model: Generates recommendations based on past behavior and trends

* **Supply Chain module:** Helps the admins and logistic managers keep track of supplies both in their area and the entire country

- Responsibilities
    - Supplies requests
    - Optimal routing
    - Report creation
- Components
    - Supply request: Creates and Handles requests for products
    - Routing: Ensures that products are shipped in an optimal way
    - Reporting: Creates a report for users so they can hav a at a glance view of their region
    - Order conformation: Lets admins approve or deny orders

* **Machine Maintenance module:** Tracks all machines and their status to ensure repairs go out

- Responsibilities
    - Machine status
        - Update status
    - Repair tracking
- Components
    - Status updater: Changes a machines status to reflect how operational it is
    - Machine database: Holds every machine the company need to keep track of

* **Logistics AI module:** The AI that identifies patterns in teh supply chain

- Responsibilities
    - Read CSV files
    - Analyze supply chain
- Components
    - CSV upload: A way to upload a CSV file 
    - AI analyze: Looks at the CSV file to try and find patterns

* **Inter-Node Communication Module (P2P)** Handle how servers communicate to each other to coordinate

- Responsibilities 
    - Establishes role in hierarchy (store, supply hub or master hub)
    - Manage inter-server communications 
    - Ensure messages are processed 
- Components 
    - Messenger: Handles outgoing for other stores
    - Message router: handles incoming messages and gets them to the correct module to be processed

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

### **6\. Integration Point (External Interfaces)**

### **6.1 Geolocation and Fulfillment**

* **User Location Prompt (M):** Trigger GPS permission requests post-payment.  
* **Proximity Calculation (M):** AI analyzes approach that take into account of the velocity, distance from the store and drink assembly time to find the **"Golden Window."**  
* **Manual Override (M):** A "Start" button for users who deny GPS access or have poor signal.  
* **Scheduled Orders (M):** Capability to select a specific future pick-up time.

### **6.2 Machine & Inventory Management**

* **Real-Time Monitoring (M):** AI tracks depletion of syrups, carbonation, and garnishes.  
* **Maintenance Logs (M):** Digital ledger for every machine tracking service history and cleaning.  
* **Automated Resupply (M):** Store-to-Hub communication automatically triggers a restock when thresholds are met.  
* **AI Forecasting (M):** Analysis of regional trends (e.g., Utah stores running out of lemon on Tuesdays).

### **6.3 AI & Engagement**

* **"Surprise Me" (M):** AI generates drinks based on user history or pure randomness with a "Re-roll" option.  
* **Estimated Time (EST) Engine (M):** Calculates exact prep time so ice doesn't melt before the user arrives at the store also increasing freshness.  
* **CSV Ingestion (M):** Logistics managers upload data to the AI as a CSV to identify supply patterns and machine health.

| Role | Responsibility |
| :---- | :---- |
| **Customer** | Orders drinks, manages preferences, and provides location data. |
| **Repair Staff (M)** | Updates machine status ("In Service," "Offline") and logs repair actions. |
| **Logistics Manager (M)** | Oversees regional inventory, manages supply routes, and analyzes CSV data. |
| **Super Admin (M)** | Universal data access, global configuration, and emergency system overrides. |

## **Technical Integration & Security**

### **6.4 External Interfaces**

1. **Payments:** Stripe (Secure, Apple/Google Pay support).  
   1. Free  
   2. Secure payments- offers built-in fraud prevention tools  
   3. Support for variety of payment methods  
   4. Is a Indestroy standard  
2. **Geolocation:** Mapbox (Python SDK for proximity tracking).	  
   1. **Generous Free Tier for Scaling:** For small projects and startups, the pricing is highly competitive. Mapbox offers up to **50,000 free map loads** per month  
   2. **Extreme Visual Customization:**  
   3. **Developer-First Tooling: Mapbox provides robust APIs and SDKs specifically perfect for python and django**  
3. **Customer Support:** Dialogflow ES from google  for automated help/complaint handling.  
   1. **No monthly fee:** You only pay if you exceed the free tier limits 

   2. ### **No Server Management**

4. **Notifications:** Firebase Cloud Messaging (FCM) for push alerts; Django for email verification.  
   1. FCM is free for small projects  
   2. **Cross-Platform Simplicity:** You write one integration in your Django backend. FCM then handles the heavy lifting of talking to Apple’s servers (APNs), Android devices, and even web browsers.  
   3. **Security & Data Integrity:** Django’s built-in authentication system handles the generation of secure, one-time-use tokens for email verification out of the box. 

### **6.5 Non-Functional Requirements (NFRs)**

* **Security (M):** All location and payment data must be encrypted.  
* **Responsiveness (M):** Fluid grid system for all mobile viewports.  
* **Scalability (S):** Horizontal scaling to handle peak traffic spikes.


## **7. User Interface (UI) Design Overview**

### **UI/UX Principles**

The application is designed to be intuitive, responsive, and accessible across all user roles.

- **Simplicity & Consistency**
  - Clear layouts and predictable navigation.
  - Core actions accessible within one to two interactions.
  - Consistent design across customer, manager, and admin views.

- **Responsive Design**
  - Mobile-first design.
  - Responsive layouts using Flexbox to support tablet and desktop screens.

- **Navigation**
  - Persistent navigation bar with labeled icons.
  - High-contrast buttons for key actions (e.g., Checkout, Account Creation).

- **Accessibility**
  - Adequate color contrast and non-color status indicators.
  - Screen-reader compatibility and keyboard navigation support.
  - Alignment with WCAG accessibility standards.
---
### **Mockups**
High-level wireframes will define layout and hierarchy for key screens, including:
- Customer Dashboard  
- Cart & Checkout  
- Rewards  
- Manager & Admin Dashboards  
---
### **Color Palette**
- **Primary:** `#FF2E63`  
- **Secondary:** `#08D9D6`  
- **Background:** `#F9FAFB`  
- **Surface:** `#FFFFFF`  
- **Text:** `#222831`  
<img src="misc/UI_color_palette.jpeg" width="600px" />
<img src="misc/color_palette_UI_example.jpeg" width="600px" />

The palette supports strong contrast, readability, and a cohesive visual identity.

* **Navigation Flow**: Overview of how users will navigate the app. Pages will not be more than 2-3 clicks deep. The UI features listed have been classified using MoSCoW as either *Must Have* (M), *Sould Have* (S), and *Could Have* (C). Implementation will include all (M) features and may or may not have (S) or (C) features.
  * (M) Nav bar
      * Link to home page  
      * Link to drink design page  
      * Cart button \- link to cart page  
      * Link to chat page
      * Link to profile page
  * Pages:
    * (M) Home page
      * (S) Seasonal drinks menu carousel  
      * (M) Generate random button (from AI). 
        * (S) 2 options (if signed in):
          * Generate based off my preferences
          * Try something new
      * (M) If signed in:
        * Saved drinks - with options to delete or add to cart (UI for size selection follows 'add to cart' button)
      * (M) If not signed in:
        * Create account button (for non-account users)
    * (M) Sign-in/create account page
      * Simple page with text entry boxes for username and password  
        * the password must be at least 8 characters and contain a lowercase letter, an uppercase letter, a number, and a special character.
      * Login or Create Account button
        * (C) In the case of "Create Account" the user is taken to an email verification screen
      * Automatically displayed error message or taken to home page after login  
      * (C) Goes to a tutorial of how to use app after signed in - skip button optional
    * (M) Drink design page
      * (C) generative/responsive graphic created when a user makes drinks
      * (M) An add to cart button by the graphic - must have a soda selected (other options default to none) - size selection occurs after hitting 'add to cart'
      * (S) A 'Save as favorite' button by the graphic (saves drink to the user's favorites)
      * (M) Drink design options (little graphics or emojis included with option names):
        * Soda - can select/deselect multiple - search bar included at top of this section
        * Syrups - can select/deselect multiple - search bar included at top of this section
        * Juices - can select/deselect multiple - (lemon, lime, pineapple, coconut etc.) - no search bar needed
        * Ice - can select one - (light, regular, extra, no ice) - no search bar needed
    * (M) Cart page - also links to a payment page and a confirmation page
      * Description of cart page:
        * Contains a bar of a graphic of the drink, drink name, edit buttion, price, remove button.
        * At the bottom there is a total price display and checkout button.
      * (M) Payment page
        * User is taken here from the “checkout” button in the cart 
        * Stripe API used to take user payment information
        * (C) There will also be a check box by the payment information that says, "Save this card".  
        * (M) Option for user to track with geolocation (default selected) or select a time for it to be ready  
          * If geolocation is not setup, clicking this button should give them the option to enable geolocation
          * If the user selects the option to select a time, the minimum time out to select for it to be ready is 5 minutes. The maximum is.
          * (C) There is also an option to select "Order Recurring"
            * If this option is selected the user will recieve a text box that says, 
            "By selecting this option, your order will be automatically placed and your saved payment method will be charged $___ 30 minutes before your scheduled time. You can modify or cancel recurring orders at any time in your account settings."
            * Following the prompt, the user will be able to select the custom recurrence they desire:
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
          * Once clicked, the app goes to the selected platform and a pre-populated post template that includes the hashtag #socialdrinker appears
    * (M) Chat page
      * Simple page with a text entry box with a complaint prompt \- users will receive AI generated response messages after entering complaints
    * (M) Profile page
      * (M) Update preferences  
        * Soda, syrups, ice quantity.
      * (M) Settings
        * (M) Set location for geolocation.
        * (S) account settings
          * (S) change email/password.
          * (C) dark mode/light mode. 
    * (C) Rewards page
      * Should this be included, there will be a section added to the nav bar called "Rewards":
        - "Home | Order | Cart | Rewards | Chat | Account"
      * The Loyalty Program will include a dedicated “Rewards” section in the main navigation. Logged-in users can view their total point balance, earning history, and upcoming expirations. Points are awarded after order pickup and excluded for canceled orders. Expiration notifications will appear as dashboard alerts. Checkout will include a placeholder section for future point redemption functionality.
    * (M) Super Admin Dashboard
      * (M) Global Navigation Panel
        * (M) Region selector (with override enabled)
        * (M) Store, hub, and system-level data views
        * (C) Role & permissions management access
        * (C) AI configuration controls
      * (C) System Overview Panel
        * Network-wide performance metrics
        * Active alerts (regional issues, stock risks, system faults)
        * Emergency override indicators
      * (C) Configuration & Control Section
        * (C) Role creation and permission editor
        * (M) Global AI parameter controls
        * System override toggles for emergency or maintenance scenarios
    * (M) Repair Staff Dashboard
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
    * (M) Logistics Manager Dashboard
      * (M) Hubs
        * Supply levels
      * (M) Stores
        * Supply levels
        * Usage trends
      * (M) Supply usage statistics
          * (C) History of supply usage.
          * (M) Popularity trends
            * Do certain syrups, sodas, or addins trend higher than average based on time of year, month, or week? Do certain ingredients trend higher at one location over another? AI generated. (report is region-based, not store-based).
      * (M) Delivery schedules/routes
        * (M) Planning View
          * Forecasted depletion dates per store
          * Suggested restock window (AI calculated)
        * (M) Routing View
          * (C) Route building
          * (M) AI suggested optimal route buttonstores needing restock.
        * (C) Automated Scheduling
          * Like the customer recurring UI — but for supply.
    * (M) Manager dashboard
      * A dashboard that contains links to a notifications section, store revenue report, a store inventory report, order statistics, and a supply request page.  
        * (M) Notifications section:
          * Notifications appear here when stock levels cross a predictive threshold (they will run out before the next scheduled delivery).
          * The notification includes: which ingredient + how much is left + recommendations (how much to order/from where).
        * (M) Revenue report:
          * Total revenue.
          * Inventory costs.
          * Total user accounts assigned to that location.
        * (M) Inventory report:
          * Levels of syrups, soda, addins.
          * Estimated amount of syrups, soda, addins to order that month - AI generated.
            * included in the AI report will be AI's recommendation for the best places to purchase ingredients.
          * grid of the levels of syrups, sodas, addins.
            * grid can be configured to sort by how much is left.
          * grid of coolers/status (full/empty).
          * for every full cooler, it shows how long the drink has been sitting there.
          * A grid that shows the inventory of nearby stores.
          * A grid that shows the inventory of the supply hub.
        * (M) Order statistics
          * (C) History of orders.
          * (C) Average time between order made and picked up.
          * (M) Popularity trends
            * Do certain syrups, sodas, or addins trend higher than average based on time of year, month, or week? Do certain ingredients trend higher at one location over another? AI generated.
        * (M) Supply request page
          * Here you can submit an order form for all supplies. Two options for submission button:
            * (C) Request from nearby store.
              * If selected, the user must specify which store from a list of the nearby stores within a 100 mile radius.
            * (M) Request from supply hub.
          * (S) There is also a way to view pending supply requests and their progress (like a track package UI).
          * (C) History of supply movements and requests
        * (M) AI will be used to estimate when supplies need to be ordered to notify the manager and also find the best places to purchase ingredients.
    * (M) Admin dashboard  
      * (M) Shows all user accounts (searchable):
        * 3 sections: Active, disabled, and deleted
        * Active: delete, disable, make manager
        * Disabled: delete, enable
        * Deleted: no buttons (non-recoverable. purely a log)
      * (M) Shows all manager accounts (searchable):
        * shows options for different kinds of permissions based on the manager -=-=-=- what are the kinds of permission for managers? -=-=-=-=-
    * (M) Error Messages
      * The system will implement contextual error messaging including inline validation for form inputs, permission-based access alerts, scheduling conflict warnings, payment processing errors, geolocation prompts, and system-level failure notifications. Errors will be visually distinct, non-destructive to user input, and include actionable guidance for resolution.
    * (C) Special messages
      * Store closures:
        * Home screen message: If the store is closed for a holiday or other reason, a large notification will appear on the home screen stating that it is closed and when it reopens. It will also contain a link that takes the user to store hours/closures.
        * Cart message: Before the user can checkout there will also be a message in bright text telling reminding the user that the store is closed and that they must schedule out their order. The option for geolocation will be grayed out and the user must click on the "Schedule my order" option.
          * The scheduling order UI will show the closure dates/times as grayed out and non-selectable, forcing the user to choose a date/time that is open.
    * Loading screens  
      * Typical loading screen:  
      <img src="misc/SodaRobotResized.jpg" width="200px"/> <br>
      * Loading screen for customer service:
        * Tonic <br>
        <img src="misc/tonic.png" width="300px"/>

  * UI diagrams:  
  <img src="misc/UI_diagram_1.jpeg" width="200px"/>
  <img src="misc/UI_diagram_2.jpeg" width="200px"/>
  <img src="misc/UI_diagram_3.jpeg" width="200px"/>
  <img src="misc/UI_diagram_4.jpeg" width="200px"/>
  <img src="misc/UI_diagram_5.jpeg" width="200px"/>
  <img src="misc/UI_diagram_6.jpeg" width="200px"/>
  <img src="misc/UI_diagram_7.jpeg" width="200px"/>
  <img src="misc/UI_diagram_8.jpeg" width="200px"/>
  <img src="misc/UI_diagram_9.jpeg" width="200px"/>
  <img src="misc/UI_diagram_10.jpeg" width="200px"/>
  <img src="misc/UI_diagram_11.jpeg" width="200px"/>

##  **8\. Input/Output (I/O) Matrix**

| Category | Inputs | Outputs |
| :---- | :---- | :---- |
| **User Flow** | **Preferences, Payment, GPS Data, Complaints.** | **Push Notifications, "Drink Ready" alerts, AI Suggestions.** |
| **Logistics** | **CSV Supply Files, Regional Sales, Threshold Alerts.** | **Automated Supply Requests, Hub Email Alerts.** |
| **Maintenance** | **Repair Logs, Machine Status Updates, CSV Seeds.** | **Maintenance Dashboards, Fault Alerts to Hubs.** |

## **9\. Security and Privacy**

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
    * Repair Staff
        * Repair Staff can view any machine's status in their area.
  * User authentication:
    * Django comes with a built in user authentication system that handles user accounts, groups, permissions and cookie-based user sessions 
      * This system can be expanded and customized to add things like password strength checking to add more security.    
  * To secure the application, the client and server will be separated.   
    * The client and server will talk to each other through token authentication which is already included with Django.   
  * Django security features: [https://docs.djangoproject.com/en/5.1/topics/security/](https://docs.djangoproject.com/en/5.1/topics/security/)  
    * Includes injection protection because queries are constructed using query parameterization  
    * Includes Cross site request forgery (CSRF) protection which prevents attacks that perform actions using other people’s credentials.
    
* **Inter-Node Communication Security**: How to keep communications between servers secure
  * Messages should be passed using HTTPS 
  * Servers must authenticate that they are talking to a legit Codepop server before any communications take place
    * A list of know servers should be created and maintained to ensure a server can trust another server  
  * A store servers can be accessed by super admins and a store's admin, manager and repair staff
    * If a supply hub or another regional store needs information from a different store it can request the information
  * Supply hubs can only be accessed by logistic managers and super admins 
    * They can send requests to other supply hubs and store inside of their region only
  * The Master hub can only be accessed by logistic managers and super admins
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
  * Hub data
    * 
* **Privacy**  
  * We will make sure that the user has the option to opt into any of the features that handle personal data (geolocation, drink preferences, emails) to ensure that they are able to make an informed choice about their data.

## **10. Testing Strategy**

CodePop will employ a two-pronged testing strategy: automated unit tests for systematic verification and manual testing for user experience validation. Tests are created incrementally as features are developed to catch issues early and ensure system reliability. A goal for this testing strategy should be to automate testing as much as possible without it being "overkill". Manual testing should validate cases and features that are impractical to automate. Unit tests listed here may move to manual test cases depending on automation difficulty.

### **Automated Testing (Unit Tests)**

Unit tests provide automated, repeatable verification of individual components. Tests run automatically before code merges to catch regressions early.

**Framework:** Django's built-in TestCase and APITestCase classes

**Current Implementation Coverage:**

| Test Suite | What's Tested | Key Test Cases |
|------------|---------------|----------------|
| **PreferenceTests** | User preference CRUD operations | Get/create/delete preferences, validate invalid values |
| **DrinkTests** | Drink catalog and custom drinks | CRUD operations, Ice/Size validation, user favorites |
| **InventoryTests** | Stock management | Update quantities, out-of-stock handling, low-stock warnings |
| **NotificationTests** | User notifications | Create/filter/delete notifications, time-based filtering, user isolation |
| **OrderTests** | Order processing | Create orders, add/remove drinks, invalid drink handling |
| **RevenueTests** | Financial tracking | Auto-calculate totals, update after order changes |
| **AITests** | Drink recommendation engine | Validate AI output format, preference matching, ingredient validity |

**Authentication & Authorization (All Test Suites):**
- Token-based authentication using Django REST Framework tokens
- Role-based access control verification
- Unauthorized access prevention (401/403 errors)

**Tests Needed for Planned Features:**

| Test Suite | What's Tested | Key Test Cases |
|------------|---------------|----------------|
| **UserRoleTests** | Role-based access control | Manager sees only their store, logistics manager sees region, super admin sees all |
| **StoreRegistryTests** | Store/hub communication | Registration, peer discovery, operational status updates |
| **UserReplicationTests** | Cross-store user data sync | Lazy replication on first login, preference sync, cross-region lookup |
| **SupplyRequestTests** | Inventory replenishment | Create requests, status transitions, approval workflow |
| **MachineTests** | Equipment status tracking | Status transitions, out-of-order prevents orders, notification triggers |
| **MaintenanceLogTests** | Service history | Create logs, repair staff assignment, cost tracking |
| **RevenueAggregationTests** | Financial rollup | Regional totals, nationwide aggregation, hub query fallback |
| **SettingsTests** (Frontend) | User preferences | Dark mode, geolocation toggle, account updates |

**Future Automated Testing (Existing Features):**
- **Frontend Unit Tests:** Jest + React Native Testing Library for component testing
- **Integration Tests:** End-to-end API flows (registration → login → order → payment)

---

### **Manual Testing**

Manual testing validates user experience, visual design, and edge cases that are difficult or impractical to automate. A standardized checklist ensures consistency across team members and provides a comprehensive list of requirements that the app should adhere to.

**Manual Test Checklist:**

#### **UI/UX Validation**
- [ ] Visual consistency (colors, fonts, spacing match design mockups)
- [ ] Responsive layout on different screen sizes (small, medium, large phones)
- [ ] Loading states display correctly (SodaRobot and Tonic animations)

#### **User Workflows**
- [ ] Guest user: Browse drinks → add to cart → checkout → pay → confirm
- [ ] New user: Create account → receive email → login → set preferences
- [ ] Returning user: Login → view saved drinks → reorder → rate drink
- [ ] Manager: Login → view inventory report → check low stock items
- [ ] Admin: Login → view user accounts → disable/delete user
- [ ] AI recommendations: Click "Generate" → review drink → add to cart
- [ ] Complaints: Submit complaint → receive chatbot response → verify resolution

#### **Edge Cases & Error Handling**
- [ ] Empty cart checkout attempt (should show error)
- [ ] Incorrect password (should show error, count attempts)
- [ ] Payment card declined (should display Stripe error message)

#### **New Features: Multi-Store & New Roles**

*Store Discovery & Geolocation:*
- [ ] User with geolocation enabled sees nearby stores in correct order (closest first)
- [ ] User with geolocation disabled can manually select a store
- [ ] Store list updates when user moves to different location

*New User Roles & Dashboards:*
- [ ] Manager login → dashboard shows only their store's revenue and inventory
- [ ] Manager cannot access other stores' data (verify error if trying URL manipulation)
- [ ] Logistics Manager login → sees regional supply requests and inventory status
- [ ] Logistics Manager can approve/reject supply requests
- [ ] Super Admin login → sees nationwide revenue, analytics, and user management

*Machine Maintenance:*
- [ ] Repair Staff can view machines needing service in their region
- [ ] Repair Staff can log maintenance work (start time, end time, cost)
- [ ] Manager receives notification when machine status changes
- [ ] Machine status updates (normal → repair-start → repair-end) display in real-time

*Supply Management:*
- [ ] Manager can view low-stock inventory items
- [ ] Manager can generate supply request from inventory report
- [ ] Supply hub receives and processes requests correctly

**Testing Cadence:**
- Run manual tests after each major feature completion
- Full regression testing before production releases

## **11. Risks and Mitigations**

This section identifies potential risks across technical, security, operational, and legal domains, along with mitigation strategies to minimize impact.

#### **User Geolocation Privacy**
- **Risk:** Geolocation tracking could be exploited by attackers to monitor user movements, creating privacy violations and safety concerns.
- **Likelihood:** Medium - Geolocation APIs are common attack targets
- **Mitigation:**
  - Encrypt geolocation data in transit (HTTPS/TLS 1.3)
  - Hash/encrypt geolocation data at rest in database
  - Access geolocation data only during active order tracking (not continuous background tracking)
  - Implement strict access controls (only order service can read location)
  - Users can opt out of geolocation entirely (fallback to manual time selection)
  - Display clear privacy notice explaining geolocation usage
  - Delete geolocation data after order completion (retention: 1 hour max)

#### **Payment Information Security**
- **Risk:** Payment data breach could result in financial loss for customers and legal liability for CodePop.
- **Likelihood:** Low - Using Stripe eliminates most direct risk
- **Mitigation:**
  - **Primary Defense:** Use Stripe Payment API - no raw credit card data stored in CodePop database
  - Store only Stripe payment intent IDs (non-sensitive tokens)

#### **User Account Security**
- **Risk:** User accounts could be compromised via credential stuffing, brute force attacks, or session hijacking, leading to unauthorized purchases or data theft.
- **Likelihood:** Medium - Common attack vector for online services
- **Mitigation:**
  - **Authentication:**
    - Enforce strong password requirements (min 12 chars, mix of upper/lower/digit/symbol)
    - Hash passwords with PBKDF2-SHA256 (upgrade to Argon2 in production)
  - **Authorization:**
    - Use Django REST Framework Token Authentication with expiring tokens (24-hour lifetime)
  - **Session Security:**
    - Implement HTTPS for all communication (prevent token interception)
    - Add CSRF protection for state-changing requests

#### **AI Model Security**
- **Risk:** AI models (recommendation engine, chatbot) could be manipulated via adversarial inputs, prompt injection, or data poisoning, causing incorrect recommendations or leaking sensitive information.
- **Likelihood:** Low-Medium - AI attacks are emerging but not yet widespread
- **Mitigation:**
  - **Input Sanitization:**
    - Filter user inputs for malicious content before sending to AI models
    - Blocklist risky keywords (SQL syntax, command injection patterns)
    - Limit input length (max 500 chars for chatbot, max 20 preferences)
  - **Output Validation:**
    - Ensure chatbot responses don't leak user data or internal system information
  - **Model Isolation:**
    - Run AI models in isolated environment (separate process or container)
    - Limit AI model access to database (read-only access to preferences and drinks)
  - **Monitoring:**
    - Log all AI interactions for audit trail

#### **Allergen Information Accuracy**
- **Risk:** Incorrect or missing allergen information could cause allergic reactions, resulting in bodily harm, legal liability, and reputational damage.
- **Likelihood:** Low-Medium - Human error in data entry, ingredient changes
- **Mitigation:**
  - **Data Accuracy:**
    - Maintain comprehensive allergen database for all ingredients
    - Clearly label common allergens (peanuts, tree nuts, dairy, soy, gluten, shellfish)
    - Display allergen warnings prominently in drink details
    - Allow users to filter drinks by allergen exclusions
  - **Legal Protection:**
    - Display disclaimer on AI-generated drinks: "This drink was generated by AI. Please review ingredients carefully and consult allergen information."

#### **Legal Liability for AI-Generated Drinks**
- **Risk:** Customers may attempt to hold CodePop liable for harm caused by AI-generated drinks (allergic reactions, illness, unpleasant taste).
- **Likelihood:** Low-Medium - Depends on legal precedents for AI-generated content
- **Mitigation:**
  - **Disclaimers:**
    - Display prominent warning for AI-generated drinks: "This drink was created by artificial intelligence. Please review all ingredients and allergen information before ordering. CodePop is not responsible for allergic reactions or dissatisfaction with AI-generated drinks."
  - **Human Oversight:**
    - Implement "flag for review" feature (users can report dangerous AI recommendations)


This testing and risk management strategy ensures CodePop is reliable, secure, and resilient as it scales from a single-store prototype to a nationwide distributed system.
