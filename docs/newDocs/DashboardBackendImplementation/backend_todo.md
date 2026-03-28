# Backend TODO — Repair Staff Dashboard

All items below represent UI-complete features with mock data. No backend endpoints currently exist for any of the following tasks. This document is organized by dashboard page, split into simple, actionable tasks.

---

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
