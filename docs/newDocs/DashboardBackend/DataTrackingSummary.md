# Data Tracking Summary — Dashboard Backend

## Context
All 5 dashboards (Admin, Manager, Repair Staff, Logistics Manager, Super Admin) exist in `dashboards_frontend/` but currently use mock data. This document identifies every data entity that needs to be stored and tracked, and maps which dashboards consume that data.

---

## Data Entities & Dashboard Mapping

### 1. Users & Auth
**Models needed:** `User` (Django built-in), `Role`, `Permission`, `AuditLog`

**Fields:**
- `User`: id, username, email, status (active/disabled), last_login, location/region, role
- `Role`: name, is_builtin, description
- `Permission`: codename, description
- `Role ↔ Permission`: M2M join table
- `AuditLog`: actor (FK→User), action, target_type, target_id, timestamp, ip_address, result

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **Admin** | Full CRUD on users, roles, permissions; audit log table with filters by date/action/actor |
| **Super Admin** | User management (role/region assignment, enable/disable, bulk actions); audit log viewing |

---

### 2. Profiles (already in models.py)
**Models:** `RepairStaffProfile`, `LogisticsManagerProfile`, `ManagerProfile`

**Fields:**
- `RepairStaffProfile`: name, region (FK→Region), assigned stores
- `LogisticsManagerProfile`: name, region (FK→Region), hub (FK)
- `ManagerProfile`: name, store (FK→StoreRegistry), location

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **Repair Staff** | Header/sidebar profile display |
| **Logistics Manager** | Header/sidebar profile display |
| **Manager** | Header/sidebar profile; store name pre-fill on supply request form |

---

### 3. Stores & Supply Hubs (DONE)
**Models:** `StoreRegistry` (exists), `SupplyHub` (new)

**Fields:**
- `StoreRegistry`: name, location, region (FK), status, manager (FK→ManagerProfile), last_heartbeat, machine_count
- `SupplyHub`: name, region (FK), inventory_pct, active_deliveries_count, pending_orders_count

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **Logistics Manager** | Hub status section, stores list with health filters (critical/low/good), critical stores list (top 5), store detail view with inventory/requests/forecast |
| **Super Admin** | Stores list (search/sort/paginate), hubs list, create/edit store/hub forms, regional status grid showing online stores and alerts per region |

---

### 4. Inventory (split into two scopes) (DONE)

#### 4a. Hub Inventory (regional supply hub stock)
**Model:** `HubInventoryItem`

**Fields:**
- hub (FK→SupplyHub), item_name, category (syrup/soda/add-in/physical), quantity, threshold, last_updated, unit

#### 4b. Store Inventory (per-store stock)
**Model:** `StoreInventoryItem`

**Fields:**
- store (FK→StoreRegistry), item_name, category, quantity, days_remaining, threshold, last_updated

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **Manager** | Inventory list filtered by category (syrups, sodas, add-ins) with stock levels and days remaining; AI recommendations based on current stock |
| **Logistics Manager** | Hub inventory list with category/level/sort filters; inventory usage trends chart (week/month/30-day); critical store identification; store inventory tab in store detail |
| **Super Admin** | Inventory health % KPI aggregate (% of items above threshold) |

---

### 5. Supply Requests (DONE)
**Model:** `SupplyRequest` (exists, needs extension)

**Fields to add/verify:**
- store (FK→StoreRegistry), hub (FK→SupplyHub), items (JSON: [{name, qty, unit}]), status (pending/approved/denied/fulfilled), created_by (FK→User), created_at, approved_by (FK→User), approved_at, fulfilled_at, notes, urgency

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **Manager** | Create supply request form (store location pre-filled), requests list with status filter, supply movement history table with sort/filter/pagination |
| **Logistics Manager** | Approve/cancel requests, request detail view with approval timeline, recurring delivery schedules list, create/edit schedule form, schedule delivery route form |
| **Super Admin** | Pending requests count in KPI |

---

### 6. Deliveries
**Model:** `Delivery` (new)

**Fields:**
- hub (FK→SupplyHub), driver (FK→User), route (JSON: [store_ids] or text description), status (scheduled/in_transit/delivered/cancelled), eta, delivery_date, created_at, notes, stores (M2M→StoreRegistry)

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **Logistics Manager** | Deliveries list with status and date range filters, delivery detail view (route, driver, ETA, status), update delivery status button |
| **Super Admin** | Deliveries in transit KPI count |

---

### 7. Recurring Delivery Schedules
**Model:** `RecurringSchedule` (new)

**Fields:**
- hub (FK→SupplyHub), stores (M2M→StoreRegistry), items (JSON: [{name, qty, unit}]), frequency (weekly/biweekly/monthly), next_delivery_date, driver (FK→User, nullable), is_active, created_at, created_by (FK→User)

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **Logistics Manager** | Recurring schedules list, create/edit/delete schedule form, drivers dropdown for assignment |

---

### 8. Machines & Repairs
**Models:** `Machine` (exists, needs extension), `RepairRecord` (new), `MachinePart` (new), `MachineNote` (new), `MachinePhoto` (new)

**Fields:**

`Machine`:
- id, store (FK→StoreRegistry), status (7-state), install_date, warranty_expiry, last_repair_date, completion_estimate, model_number, serial_number

`RepairRecord`:
- machine (FK), technician (FK→User), repair_type, started_at, completed_at, status (in_progress/awaiting_parts/completed/escalated), notes

`MachinePart`:
- machine (FK), part_name, part_number, stock_qty, eta_days, is_compatible

`MachineNote`:
- machine (FK), author (FK→User), content, created_at

`MachinePhoto`:
- machine (FK), url, uploaded_by (FK→User), created_at

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **Repair Staff** | Machines list (show machines in technician's region with status), machine detail view (install date, warranty, repair state, completion estimate), repair history tab (last 10 repairs), compatible parts tab (with stock status and ETA), notes tab (show existing notes), add note form, update repair status dropdown, request part button, photo uploads/deletion |
| **Super Admin** | Machine uptime % KPI aggregate |

---

### 9. Repair Schedules
**Model:** `Schedule` (exists, verify fields)

**Fields:**
- machine (FK), technician (FK→User), job_date, status (scheduled/in_progress/completed/cancelled/overdue), job_type, notes

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **Repair Staff** | Today's schedule on overview page, full schedule page (all upcoming jobs with date range filter), start job button, cancel job button, overdue jobs section, waiting on parts section |

---

### 10. Part Orders
**Model:** `PartOrder` (new)

**Fields:**
- machine (FK), part (FK→MachinePart), technician (FK→User), requested_at, received_at, status (pending/ordered/received), quantity

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **Repair Staff** | Open part orders list, mark as received button on part order |
| **Logistics Manager** | Parts pending KPI |

---

### 11. Orders & Revenue
**Models:** `Order` (exists), `Revenue` (exists)

**Verify fields:**
- `Order`: id, user (FK), drinks (M2M), status, payment_status, pickup_time, created_at, locker_combo
- `Revenue`: order (FK), total_amount, sale_date, refunded (boolean), category

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **Manager** | Revenue KPI cards (total revenue, inventory costs, active orders), 30-day revenue trend chart, top items by order volume chart, peak hours chart, peak days chart, revenue by category table (with pagination and sort), active users KPI |
| **Super Admin** | Active orders KPI, revenue today KPI, order volume performance chart |

---

### 12. Alerts / Notifications
**Model:** extend `Notification` or create `Alert` (new/refactored)

**Fields:**
- type (inventory_low, machine_down, delivery_delayed, low_stock, etc.), severity (info/warning/critical), message, target_role (nullable, if null then global), store/region (FK, nullable), created_at, read_at, dismissed_at, dismissed_by (FK→User)

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **All 5 dashboards** | Alerts panel showing real unread alerts, dismiss alert button |

---

### 13. System Health (Super Admin only)
**Model:** `SystemHealthSnapshot` (new, or polled live)

**Fields:**
- database_status (up/down), cache_status, queue_status, external_services (JSON), api_response_ms, network_latency_ms, recorded_at

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **Super Admin** | System health panel (database, cache, queue, external services status), status board, performance charts |

---

### 14. AI Configuration (Super Admin only)
**Model:** `AIConfig` (new)

**Fields:**
- config_type (recommendation_engine/chatbot/forecasting), settings (JSON with model params), updated_by (FK→User), updated_at, is_active

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **Super Admin** | AI config load/save forms (one per config type), reset to defaults button |
| **Manager** | AI recommendations panel on inventory page, accept AI recommendations button (auto-creates supply request), AI-suggested quantities on supply request form |
| **Logistics Manager** | AI-suggested quantities on supply request form, AI insights panel on inventory page |

---

### 15. Region
**Model:** `Region` (exists)

**Fields:**
- name, hub_city, is_active

**Dashboard Usage:**

| Dashboard | How Used |
|---|---|
| **Super Admin** | Regional status grid (online stores, alerts, revenue per region), regional map, used for filtering/aggregation |
| **All profile models** | User assignment to region |

---

## KPI Aggregates (Computed, Not Stored)

These are derived at query time from existing data:

| KPI | Source Data | Dashboard(s) |
|---|---|---|
| Total users | Count `User` | Admin, Super Admin |
| Active users | Count `User` where `last_login` > 30 days ago | Admin, Super Admin |
| Managers | Count `User` where `role = 'manager'` | Admin, Super Admin |
| Machines down | Count `Machine` where `status = 'down'` | Repair Staff, Super Admin |
| Machine uptime % | Count `Machine` where `status != 'down'` / total * 100 | Super Admin |
| Repairs today | Count `RepairRecord` where `date(started_at) = today()` | Repair Staff |
| Parts pending | Count `PartOrder` where `status = 'pending'` | Repair Staff, Logistics Manager |
| Revenue today | Sum `Revenue` where `sale_date = today()` | Manager, Super Admin |
| Total revenue | Sum `Revenue` | Manager, Super Admin |
| Active orders | Count `Order` where `status = 'pending'` | Manager, Super Admin |
| Stores at critical | Count `StoreInventoryItem` where `days_remaining <= 3` per store | Logistics Manager |
| Deliveries in transit | Count `Delivery` where `status = 'in_transit'` | Logistics Manager, Super Admin |
| Forecast accuracy | Compare `SupplyRequest` forecasted vs actual consumption | Logistics Manager |
| Inventory health % | Count items above threshold / total items * 100 | Super Admin |
| API response time | Avg response time from logs/monitoring | Super Admin |
| Network latency | Measured latency metric | Super Admin |

---

## Summary: New Models Required

The following models do **NOT** exist yet and must be created:

1. `Role` — (or use Django's built-in `auth.Group`)
2. `Permission` — (or extend Django's `auth.Permission`)
3. `AuditLog` — track user actions across all dashboards
4. `HubInventoryItem` — regional supply hub stock
5. `StoreInventoryItem` — per-store stock levels
6. `Delivery` — delivery routes and tracking
7. `RecurringSchedule` — scheduled delivery patterns
8. `RepairRecord` — individual repair job records
9. `MachinePart` — compatible parts for machines
10. `MachineNote` — notes/comments on machines
11. `MachinePhoto` — photo uploads for machines
12. `PartOrder` — requested parts tracking
13. `SystemHealthSnapshot` — system health metrics
14. `AIConfig` — AI feature configuration storage
15. `SupplyHub` — regional supply hubs (separate from StoreRegistry)

---

## Summary: Existing Models Needing Extension/API Wiring

The following models **exist** but need extensions and/or API endpoints:

| Model | What's Missing | Action |
|---|---|---|
| `SupplyRequest` | approval fields, notes, urgency | Add `approved_by`, `approved_at`, `fulfilled_at`, `notes`, `urgency` fields; create API endpoints |
| `Machine` | install_date, warranty, completion_estimate | Add these fields; create endpoints for detail view and status updates |
| `Schedule` | verify all fields present | Create API endpoints for schedule list, detail, start/cancel job |
| `Notification` | severity, target_role, dismissal | Extend or replace with `Alert` model; add severity, role targeting, dismissal tracking |
| `Inventory` | needs splitting into hub vs store scope | Refactor into `HubInventoryItem` and `StoreInventoryItem` |
| `Order`, `Revenue` | need aggregation endpoints | Create endpoints for KPI queries, trend data, category breakdowns |
| `Region` | already exists | Create API endpoints for region list and regional aggregations |
| `StoreRegistry` | already exists | Create API endpoints for store list, detail, search, filters, create/edit/delete |
| `RepairStaffProfile` | already exists | Create API endpoints for profile retrieval by logged-in user |
| `LogisticsManagerProfile` | already exists | Create API endpoints for profile retrieval by logged-in user |
| `ManagerProfile` | already exists | Create API endpoints for profile retrieval by logged-in user |

---

## Implementation Priority

**Phase 1 (P1 — Minimum functioning dashboards):**
- Roles/Permissions/AuditLog (Admin, Super Admin foundations)
- Profiles + their endpoints (Repair Staff, Logistics Manager, Manager headers)
- HubInventoryItem + StoreInventoryItem (Manager, Logistics Manager inventory lists)
- KPI aggregations for all dashboards
- Alerts/Notifications (all dashboards alerts panel)

**Phase 2 (P2 — Core actions working):**
- RepairRecord + MachinePart + MachineNote + MachinePhoto (Repair Staff machines)
- Delivery + RecurringSchedule (Logistics Manager deliveries)
- PartOrder (Repair Staff and Logistics Manager)
- CRUD operations on existing models (user enable/disable, role assignment, etc.)

**Phase 3 (P3 — Secondary features):**
- SystemHealthSnapshot (Super Admin system health)
- AIConfig + AI endpoints (all dashboards AI features)
- Bulk operations (Admin, Super Admin bulk CRUD)
- Charts and trend data endpoints

**Phase 4 (P4 — Optional/nice-to-have):**
- Advanced filtering and search optimizations
- Caching for KPI data
- Real-time auto-refresh endpoints
