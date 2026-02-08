# **Code Pop High-Level Design Document - Updated Sections 3 & 5**

*This document contains updated versions of Section 3 (Architecture Design) and Section 5 (Data Design) to reflect the new multi-store, peer-to-peer distributed system requirements.*

---

## **3. Architecture Design**

### **Architecture Overview**

CodePop employs a **true peer-to-peer distributed system architecture** where each physical store location operates as an independent node in a decentralized network. This architectural approach eliminates single points of failure and enables the system to scale nationwide while maintaining operational autonomy at each location.

**Key Architectural Principles:**

* **Decentralization**: No central server controls the entire system. Each store runs its own complete backend stack (Django + PostgreSQL) and can operate independently.

* **Regional Coordination**: Seven regional supply hubs provide logistics coordination for stores within their geographic regions, but stores remain operationally independent.

* **Peer-to-Peer Communication**: Stores communicate directly with each other and with their regional supply hub using REST APIs for synchronous operations and an asynchronous event queue (Celery/Redis) for eventual consistency.

* **Fault Isolation**: Failures or outages at one store or hub do not prevent other stores from continuing normal operations. The system is designed to gracefully handle network partitions and temporary connectivity loss.

* **Local-First Data**: Each store maintains its own operational data (orders, inventory, revenue, machine status) in its local database. Only specific data types (user accounts, preferences, favorites) are synchronized across the peer network.

**Network Topology:**

```
┌─────────────────────────────────────────────────────────────────┐
│          Supply Hub Network (7 Regional Hubs)                   │
│  Chicago IL │ New Jersey NY │ Logan UT │ Dallas TX │ etc.       │
└────────────┬────────────────────────────────┬───────────────────┘
             │                                │
             │    P2P Communication          │
             │    (REST APIs + Event Queue)   │
             │                                │
    ┌────────▼────────┐              ┌───────▼────────┐
    │  Store Node A   │◄────────────►│  Store Node B  │
    │  - Django API   │  Direct P2P  │  - Django API  │
    │  - PostgreSQL   │              │  - PostgreSQL  │
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
- **P2P Communication Layer**: REST endpoints for inter-store communication
- **Event Queue**: Celery workers with Redis broker for asynchronous message processing
- **Service Registry**: Knowledge of nearby peer stores and the regional supply hub

**Mobile Client Interaction:**

The React Native mobile app uses geolocation to discover nearby operational stores. When a user opens the app:
1. The app requests stores within a configurable radius (default 50 miles)
2. The backend returns a list of nearby stores sorted by distance
3. The user selects a store (or the app auto-selects the closest)
4. All subsequent orders and interactions are with that specific store
5. If the selected store becomes unavailable, the app can seamlessly switch to another nearby store

**Data Distribution Strategy:**

| Data Type | Storage Model | Synchronization |
|-----------|---------------|-----------------|
| Orders | Local to each store | None (store-specific) |
| Inventory | Local to each store | None (store-specific) |
| Revenue | Local to each store | None (store-specific) |
| Machines | Local to each store | Status updates to hub |
| User Accounts | Replicated across network | Async P2P events |
| User Preferences | Replicated across network | Async P2P events |
| Favorite Drinks | Replicated across network | Async P2P events |
| Supply Requests | Store creates, Hub manages | Synchronous REST API |
| Catalog Drinks | Replicated globally | Initial seed + updates |

### **Technology Stack**

#### **Frontend: React Native (Expo 51.0.38)**

React Native continues to be the mobile application framework for CodePop, chosen for its cross-platform compatibility and developer productivity features.

**Rationale:**
* **Cross-Platform Development**: Single codebase for iOS and Android reduces development time and maintenance overhead
* **Hot Reload**: Enables rapid iteration and testing during development
* **JavaScript Ecosystem**: Wide community support and extensive library availability
* **Native Performance**: Bridge to native APIs provides near-native performance for critical operations like geolocation
* **Expo Framework**: Simplifies builds, deployments, and provides managed services for common mobile features

**Multi-Store Enhancements:**
* **Store Discovery API Integration**: New logic to find and connect to nearby store nodes based on geolocation
* **Connection Resilience**: Handles store failover by switching to another nearby store if the primary becomes unavailable
* **Offline-First Capabilities**: Can cache recently viewed data (drink catalog, user preferences) for brief offline periods

#### **Backend: Django 5.1 + Django REST Framework 3.14**

Django remains the backend framework, now enhanced to support peer-to-peer communication and distributed operations.

**Rationale:**
* **Built-in Authentication**: Django's user authentication system handles role-based access control (RBAC) with minimal configuration
* **ORM (Object-Relational Mapping)**: Django's ORM abstracts database operations and makes migrations manageable across multiple independent nodes
* **Security Features**: Built-in protection against SQL injection, CSRF attacks, XSS, and clickjacking
* **REST Framework**: Django REST Framework provides robust API development tools with serialization, permissions, and viewsets
* **Community Support**: Large ecosystem of third-party packages and extensive documentation

**P2P Architecture Additions:**
* **Node Identity System**: Each Django instance identifies itself as a unique peer with configuration for node type (STORE or SUPPLY_HUB), geographic location, and API base URL
* **Peer Registry**: Maintains knowledge of other nodes in the network (nearby stores and supply hub)
* **P2P API Endpoints**: New endpoints for node registration, service discovery, health checks, and inter-node data synchronization
* **Event Publishing**: Asynchronous event emission for user account changes, favorites updates, and machine status changes

#### **Database: PostgreSQL 15**

Each store node runs its own PostgreSQL database instance, providing true data autonomy and fault isolation.

**Rationale:**
* **Relational Integrity**: PostgreSQL's robust support for foreign keys and constraints ensures data consistency within each store
* **Complex Queries**: Advanced SQL features support complex analytics queries for dashboards and reporting
* **JSONB Support**: Native JSON data type enables flexible storage for semi-structured data (store hours, machine configurations)
* **Performance**: Excellent performance characteristics for read-heavy workloads (drink catalog) and write-heavy workloads (orders, inventory updates)
* **Scalability**: Each store's database scales independently based on that location's transaction volume

**Distributed Database Considerations:**
* **No Global Transactions**: Cross-store operations (like user registration) use eventual consistency rather than distributed transactions
* **Conflict Resolution**: Last-write-wins strategy for replicated data like user preferences
* **Data Locality**: Most operations are local to a single store's database, minimizing network latency

#### **Asynchronous Task Queue: Celery + Redis**

Celery (with Redis as the message broker) handles background tasks and inter-node communication.

**Rationale:**
* **Non-Blocking Operations**: User-facing API requests remain fast by offloading time-consuming operations (like P2P event propagation) to background workers
* **Retry Logic**: Celery's built-in retry mechanisms handle transient network failures when communicating with peer nodes
* **Scheduled Tasks**: Celery Beat scheduler runs periodic tasks like heartbeat checks (verifying peer availability) and supply level monitoring
* **Scalability**: Multiple Celery workers can run concurrently to handle high volumes of background tasks

**P2P Use Cases:**
* **Event Processing**: Asynchronously sends user account updates, favorite drink additions, and machine status changes to peer nodes
* **Heartbeat Monitoring**: Periodically pings known peers to check availability and update reachability status
* **Supply Alerts**: Monitors inventory levels and triggers notifications when items fall below threshold

#### **Artificial Intelligence (AI)**

AI plays a critical role in enhancing user experience, optimizing operations, and reducing manual intervention. The system uses multiple AI components for different purposes.

##### **AI Library: Scikit-Learn**

Scikit-Learn remains the primary machine learning library for drink recommendations and inventory forecasting.

**Rationale:**
* **Free and Open Source**: BSD license permits commercial use without licensing fees
* **Python Integration**: Native Python library integrates seamlessly with Django backend
* **Small Dataset Performance**: Works effectively with limited data during startup phase
* **Strong Documentation**: Extensive tutorials and examples for common ML tasks
* **Academic Credibility**: Widely used in research and industry, ensuring long-term support

##### **Drink Recommendation AI (Content-Based Filtering)**

**Use Case**: Personalized drink suggestions for registered users based on their flavor preferences.

**Approach**: Content-based filtering analyzes the flavor profiles of syrups, sodas, and add-ins to suggest new combinations that match a user's stated preferences or order history.

**Advantages**:
* **Cold Start Handling**: Can provide recommendations immediately for new users based on their flavor preferences (sweet, fruity, tangy, etc.)
* **No User Data Required**: Doesn't depend on popularity trends or other users' behavior
* **Highly Personal**: Each user receives unique recommendations tailored to their specific taste profile
* **Transparent**: Users can understand why a drink was recommended (e.g., "You liked strawberry syrup")

**Implementation**: The AI model:
1. Analyzes user's saved preferences (favorite flavors, avoided ingredients)
2. Computes similarity scores between user preferences and available ingredients using cosine similarity
3. Ranks drink combinations based on match to user profile
4. Suggests top-ranked drinks that the user hasn't tried yet

##### **Random Drink AI (Item-Based Collaborative Filtering)**

**Use Case**: Discover-worthy drink suggestions for users who want to explore popular or trending combinations.

**Approach**: Item-based collaborative filtering identifies relationships between drinks based on user interactions (orders, ratings, favorites) to suggest drinks that other users with similar tastes enjoyed.

**Advantages**:
* **Captures Popularity Trends**: Recommends drinks that are trending among the user base
* **Diverse Suggestions**: Exposes users to unexpected combinations they might not consider on their own
* **Implicit Learning**: Learns from user behavior (order history) without requiring explicit ratings

**Limitations**:
* **Cold Start Problem**: New drinks can't be recommended until enough users have tried them
* **Requires User Data**: Needs sufficient order history across multiple users to identify patterns

**Implementation**: Used for the "Surprise Me" feature that generates random but popular drink combinations for users who want to try something new.

##### **NEW: Inventory Forecasting AI**

**Use Case**: Predict when inventory items will run out and automate supply request triggers.

**Approach**: Time-series forecasting analyzes historical usage patterns (by store, by item, by time of day/week/season) to predict future demand and optimal restock timing.

**Features**:
* **Depletion Rate Calculation**: Tracks how quickly each ingredient is consumed at each store
* **Trend Detection**: Identifies seasonal patterns (e.g., cherry syrup more popular in summer, pumpkin spice in fall)
* **Location-Specific**: Recognizes that different stores have different consumption patterns based on local demographics
* **Proactive Alerts**: Notifies store managers and logistics managers before items run out (not after)

**Implementation**:
* Uses linear regression or ARIMA models to forecast inventory levels
* Factors in upcoming events (holidays, promotions) that may increase demand
* Suggests optimal order quantities to minimize waste while preventing stockouts

##### **NEW: Repair Schedule Optimization AI**

**Use Case**: Help repair staff build efficient maintenance schedules for robotic machines across multiple stores.

**Approach**: Constraint satisfaction and optimization algorithms create schedules that minimize travel time, prioritize critical repairs, and balance workload.

**Features**:
* **Route Optimization**: Finds the most efficient path for repair staff to visit multiple stores
* **Priority Weighting**: Schedules critical repairs (error, out-of-order status) before routine maintenance (schedule-service)
* **Time Window Constraints**: Respects store hours and repair staff availability
* **CSV Import**: Allows repair staff to upload their current schedule and get optimization suggestions

**Implementation**:
* Uses heuristic algorithms (genetic algorithm or simulated annealing) to solve the traveling salesman problem variant
* Considers machine status severity, geographic proximity of stores, and estimated repair duration
* Provides schedule recommendations that repair staff can accept, modify, or reject

##### **Chatbot AI: DialoGPT (Hugging Face)**

**Use Case**: Natural language customer service for handling complaints, answering questions, and providing app guidance.

**Approach**: DialoGPT is a pre-trained conversational AI model that can understand customer questions and generate contextually appropriate responses.

**Advantages**:
* **Conversational Training**: DialoGPT is specifically trained on dialogue data, making it naturally suited for chatbot applications
* **Low Configuration**: Requires minimal setup compared to training a custom model from scratch
* **Free and Open Source**: Available via Hugging Face transformers library at no cost
* **Python Integration**: Easy to integrate with Django backend

**Limitations**:
* **Large Model Size**: DialoGPT requires significant memory and compute resources
* **Context Understanding**: May occasionally misunderstand complex or ambiguous questions

##### **AI Image Generation: Gemini (Limited Use)**

**Use Case**: Generate loading screens, icons, and decorative graphics for the mobile app.

**Approach**: Use Gemini API to create themed images (soda-related illustrations, mascots, backgrounds) to enhance visual appeal.

**Limitations**:
* **Decorative Only**: AI images are supplementary to hand-designed UI elements
* **Learning Opportunity**: Frontend team focuses on creating custom designs, with AI images used sparingly for variety
* **Not Business-Critical**: Image generation does not affect core functionality


## **5. Data Design**

### **Data Model**

The CodePop data model has been extended to support multiple store locations, regional supply hubs, machine maintenance tracking, and logistics coordination. The model follows a distributed design where some entities are local to each store (Orders, Inventory, Machines) while others are replicated across the peer network (User, Preference, Drink).

---

#### **Core Entities**

##### **User**

Represents a person who uses the application. User accounts are **global across all stores**, meaning a user can log in from any location and access their preferences and favorites.

| Field | Type | Description |
|-------|------|-------------|
| **id** | Integer (PK) | Django's built-in user ID |
| **username** | String | Unique username for login |
| **password** | String (hashed) | Securely hashed password (PBKDF2, Argon2, or bcrypt) |
| **email** | String | User's email address (encrypted at rest) |
| **first_name** | String | User's first name |
| **last_name** | String | User's last name |
| **is_staff** | Boolean | Whether user has staff privileges |
| **is_superuser** | Boolean | Whether user has superuser privileges |
| **date_joined** | DateTime | Account creation timestamp |
| **last_login** | DateTime | Last successful login timestamp |

**Encryption**: Passwords are hashed using Django's built-in password hasher. Emails are encrypted at rest.

**Relationships**:
* User → Preference (One-to-Many)
* User → Order (One-to-Many)
* User → Notification (One-to-Many)
* User → UserRole (One-to-Many, for role-based access control)
* User ↔ Drink (Many-to-Many via Favorite)

**P2P Synchronization**: User accounts are replicated across store nodes. When a user logs in at a store where their account doesn't exist locally, the store queries peer nodes, replicates the account, and allows the user to log in.

---

##### **UserProfile**

Extended profile for users containing P2P metadata and store preferences.

| Field | Type | Description |
|-------|------|-------------|
| **id** | Integer (PK) | Primary key |
| **user** | ForeignKey (User) | One-to-one link to User |
| **is_replicated** | Boolean | True if this account was replicated from another store |
| **source_node_id** | UUID | The original store where this account was created |
| **last_synced** | DateTime | Last time this profile was synchronized with peers |
| **preferred_store** | ForeignKey (Store) | User's preferred pickup location (optional) |

**Relationships**:
* UserProfile → User (One-to-One)
* UserProfile → Store (Many-to-One, optional)

---

##### **UserRole**

Defines user roles and their scope (store-specific, region-specific, or system-wide).

| Field | Type | Description |
|-------|------|-------------|
| **id** | Integer (PK) | Primary key |
| **user** | ForeignKey (User) | User this role belongs to |
| **role_type** | String (Choice) | ACCOUNT_USER, GENERAL_USER, MANAGER, ADMIN, LOGISTICS_MANAGER, REPAIR_STAFF, SUPER_ADMIN |
| **store** | ForeignKey (Store) | Specific store for this role (for MANAGER, ADMIN) |
| **region** | ForeignKey (Region) | Specific region for this role (for LOGISTICS_MANAGER, REPAIR_STAFF) |
| **supply_hub** | ForeignKey (SupplyHub) | Specific supply hub for this role (for LOGISTICS_MANAGER) |
| **is_active** | Boolean | Whether this role is currently active |
| **assigned_by** | ForeignKey (User) | Admin who assigned this role |
| **assigned_at** | DateTime | When this role was assigned |

**Relationships**:
* UserRole → User (Many-to-One)
* UserRole → Store (Many-to-One, optional)
* UserRole → Region (Many-to-One, optional)
* UserRole → SupplyHub (Many-to-One, optional)

---

##### **Preference**

Stores individual flavor preferences for each user. Uses atomic values (one preference per row) to maintain First Normal Form (1NF).

| Field | Type | Description |
|-------|------|-------------|
| **PreferenceID** | Integer (PK) | Primary key |
| **UserID** | ForeignKey (User) | User who has this preference |
| **Preference** | String | Single preference value (e.g., "Strawberry", "Vanilla") |

**Example**:
| PreferenceID | UserID | Preference |
|--------------|--------|------------|
| 1 | 123 | Strawberry |
| 2 | 123 | Vanilla |
| 3 | 123 | No Coconut |
| 4 | 456 | Cherry |

**Relationships**:
* Preference → User (Many-to-One)

**P2P Synchronization**: Preferences are replicated across store nodes when users log in from different locations.

---

##### **Drink**

Represents drink combinations that can be ordered. Includes both catalog drinks (pre-defined) and user-created custom drinks.

| Field | Type | Description |
|-------|------|-------------|
| **DrinkID** | Integer (PK) | Primary key |
| **Name** | String | Drink name (e.g., "Cherry Burst", "Custom Drink #47") |
| **SyrupsUsed** | Array[String] | List of syrup names used in this drink |
| **SodaUsed** | Array[String] | List of soda types used in this drink |
| **AddIns** | Array[String] | List of add-ins (fruit, candy, ice variations) |
| **Rating** | Float | Average user rating (0-5 scale, optional) |
| **Price** | Float | Drink price in USD |
| **Size** | String | Drink size (s, m, l) |
| **Ice** | String | Ice amount (none, light, normal, extra) |
| **User_Created** | Boolean | True if created by a user, False if catalog drink |

**Relationships**:
* Drink ↔ User (Many-to-Many via Favorite field)
* Drink ↔ Order (Many-to-Many)

**P2P Synchronization**: Catalog drinks are replicated globally. User-created drinks are personal to the user and replicate when the user's favorites sync.

---

##### **Region**

Represents a geographic region containing multiple stores and served by one supply hub.

| Field | Type | Description |
|-------|------|-------------|
| **region_code** | String (PK) | Unique region identifier (A, B, C, D, E, F, G) |
| **name** | String | Human-readable region name (e.g., "Logan, UT") |
| **center_latitude** | Float | Geographic center latitude for distance calculations |
| **center_longitude** | Float | Geographic center longitude for distance calculations |
| **service_radius_miles** | Integer | Maximum distance stores can be from center (default 200) |
| **created_at** | DateTime | Region creation timestamp |

**Pre-defined Regions**:
| Code | Name | Location | Supply Hub |
|------|------|----------|------------|
| A | Chicago Region | Chicago, IL | Chicago Supply Hub |
| B | New Jersey Region | New Jersey, NY | New Jersey Supply Hub |
| C | Logan Region | Logan, UT | Logan Supply Hub |
| D | Dallas Region | Dallas, TX | Dallas Supply Hub |
| E | Atlanta Region | Atlanta, GA | Atlanta Supply Hub |
| F | Phoenix Region | Phoenix, AZ | Phoenix Supply Hub |
| G | Boise Region | Boise, ID | Boise Supply Hub |

**Relationships**:
* Region → Store (One-to-Many)
* Region → SupplyHub (One-to-One)
* Region → UserRole (One-to-Many)

---

##### **SupplyHub**

Represents a regional supply hub that manages inventory and coordinates deliveries to stores within its region.

| Field | Type | Description |
|-------|------|-------------|
| **hub_id** | UUID (PK) | Primary key |
| **node_id** | UUID | Links to NodeConfig for P2P identification |
| **region** | ForeignKey (Region) | The region this hub serves |
| **name** | String | Hub name (e.g., "Logan UT Supply Hub") |
| **street_address** | String | Street address |
| **city** | String | City |
| **state** | String | State abbreviation (2 letters) |
| **zip_code** | String | Zip code |
| **latitude** | Float | Geographic latitude |
| **longitude** | Float | Geographic longitude |
| **phone** | String | Contact phone number |
| **email** | String | Contact email address |
| **api_base_url** | URL | API endpoint for this hub (e.g., "http://hub-logan.codepop.com:8000") |
| **is_operational** | Boolean | Whether the hub is currently operational |
| **max_delivery_distance_miles** | Integer | Maximum delivery range from this hub (default 1000) |
| **created_at** | DateTime | Hub creation timestamp |

**Relationships**:
* SupplyHub → Region (One-to-One)
* SupplyHub → Store (One-to-Many)
* SupplyHub → SupplyRequest (One-to-Many)
* SupplyHub → UserRole (One-to-Many)

---

##### **Store**

Represents a physical CodePop location where customers can pick up drinks.

| Field | Type | Description |
|-------|------|-------------|
| **store_id** | UUID (PK) | Primary key |
| **node_id** | UUID | Links to NodeConfig for P2P identification |
| **store_number** | String | Unique store identifier (e.g., "LOGAN-001") |
| **name** | String | Store name (e.g., "Logan Main Street") |
| **region** | ForeignKey (Region) | The region this store belongs to |
| **supply_hub** | ForeignKey (SupplyHub) | The supply hub that services this store |
| **street_address** | String | Street address |
| **city** | String | City |
| **state** | String | State abbreviation (2 letters) |
| **zip_code** | String | Zip code |
| **latitude** | Float | Geographic latitude |
| **longitude** | Float | Geographic longitude |
| **phone** | String | Contact phone number |
| **email** | String | Contact email address |
| **api_base_url** | URL | API endpoint for this store (e.g., "http://store-logan-001.codepop.com:8001") |
| **is_operational** | Boolean | Whether the store is currently operational |
| **is_accepting_orders** | Boolean | Whether the store is accepting new orders |
| **hours_of_operation** | JSONB | Store hours by day (e.g., {"monday": {"open": "06:00", "close": "22:00"}}) |
| **created_at** | DateTime | Store creation timestamp |
| **last_online** | DateTime | Last heartbeat from this store node |

**Relationships**:
* Store → Region (Many-to-One)
* Store → SupplyHub (Many-to-One)
* Store → Inventory (One-to-Many)
* Store → Order (One-to-Many)
* Store → Revenue (One-to-Many)
* Store → Machine (One-to-Many)
* Store → SupplyRequest (One-to-Many)
* Store → UserRole (One-to-Many)

**Methods**:
* `distance_to(latitude, longitude)`: Calculate distance from this store to given coordinates
* `is_open_now()`: Check if store is currently open based on hours_of_operation

---

##### **Inventory**

Tracks ingredient quantities at each store location.

| Field | Type | Description |
|-------|------|-------------|
| **InventoryID** | Integer (PK) | Primary key |
| **store** | ForeignKey (Store) | The store this inventory belongs to |
| **ItemName** | String | Name of the inventory item (e.g., "Cherry Syrup", "Coca-Cola") |
| **ItemType** | String (Choice) | Type: Soda, Syrup, Add In, Physical |
| **Quantity** | Integer | Current quantity in stock |
| **ThresholdLevel** | Integer | Minimum quantity before restock alert |
| **LastUpdated** | DateTime | Last inventory update timestamp (auto-updated) |

**Relationships**:
* Inventory → Store (Many-to-One)

**Unique Constraint**: (store, ItemName, ItemType) must be unique

**Methods**:
* `is_out_of_stock()`: Returns True if Quantity <= 0
* `is_low_stock()`: Returns True if Quantity <= ThresholdLevel

**P2P Synchronization**: Inventory is local to each store. Aggregate regional inventory data is managed by supply hubs.

---

##### **Order**

Represents a customer's drink order at a specific store location.

| Field | Type | Description |
|-------|------|-------------|
| **OrderID** | Integer (PK) | Primary key |
| **store** | ForeignKey (Store) | The store where this order was placed |
| **UserID** | ForeignKey (User) | User who placed the order (nullable for guest users) |
| **Drinks** | ManyToMany (Drink) | Drinks included in this order |
| **OrderStatus** | String (Choice) | pending, processing, completed, cancelled |
| **PaymentStatus** | String (Choice) | pending, paid, failed, remade |
| **PickupTime** | DateTime | Scheduled or estimated pickup time |
| **CreationTime** | DateTime | Order creation timestamp (auto-generated) |
| **LockerCombo** | Integer | Combination for pickup locker |
| **StripeID** | String | Stripe payment intent ID |

**Relationships**:
* Order → Store (Many-to-One)
* Order → User (Many-to-One, nullable)
* Order ↔ Drink (Many-to-Many)
* Order → Revenue (One-to-One)

**Methods**:
* `add_drinks(drink_ids)`: Add drinks to order
* `remove_drinks(drink_ids)`: Remove drinks from order

**P2P Synchronization**: Orders are local to each store. They do not sync across the network.

---

##### **Revenue**

Tracks financial transactions for each order at each store.

| Field | Type | Description |
|-------|------|-------------|
| **RevenueID** | Integer (PK) | Primary key |
| **store** | ForeignKey (Store) | The store where this revenue was generated |
| **OrderID** | ForeignKey (Order) | The order associated with this revenue |
| **TotalAmount** | Float | Total revenue amount in USD |
| **SaleDate** | DateTime | Transaction date (auto-generated) |
| **Refunded** | Boolean | Whether this transaction was refunded |

**Relationships**:
* Revenue → Store (Many-to-One)
* Revenue → Order (One-to-One)

**Methods**:
* `calculate_total_amount()`: Sums the price of all drinks in the order

**P2P Synchronization**: Revenue is local to each store. Aggregated regional revenue is accessible to logistics managers via their dashboard.

---

##### **Notification**

Represents notifications sent to users or managers.

| Field | Type | Description |
|-------|------|-------------|
| **NotificationID** | Integer (PK) | Primary key |
| **store** | ForeignKey (Store) | The store this notification relates to (nullable for global notifications) |
| **UserID** | ForeignKey (User) | User receiving this notification (nullable for global notifications) |
| **Message** | String | Notification text |
| **Timestamp** | DateTime | Notification creation time (auto-generated) |
| **Type** | String | Notification type (order_update, inventory_alert, system_message, etc.) |
| **Global** | Boolean | Whether this is a global notification visible to all users |

**Relationships**:
* Notification → Store (Many-to-One, optional)
* Notification → User (Many-to-One, optional)

**P2P Synchronization**: Notifications are local to each store. User-specific notifications are not replicated across stores.

---

##### **Machine**

Represents a robotic beverage-making machine at a store location.

| Field | Type | Description |
|-------|------|-------------|
| **machine_id** | UUID (PK) | Primary key |
| **store** | ForeignKey (Store) | The store where this machine is located |
| **machine_type** | String | Type of machine (e.g., "Soda Dispenser", "Syrup Injector", "Ice Machine") |
| **machine_number** | String | Machine identifier within store (e.g., "DISP-01") |
| **status** | String (Choice) | normal, repair-start, repair-end, warning, error, out-of-order, schedule-service |
| **operational_date** | DateTime | Date machine was installed or last marked operational |
| **status_date** | DateTime | Date the current status was set |
| **notes** | Text | Additional notes about machine condition |

**Status Definitions**:
* **normal**: Machine operating normally
* **repair-start**: Servicing started; machine is offline
* **repair-end**: Servicing finished; machine is back online
* **warning**: Non-critical issue; operational but needs repair soon
* **error**: Critical issue; requires repair within one week
* **out-of-order**: Not operational; requires immediate attention
* **schedule-service**: Operational but needs scheduled maintenance within one month

**Relationships**:
* Machine → Store (Many-to-One)
* Machine → MaintenanceLog (One-to-Many)
* Machine → RepairSchedule (One-to-Many)

**P2P Synchronization**: Machine status updates are sent to the regional supply hub for logistics and repair staff visibility.

---

##### **MaintenanceLog**

Tracks service history and repairs for machines.

| Field | Type | Description |
|-------|------|-------------|
| **log_id** | UUID (PK) | Primary key |
| **machine** | ForeignKey (Machine) | The machine this log entry pertains to |
| **repair_staff** | ForeignKey (User) | Repair staff member who performed the service |
| **service_type** | String (Choice) | routine_maintenance, repair, emergency_fix, part_replacement, cleaning |
| **description** | Text | Details of service performed |
| **parts_replaced** | Text | List of parts replaced (if any) |
| **service_start** | DateTime | Service start time |
| **service_end** | DateTime | Service completion time |
| **cost** | Decimal | Service cost in USD |

**Relationships**:
* MaintenanceLog → Machine (Many-to-One)
* MaintenanceLog → User (Many-to-One)

**P2P Synchronization**: Maintenance logs are local to each store but accessible to repair staff in that region.

---

##### **RepairSchedule**

Manages repair staff schedules for servicing machines across multiple stores.

| Field | Type | Description |
|-------|------|-------------|
| **schedule_id** | UUID (PK) | Primary key |
| **repair_staff** | ForeignKey (User) | Repair staff member assigned to this task |
| **machine** | ForeignKey (Machine) | Machine to be serviced |
| **scheduled_date** | DateTime | Scheduled service date and time |
| **estimated_duration_minutes** | Integer | Estimated time to complete service |
| **status** | String (Choice) | scheduled, in_progress, completed, cancelled |
| **notes** | Text | Additional scheduling notes |

**Relationships**:
* RepairSchedule → User (Many-to-One)
* RepairSchedule → Machine (Many-to-One)

**CSV Import**: Repair staff can upload their schedules in CSV format for bulk scheduling and optimization.

**AI Optimization**: The system uses route optimization algorithms to suggest efficient schedules that minimize travel time and prioritize critical repairs.

---

##### **SupplyRequest**

Represents a request from a store to a supply hub for inventory replenishment.

| Field | Type | Description |
|-------|------|-------------|
| **request_id** | UUID (PK) | Primary key |
| **store** | ForeignKey (Store) | Store making the request |
| **supply_hub** | ForeignKey (SupplyHub) | Supply hub receiving the request |
| **requested_items** | JSONB | List of items and quantities (e.g., [{"item": "Cherry Syrup", "quantity": 10}]) |
| **priority** | String (Choice) | low, normal, urgent |
| **status** | String (Choice) | submitted, approved, in_transit, delivered, rejected |
| **request_date** | DateTime | When request was submitted |
| **approval_date** | DateTime | When request was approved (nullable) |
| **delivery_date** | DateTime | Expected or actual delivery date (nullable) |
| **notes** | Text | Additional request details |

**Relationships**:
* SupplyRequest → Store (Many-to-One)
* SupplyRequest → SupplyHub (Many-to-One)

**P2P Synchronization**: Supply requests are sent synchronously from stores to supply hubs via REST API. Status updates propagate back to the store asynchronously.

---

#### **Relationships Summary**

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

#### **Database Type: PostgreSQL 15**

CodePop uses PostgreSQL as the relational database for each store node. Each store runs its own independent PostgreSQL instance, ensuring fault isolation and data autonomy.

#### **Database-per-Store Architecture**

Unlike traditional centralized systems, CodePop employs a **database-per-store** model:

* **Store A** runs PostgreSQL instance on its local server (or cloud VM)
* **Store B** runs its own separate PostgreSQL instance
* **Supply Hub C** runs its own PostgreSQL instance

This architecture provides:
* **Fault Isolation**: Database failure at Store A doesn't affect Store B
* **Data Sovereignty**: Each store owns its operational data
* **Independent Scaling**: High-traffic stores can upgrade their database hardware without impacting other stores
* **Reduced Latency**: Local database queries are fast (no network round-trip to central server)

**Trade-offs**:
* **No Global Transactions**: Cross-store operations (like user registration) use eventual consistency rather than ACID transactions
* **Data Replication Complexity**: Some data (users, preferences, favorites) must be replicated across stores
* **Increased Operational Overhead**: Each store's database must be backed up, monitored, and maintained independently

#### **Major Tables in PostgreSQL**

| Table Name | Purpose | Local or Replicated | Key Relationships |
|------------|---------|---------------------|-------------------|
| **auth_user** | User accounts | Replicated | → Preference, Order, UserRole |
| **backend_userprofile** | User P2P metadata | Replicated | → User, Store |
| **backend_userrole** | Role assignments | Replicated | → User, Store, Region |
| **backend_preference** | User flavor preferences | Replicated | → User |
| **backend_drink** | Drink combinations | Replicated | ↔ User (favorites), Order |
| **backend_region** | Geographic regions | Replicated (static) | → Store, SupplyHub |
| **backend_supplyhub** | Supply hubs | Replicated (static) | → Region, Store, SupplyRequest |
| **backend_store** | Store locations | Replicated (static) | → Region, SupplyHub, Inventory, Order, Machine |
| **backend_inventory** | Store inventory | Local | → Store |
| **backend_order** | Customer orders | Local | → Store, User, Drink |
| **backend_revenue** | Financial transactions | Local | → Store, Order |
| **backend_notification** | User notifications | Local | → Store, User |
| **backend_machine** | Robotic machines | Local | → Store, MaintenanceLog |
| **backend_maintenancelog** | Machine service logs | Local | → Machine, User (repair staff) |
| **backend_repairschedule** | Repair schedules | Regional | → Machine, User (repair staff) |
| **backend_supplyrequest** | Supply requests | Hub-managed | → Store, SupplyHub |

#### **Indexes**

Django automatically creates indexes on primary keys and foreign keys. Additional custom indexes optimize common queries:

**Inventory Table**:
* Index on `(store, ItemType, ItemName)` for fast inventory lookups
* Index on `(store, Quantity)` for low-stock alerts

**Order Table**:
* Index on `(store, OrderStatus, PickupTime)` for dashboard queries
* Index on `(store, UserID, CreationTime)` for user order history

**Revenue Table**:
* Index on `(store, SaleDate)` for daily/weekly/monthly revenue reports
* Index on `(store, Refunded)` for refund tracking

**Machine Table**:
* Index on `(store, status)` for repair staff dashboard
* Index on `(store, status_date)` for overdue maintenance alerts

**Store Table**:
* Index on `(latitude, longitude)` for geolocation-based store discovery
* Index on `(region, is_operational)` for regional queries

#### **Data Migrations**

Django's migration system handles schema changes across all store nodes. When a new model field is added:

1. Developers create a migration using `python manage.py makemigrations`
2. Migration files are committed to version control
3. Each store node runs `python manage.py migrate` to apply the changes
4. Migrations can include data transformations (e.g., populating default values for new fields)

**Backward Compatibility**: Migrations are designed to be backward-compatible during rolling deployments. For example, adding a new nullable field allows old code to continue running while nodes are updated.

#### **Data Encryption**

**At Rest**:
* User passwords are hashed using Django's built-in hasher (PBKDF2 with SHA256, configurable to Argon2 for stronger security)
* Sensitive fields (email, payment data) can be encrypted using `django-encrypted-fields` or custom encryption
* PostgreSQL supports transparent data encryption (TDE) at the disk level

**In Transit**:
* All API communication uses HTTPS/TLS to encrypt data between mobile clients and backend
* Inter-store P2P communication also uses HTTPS/TLS

**Payment Data**:
* CodePop never stores raw credit card numbers or CVV codes
* Stripe handles all sensitive payment data
* Only Stripe payment intent IDs are stored in the database


#### **Backup and Recovery**

Each store node runs automated database backups:

**Backup Strategy**:
* **Daily full backups** using `pg_dump`
* **Hourly incremental backups** using PostgreSQL WAL archiving
* **Off-site backup storage** to cloud storage (AWS S3, Google Cloud Storage)

**Recovery Procedure**:
1. Stop Django application
2. Restore PostgreSQL database from backup: `pg_restore -d codepop_database backup.dump`
3. Restart Django application
4. Re-sync replicated data from peers if needed

**Disaster Recovery**:
* If a store node's database is completely lost, it can be re-initialized and re-sync user accounts and catalog drinks from peer nodes
* Local data (orders, inventory, revenue) must be recovered from backups; they are not replicated

