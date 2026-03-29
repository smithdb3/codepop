All items below represent UI-complete features with mock data. No backend endpoints currently exist for any of the following tasks. This document is organized by dashboard page, split into simple, actionable tasks.

---
# Backend TODO — Admin Dashboard


## Admin Dashboard - KPI Cards

- [ ] **Aggregate KPI data endpoint** (`GET /backend/admin/kpis/`)
  - Returns: totalUsers (count), activeUsers (count), disabledAccounts (count), totalManagers (count), customRoles (count), recentAuditEvents (count)
  - Each with trend percentage and target values

---

## User Management

### Data & Display
- [ ] **Get all users endpoint** (existing: `GET /backend/users/`)
  - Extend to include: location/region, status field (active/disabled/deleted), lastLogin timestamp
  - Support filtering by status

### Bulk Actions
- [ ] **Bulk disable users endpoint** (`POST /backend/users/bulk-disable/`)
  - Input: array of user IDs
  - Returns: success count, failed count

- [ ] **Bulk reset passwords endpoint** (`POST /backend/users/bulk-reset-password/`)
  - Input: array of user IDs
  - Returns: array of new temporary passwords or confirmation

- [ ] **Bulk export users endpoint** (`POST /backend/users/bulk-export/`)
  - Input: array of user IDs or filter criteria
  - Returns: CSV file stream

### User Actions
- [ ] **Disable user endpoint** (existing: `POST /backend/users/edit/<user_id>/` may support this)
  - Set `is_active = False` for the user

- [ ] **Enable user endpoint** (`POST /backend/users/<user_id>/enable/`)
  - Set `is_active = True` for the user

- [ ] **Promote user to manager endpoint** (`POST /backend/users/<user_id>/promote-to-manager/`)
  - Input: user_id, region(s), store(s)
  - Creates ManagerProfile or equivalent role assignment

- [ ] **Delete user endpoint** (existing: `DELETE /backend/users/delete/<user_id>/`)
  - May need soft-delete logic to preserve audit trail

### Add User Modal
- [ ] **Create user endpoint** (existing: `POST /backend/auth/register/` may handle this)
  - Input: name, email, role, region, password
  - Ensure password hashing and role assignment

---

## Manager Accounts

### Data & Display
- [ ] **Get managers endpoint** (`GET /backend/admin/managers/`)
  - Returns: manager details with regions/stores, reportsTo, activeUsersUnder (subordinate count), lastLogin
  - Support filtering by region/store

### Manager Actions
- [ ] **Edit manager endpoint** (`POST /backend/managers/<manager_id>/edit/`)
  - Update: regions, stores, reportsTo

- [ ] **View manager reports endpoint** (`GET /backend/managers/<manager_id>/reports/`)
  - Returns: list of users under this manager

- [ ] **Reset manager password endpoint** (`POST /backend/managers/<manager_id>/reset-password/`)
  - Generates temporary password

- [ ] **Disable manager endpoint** (`POST /backend/managers/<manager_id>/disable/`)
  - Sets active = False; reassign subordinates if needed

### Promote to Manager Modal
- [ ] **Search active users endpoint** (can use `GET /backend/users/` with status=active filter)
- [ ] **Promote user to manager endpoint** (listed above under User Management)

---

## Role & Permission Management

### Roles Data
- [ ] **Get all roles endpoint** (`GET /backend/admin/roles/`)
  - Returns: role name, permission count, active user count (how many users have this role), isBuiltIn flag

- [ ] **Get role details endpoint** (`GET /backend/admin/roles/<role_id>/`)
  - Returns: role name, full permission list, user assignments

### Role Actions
- [ ] **Create custom role endpoint** (`POST /backend/admin/roles/`)
  - Input: role name, permission IDs array
  - Returns: new role ID

- [ ] **Edit role endpoint** (`POST /backend/admin/roles/<role_id>/edit/`)
  - Input: role name (optional), permission IDs array
  - Prevent editing built-in roles

- [ ] **Delete custom role endpoint** (`DELETE /backend/admin/roles/<role_id>/`)
  - Only allow if no users assigned
  - Prevent deletion of built-in roles

### Permissions
- [ ] **Get all permissions endpoint** (`GET /backend/admin/permissions/`)
  - Returns: permission ID, label, category (User Management / Roles & Permissions / System & Audit)

- [ ] **Assign permission to role endpoint** (`POST /backend/admin/roles/<role_id>/permissions/<perm_id>/`)
  - Add permission to role

- [ ] **Revoke permission from role endpoint** (`DELETE /backend/admin/roles/<role_id>/permissions/<perm_id>/`)
  - Remove permission from role

---

## System Audit Trail

### Data & Display
- [ ] **User action audit log model** (new: `UserAuditLog` or `AdminAuditLog`)
  - Fields: timestamp, actor (user), actorRole, action (string), target (resource name/ID), status (success/failed), details (optional)
  - Separate from existing `SyncAuditLog` (inter-node syncs)

- [ ] **Get audit logs endpoint** (`GET /backend/admin/audit-logs/`)
  - Returns: paginated list of audit entries (50 per page default)
  - Support filtering by: date range, action type, actor
  - Support sorting by: timestamp

### Audit Trail Actions
- [ ] **Export audit logs to CSV endpoint** (`POST /backend/admin/audit-logs/export/`)
  - Input: date range, filter criteria
  - Returns: CSV file stream

### Logging Hooks
- [ ] **Log user creation** when `/backend/auth/register/` is called
- [ ] **Log user edits** when `/backend/users/edit/<user_id>/` is called
- [ ] **Log user deletion** when `/backend/users/delete/<user_id>/` is called
- [ ] **Log user enable/disable** for new endpoints
- [ ] **Log manager promotion** when new endpoint is called
- [ ] **Log role CRUD operations** when new endpoints are called
- [ ] **Log permission assignments** when new endpoints are called
- [ ] **Log password resets** when new endpoints are called
- [ ] **Log failed actions** (e.g., permission denied, invalid user ID) with status=failed

---

## Authentication & Authorization

- [ ] **Verify admin/super_admin role check** on all new endpoints
  - Use existing `ProtectedRoute` with `allowedRoles: ['admin', 'super_admin']`
  - Ensure backend enforces role checks via middleware or decorators

---

## Summary by Priority

**High Priority (MVP):**
1. Extend `GET /backend/users/` to support filters and additional fields
2. Create `GET /backend/admin/kpis/` endpoint
3. Create `UserAuditLog` model and logging hooks
4. Create basic role CRUD endpoints

**Medium Priority:**
5. Bulk actions (disable, reset password, export)
6. Manager-specific endpoints
7. Permission assignment endpoints

**Low Priority (Nice-to-have):**
8. Soft-delete for users
9. Advanced filtering and search optimizations
10. CSV export formatting and caching

---
# Backend TODO — Repair Staff Dashboard


## Repair Staff Dashboard — Overview Page

- [ ] GET /api/repair/technician/me — Return technician profile with `firstName`, `lastName`, `region`, `assignedStoreIds[]`
- [ ] GET /api/repair/kpis — Return daily KPIs: `{ machinesDown, repairsToday, partsPending, revenueImpactPerHour }`
- [ ] GET /api/repair/schedule/today — Return list of jobs scheduled for today for authenticated technician
- [ ] GET /api/repair/alerts — Return list of unread alerts for technician with `{ id, severity, message, timestamp, dismissed }`
- [ ] POST /api/repair/alerts/{id}/dismiss — Mark specific alert as dismissed
- [ ] GET /api/repair/region/summary — Return region statistics: `{ region, storeCount, machineCount, operational, degraded, critical, partsPending }`

---

## Repair Staff Dashboard — Machines Page

- [ ] GET /api/repair/machines — Return all machines in technician's assigned region with full details (status, downtime, priority, revenue impact)
- [ ] GET /api/repair/machines/{id} — Return complete machine detail including installDate, warranty, repairState, estimatedCompletion, lastNote
- [ ] GET /api/repair/machines/{id}/history — Return last 10 repair records for machine with `{ date, technician, issueType, duration, outcome, diagnosis, stepsText, partsReplaced[] }`
- [ ] GET /api/repair/machines/{id}/parts — Return list of parts compatible with machine model with stock status and ETA
- [ ] GET /api/repair/machines/{id}/notes — Return all internal notes for machine in reverse chronological order
- [ ] POST /api/repair/machines/{id}/notes — Create a new internal note with timestamp
- [ ] POST /api/repair/machines/{id}/photos — Upload photo attachment (multipart/form-data) associated with machine
- [ ] DELETE /api/repair/machines/{id}/photos/{photoId} — Delete a specific photo attachment
- [ ] PATCH /api/repair/machines/{id}/status — Update machine repair state (e.g., "In Progress", "Awaiting Parts", "Completed", "Escalated")
- [ ] POST /api/repair/machines/{id}/parts/request — Submit request for specific part to support technician or hub
- [ ] POST /api/repair/route/optimize — Accept list of `machineIds[]` and constraints, return optimized repair sequence with time estimates

---

## Repair Staff Dashboard — Schedule Page

- [ ] GET /api/repair/schedule — Return all scheduled repair jobs with optional date range filters (`?from=YYYY-MM-DD&to=YYYY-MM-DD`)
- [ ] PATCH /api/repair/schedule/{jobId} — Update job scheduled date/time (for drag-to-reschedule support)
- [ ] POST /api/repair/schedule/{jobId}/start — Mark scheduled job as "In Progress"
- [ ] POST /api/repair/schedule/{jobId}/cancel — Cancel a scheduled repair job
- [ ] GET /api/repair/schedule/overdue — Return all overdue maintenance jobs for technician's region
- [ ] GET /api/repair/schedule/waiting — Return all jobs on hold waiting for parts delivery

---

## Repair Staff Dashboard — Parts & Inventory Page

- [ ] GET /api/repair/parts — Return all parts relevant to technician's region machines, with optional filters (`?machineId=&partName=&partNumber=`)
- [ ] GET /api/repair/parts/orders — Return all open part orders for technician's region with ETA and status
- [ ] PATCH /api/repair/parts/orders/{orderId}/receive — Mark a part order as received/delivered and update inventory

---

## Repair Staff Dashboard — Performance Page

- [ ] GET /api/repair/performance/kpis — Return technician's personal KPIs with optional time range (`?range=week|month|last30`): `{ repairsCompleted, avgRepairTimeMinutes, onTimePct, firstTimeFixPct, downtimePrevented, teamRank }`
- [ ] GET /api/repair/performance/repairs-over-time — Return time-series data for line chart (`?range=week|month|last30`) with `{ date, count }` pairs
- [ ] GET /api/repair/performance/repair-types — Return repair type breakdown for donut chart (`?range=week|month|last30`) with `{ type, count }` pairs
- [ ] GET /api/repair/performance/history — Return last 30 repair records for authenticated technician with full details
- [ ] GET /api/repair/performance/team-ranking — Return technician's rank/percentile compared to peers in assigned region

---

## Authentication & Authorization

- [ ] Ensure `/api/repair/*` endpoints validate `repair_staff` role in JWT/session
- [ ] Ensure repair staff can only access machines in their assigned region(s) and stores
- [ ] Ensure repair staff cannot modify other technicians' notes or repair history

---

---
# Backend TODO — Logistics Manager Dashboard


## Logistics Manager Dashboard — Overview Page

- [ ] GET /api/logistics/manager/me — Return manager profile with `firstName`, `hub`, `region`
- [ ] GET /api/logistics/kpis — Return real-time KPIs: `{ storesAtCritical, deliveriesInTransit, pendingRequests, topTrendingIngredient, topTrendingPct, forecastAccuracyPct }`
- [ ] GET /api/logistics/alerts — Return list of unread alerts with `{ id, severity, message, timestamp, dismissed }` for dismissal support
- [ ] POST /api/logistics/alerts/{id}/dismiss — Mark specific alert as dismissed
- [ ] GET /api/logistics/hub/status — Return hub inventory status: `{ name, inventoryPct, alertCount, activeDeliveries, storesNeedingRestock, ordersPending }`
- [ ] GET /api/logistics/stores/critical — Return top 5 stores needing immediate restock (daysRemaining ≤ 3) with summary info

---

## Logistics Manager Dashboard — Stores Page

- [ ] GET /api/logistics/stores — Return all stores with optional filters (`?region=&health=critical|low|good&search=`) and pagination
- [ ] GET /api/logistics/stores/{id} — Return complete store detail including ingredient levels, forecast data, requests, history
- [ ] GET /api/logistics/stores/{id}/inventory — Return ingredient stock levels and forecast for store
- [ ] GET /api/logistics/stores/{id}/requests — Return supply requests history (pending, approved, in-transit, delivered) for store
- [ ] GET /api/logistics/stores/{id}/forecast — Return supply level forecast data (next 30 days) for chart rendering
- [ ] PATCH /api/logistics/stores/{id}/supply-health — Update manually if supply levels change (for stores with manual data entry)

---

## Logistics Manager Dashboard — Inventory Page

- [ ] GET /api/logistics/inventory — Return all inventory items with current levels, usage, trends, and status with optional filters (`?category=&level=low|medium|high&sort=`)
- [ ] GET /api/logistics/inventory/trends — Return usage trend data (`?timeRange=week|month|30days`) with `{ ingredient, thisPeriod, prevPeriod }`
- [ ] GET /api/logistics/inventory/regional-variation — Return regional consumption patterns (`?timeRange=`) with breakdown by region and ingredient
- [ ] GET /api/logistics/inventory/seasonal-patterns — Return historical seasonal data for chart with `{ month, ingredient, quantity }`
- [ ] GET /api/logistics/inventory/ai-insights — Return AI-generated insights about trends, anomalies, recommendations

---

## Logistics Manager Dashboard — Deliveries Page

- [ ] GET /api/logistics/deliveries — Return all deliveries with optional filters (`?status=in_transit|out_for_delivery|scheduled&from=DATE&to=DATE`)
- [ ] GET /api/logistics/deliveries/{id} — Return complete delivery detail with route, driver, ETA, status
- [ ] PATCH /api/logistics/deliveries/{id}/status — Update delivery status during transit
- [ ] POST /api/logistics/routes/optimize — Accept `{ storeIds[], constraints }`, return optimized delivery sequence with time estimates
- [ ] POST /api/logistics/routes/{routeId}/schedule — Schedule optimized route with `{ date, driverId, notes }`
- [ ] GET /api/logistics/schedules/recurring — Return all active recurring delivery schedules
- [ ] POST /api/logistics/schedules/recurring — Create new recurring schedule with `{ pattern, dayOfWeek, timeWindow, hub, storeIds[], notes }`
- [ ] PATCH /api/logistics/schedules/recurring/{id} — Update existing recurring schedule
- [ ] DELETE /api/logistics/schedules/recurring/{id} — Delete recurring schedule
- [ ] GET /api/logistics/drivers — Return list of available drivers with ID and name for assignment

---

## Logistics Manager Dashboard — Supply Requests Page

- [ ] GET /api/logistics/requests — Return all supply requests with optional filters (`?status=pending|approved|in_transit|delivered&store=&deliveryType=`) and pagination
- [ ] GET /api/logistics/requests/{id} — Return complete request detail including ingredients, approval timeline, notes
- [ ] POST /api/logistics/requests — Create new supply request with `{ toStoreId, ingredients[], deliveryType, sourceStore, notes }`
- [ ] PATCH /api/logistics/requests/{id}/approve — Approve pending request (transitions to approved, queues for delivery)
- [ ] PATCH /api/logistics/requests/{id}/cancel — Cancel request (only valid for pending status)
- [ ] GET /api/logistics/requests/{id}/approval-timeline — Return approval workflow events with status and timestamps
- [ ] GET /api/logistics/inventory/ai-suggested-qty — Return AI-suggested quantities for ingredients based on store usage patterns

---

## Authentication & Authorization

- [ ] Ensure `/api/logistics/*` endpoints validate `logistics_manager` role in JWT/session
- [ ] Ensure logistics managers can only access stores, deliveries, and requests in their assigned hub/region
- [ ] Ensure logistics managers cannot modify other managers' scheduled deliveries or recurring schedules
- [ ] Enforce approval workflows (only hub managers can approve requests, not store-level staff)

---
# Backend TODO — Manager Dashboard


## Manager Dashboard — Overview Page

- [ ] GET /api/manager/me — Return manager profile with `firstName`, `storeName`, `storeLocation`
- [ ] GET /api/manager/alerts — Return list of unread alerts with `{ id, severity, message, timestamp, dismissed }` for dismissal support
- [ ] POST /api/manager/alerts/{id}/dismiss — Mark specific alert as dismissed

---

## Manager Dashboard — Revenue Page

- [ ] GET /api/manager/revenue/kpi — Return KPIs: `{ totalRevenue, delta, inventoryCosts, deltaPositive, totalUsers, activeOrders }`
  - Include comparison vs last month for delta calculation
- [ ] GET /api/manager/revenue/daily-trend — Return 30-day revenue trend for LineChart with `{ date, revenue, costs }`
- [ ] GET /api/manager/revenue/by-category — Return paginated revenue breakdown by category with `{ date, category, items, revenue, vs_last_period }`
  - Support pagination: `?limit=25&offset=0`
  - Support sorting by date, category, revenue

---

## Manager Dashboard — Inventory Page

- [ ] GET /api/manager/inventory — Return all inventory items filtered by category (`?category=syrups|sodas|add_ins`)
  - Return: `{ id, name, level, capacity, pct, daysRemaining, trend, unit }`
  - Support sorting: `?sort=name|stock|urgency`
  - Support filtering: `?filter=all|low|critical`
- [ ] GET /api/manager/inventory/ai-recommendations — Return AI-suggested items to order with `{ item, suggested, unit, supplier, reason }`
- [ ] POST /api/manager/inventory/accept-recommendations — Accept AI recommendations and create supply request
  - Input: array of recommended items with quantities
- [ ] GET /api/manager/coolers — Return cooler status data (feature coming soon)
- [ ] GET /api/manager/stores/nearby — Return nearby store inventory for comparison (feature coming soon)
- [ ] GET /api/manager/supply-hub/inventory — Return supply hub inventory levels (feature coming soon)

---

## Manager Dashboard — Order Stats Page

- [ ] GET /api/manager/orders/kpi — Return order metrics with optional date range (`?days=30|90`)
  - Return: `{ orderVolumeWeek, orderVolumeMonth, fulfillmentTime, satisfactionScore }`
  - Include delta for each metric
- [ ] GET /api/manager/orders/popular-items — Return top 8 items by order volume with optional date range
  - Return: `{ name, orders }`, sorted descending
  - Support: `?days=30|90&limit=8`
- [ ] GET /api/manager/orders/peak-hours — Return hourly order distribution (0-23) with optional date range
  - Return: `{ hour, count }`
  - Support: `?days=30|90`
- [ ] GET /api/manager/orders/peak-days — Return daily order distribution (Mon-Sun) with optional date range
  - Return: `{ day, count }`
  - Support: `?days=30|90`

---

## Manager Dashboard — Supply Requests Page

- [ ] GET /api/manager/store/location — Return read-only store location (used to pre-fill form)
- [ ] GET /api/manager/inventory/ai-suggestions — Return AI-suggested items with default quantities for request form
  - Return: `{ item, suggestedQty, unit }`
- [ ] POST /api/manager/supply-requests — Create new supply request
  - Input: `{ items: [{ itemId, qty, unit }], source: 'hub' | 'nearby_store' }`
  - Return: created request with ID
- [ ] GET /api/manager/supply-requests — Return paginated supply requests with status filtering
  - Support filters: `?status=pending|approved|in_transit|delivered`
  - Support pagination: `?limit=25&offset=0`
  - Return: `{ id, items, qty, submitted, eta, status }`
- [ ] GET /api/manager/supply-requests/history — Return supply movement history with sorting/filtering
  - Support sorting: `?sort=date&order=asc|desc`
  - Support filtering: `?status=all|delivered|in_transit|pending`
  - Support pagination: `?limit=25&offset=0`
  - Return: `{ date, items, qty, source, status }`

---

## Authentication & Authorization

- [ ] Ensure `/api/manager/*` endpoints validate `manager` role in JWT/session
- [ ] Ensure managers can only access their own store's data (not other stores or region-wide data)
- [ ] Enforce store-level scope on all queries via `store_id` from `ManagerProfile.store_registry`

---

## Notes for Backend Implementation

1. **Filters & Pagination**: All list endpoints (revenue, inventory, supply requests) should support pagination (`?limit=25&offset=0`) and sorting
2. **Date Range Support**: Order Stats endpoints should accept optional `?days=30|90` parameter to filter by time range
3. **Store Scoping**: All queries must filter by store_id from authenticated manager's profile (unlike Logistics Manager which is region-scoped)
4. **Real-time Updates**: Consider WebSocket or polling for supply request status changes and alert notifications
5. **Performance**: Cache KPI calculations for 5–10 minutes to reduce DB load
6. **Data Consistency**: Ensure AI recommendations are freshly computed based on current inventory and usage patterns
7. **Error Handling**: Return 400 for invalid filters, 403 for unauthorized access (cross-store), 404 for missing resources

---

## Notes for Backend Implementation

1. **Filters & Pagination**: All list endpoints (stores, inventory, deliveries, requests) should support pagination (`?page=1&limit=25`) and sorting (`?sort=daysRemaining,-status`)
2. **Real-time Data**: Consider WebSocket or Server-Sent Events for real-time delivery status updates and alerts
3. **Hub/Region Scoping**: All queries should be filtered by `assignedHub` from manager's profile to prevent cross-hub data access
4. **Error Handling**: Return 400 for invalid filters, 403 for unauthorized access, 404 for missing resources, 500 for server errors
5. **Performance**: Consider caching store inventory status and KPIs for 5–10 minutes to reduce DB load
6. **Data Consistency**: Supply request submissions should trigger alerts if multiple critical requests from same store, or if ingredient shortages detected across region
7. **Forecast Integration**: AI forecast endpoints should integrate with ML models for supply level predictions (can be stubbed with mock data initially)

---
# Backend TODO — Super Admin Dashboard

## Super Admin Dashboard - Metrics & Data

- [ ] **Last-updated timestamp endpoint** (`GET /backend/super-admin/last-updated/`)
  - Returns: timestamp of last dashboard update
  - Currently shows static "2 min ago"

- [ ] **KPI metrics aggregation endpoint** (`GET /backend/super-admin/kpis/`)
  - Returns: Active Orders, Revenue Today, Inventory Health, Machine Uptime, API Response Time, Network Latency
  - Each with trend data and target values

- [ ] **Regional status data endpoint** (`GET /backend/super-admin/regions/status/`)
  - Returns: per-region data (online/total stores, alerts, revenue)
  - Support filtering by region

- [ ] **Active alerts endpoint** (`GET /backend/super-admin/alerts/`)
  - Returns: severity-sorted alerts with icon and message
  - Support alert dismissal via status update

---

## Super Admin Dashboard - Pages

### Regions & Stores
- [ ] **Store creation API** (`POST /backend/super-admin/stores/`)
  - Input: name, region, status, inventory percentage, revenue
  - Validation and persistence

- [ ] **Store edit API** (`POST /backend/super-admin/stores/<store_id>/edit/`)
  - Update store fields and status

- [ ] **Store list endpoint** with sorting and search
  - Currently paginated in UI, needs backend support

### Supply Hubs
- [ ] **Hub creation API** (`POST /backend/super-admin/hubs/`)
  - Input: name, region, inventory levels, status

- [ ] **Hub edit API** (`POST /backend/super-admin/hubs/<hub_id>/edit/`)
  - Update hub fields

- [ ] **Hub list endpoint** with sorting
  - Currently mock data, needs backend integration

### Regional Visual Map
- [ ] **Regional map data endpoint** (`GET /backend/super-admin/regions/map/`)
  - Returns: geographic/visual layout data for regions

### Real-Time Status & Performance
- [ ] **Real-time status board auto-refresh** (WebSocket or polling)
  - Network health indicator updates

- [ ] **Performance graphs auto-refresh** (WebSocket or polling)
  - 24-hour Network Latency chart data
  - 24-hour Order Volume chart data

---

## Super Admin Dashboard - Configuration

### AI Configuration
- [ ] **AI Configuration save endpoint** (`POST /backend/super-admin/config/ai/`)
  - Persist: Recommendation Engine settings (confidence threshold, suggestion frequency, personalization)
  - Persist: Chatbot settings (response confidence, escalation level, max retries)
  - Persist: Forecasting engine settings (update frequency, prediction threshold, auto-restock toggle)

- [ ] **AI Configuration load endpoint** (`GET /backend/super-admin/config/ai/`)
  - Return saved configuration or defaults

- [ ] **Reset to defaults endpoint** (`POST /backend/super-admin/config/ai/reset/`)
  - Reset all AI settings to defaults

### System Settings & Overrides
- [ ] **Maintenance mode API** (`POST /backend/super-admin/maintenance-mode/`)
  - Enable/disable maintenance mode
  - Persist schedule and broadcast message
  - Delivery of broadcast message to users

- [ ] **System override toggles API** (`POST /backend/super-admin/system-overrides/`)
  - Persist 4 system override toggle states with confirmation

- [ ] **Notification thresholds API** (`POST /backend/super-admin/config/thresholds/`)
  - Persist: latency threshold, inventory threshold, downtime threshold (as sliders)

- [ ] **Backup & recovery API** (`GET/POST /backend/super-admin/backup/`)
  - Track last backup time
  - Configure backup frequency
  - Configure retention policy
  - Trigger backup/restore actions

---

## Super Admin Dashboard - Management

### User Management
- [ ] **User role dropdown update** (`POST /backend/super-admin/users/<user_id>/role/`)
  - Update user role assignment

- [ ] **User region assignment** (`POST /backend/super-admin/users/<user_id>/region/`)
  - Assign user to region(s)

- [ ] **User status toggle** (`POST /backend/super-admin/users/<user_id>/status/`)
  - Enable/disable user from status toggle

- [ ] **Bulk user actions API**
  - Bulk role assignment
  - Bulk region assignment
  - Bulk status changes

### Role Management
- [ ] **Role CRUD endpoints** (`GET/POST/PUT/DELETE /backend/super-admin/roles/`)
  - Manage 5 predefined roles with permission checklists
  - Enable editing of permission assignments

---

## Super Admin Dashboard - Reports & Export

- [ ] **Report data endpoints** (`GET /backend/super-admin/reports/`)
  - Revenue data aggregation
  - Orders data aggregation
  - Inventory data aggregation
  - Machine uptime data aggregation

- [ ] **CSV export endpoint** (`POST /backend/super-admin/reports/export/csv/`)
  - Export report data to CSV format

- [ ] **PDF export endpoint** (`POST /backend/super-admin/reports/export/pdf/`)
  - Export report data to PDF format

---

## Super Admin Dashboard - Audit & System

### Audit Logs
- [ ] **Audit logs retrieval endpoint** (`GET /backend/super-admin/audit-logs/`)
  - Returns: Who, What, When, Where, Result columns
  - Support date range filtering
  - Support sorting

- [ ] **Audit logs export endpoint** (`POST /backend/super-admin/audit-logs/export/`)
  - Export audit logs to CSV/PDF

### System Health
- [ ] **System health checks endpoint** (`GET /backend/super-admin/health/`)
  - Database status
  - Cache status
  - Queue status
  - External services status

- [ ] **System health monitoring**
  - Real-time or periodic health status updates
