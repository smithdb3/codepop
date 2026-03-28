# Backend Implementation Priorities

All items below represent UI-complete features with mock data. Tasks are ordered by priority to ensure minimum functioning dashboards as soon as possible.

---

# Backend TODO — Admin Dashboard

## Priority 1 (MVP — Core)
1. Verify admin/super_admin role checks on all endpoints (`ProtectedRoute` middleware)
2. Create user audit log model with fields: timestamp, actor, actorRole, action, target, status, details (`UserAuditLog`)
3. Get all users endpoint extending existing route (`GET /backend/users/`) with status field, location/region, lastLogin
4. Aggregate KPI data endpoint (`GET /backend/admin/kpis/`) returning totalUsers, activeUsers, disabledAccounts, totalManagers, customRoles, recentAuditEvents with trend % and targets
5. Get all roles endpoint (`GET /backend/admin/roles/`) returning role name, permission count, active user count, isBuiltIn flag
6. Get all permissions endpoint (`GET /backend/admin/permissions/`) returning permission ID, label, category

## Priority 2 (Core Actions)
7. Disable user endpoint (`POST /backend/users/<user_id>/disable/`) setting is_active = False
8. Enable user endpoint (`POST /backend/users/<user_id>/enable/`) setting is_active = True
9. Get role details endpoint (`GET /backend/admin/roles/<role_id>/`) returning role name, full permission list, user assignments
10. Create custom role endpoint (`POST /backend/admin/roles/`) with role name and permission IDs array
11. Edit role endpoint (`POST /backend/admin/roles/<role_id>/edit/`) updating name and permissions (prevent built-in role edits)
12. Delete custom role endpoint (`DELETE /backend/admin/roles/<role_id>/`) only if no users assigned
13. Assign permission to role endpoint (`POST /backend/admin/roles/<role_id>/permissions/<perm_id>/`)
14. Revoke permission from role endpoint (`DELETE /backend/admin/roles/<role_id>/permissions/<perm_id>/`)
15. Get audit logs endpoint (`GET /backend/admin/audit-logs/`) with pagination (50 per page), filtering by date range/action type/actor
16. Delete user endpoint (`DELETE /backend/users/delete/<user_id>/`) with soft-delete logic to preserve audit trail
17. Create user endpoint using existing `POST /backend/auth/register/` with name, email, role, region, password
18. Promote user to manager endpoint (`POST /backend/users/<user_id>/promote-to-manager/`) with region(s) and store(s) assignment

## Priority 3 (Secondary Features)
19. Bulk disable users endpoint (`POST /backend/users/bulk-disable/`) with array of user IDs, returns success/failed counts
20. Bulk reset passwords endpoint (`POST /backend/users/bulk-reset-password/`) returning array of temporary passwords or confirmation
21. Bulk export users endpoint (`POST /backend/users/bulk-export/`) exporting to CSV file stream
22. Export audit logs to CSV endpoint (`POST /backend/admin/audit-logs/export/`) with date range and filter criteria
23. Support status filtering on `GET /backend/users/` endpoint

## Priority 4 (Advanced/Optional)
24. Advanced filtering and search optimizations for user queries
25. Audit log caching for performance optimization

### Logging Hooks (Priority 2 & 3)
- Log user creation when `POST /backend/auth/register/` called (P2)
- Log user edits when endpoints called (P2)
- Log user deletion when endpoint called (P2)
- Log user enable/disable actions (P2)
- Log manager promotion (P2)
- Log role CRUD operations (P2)
- Log permission assignments (P2)
- Log password resets (P2)
- Log failed actions with status=failed (P2)

---

# Backend TODO — Repair Staff Dashboard

## Priority 1 (MVP — Core)
1. Ensure `/api/repair/*` endpoints validate `repair_staff` role in JWT/session
2. Get technician profile endpoint (`GET /api/repair/technician/me`) returning firstName, lastName, region, assignedStoreIds[]
3. Get daily KPI endpoint (`GET /api/repair/kpis`) returning machinesDown, repairsToday, partsPending, revenueImpactPerHour
4. Get technician's schedule for today (`GET /api/repair/schedule/today`) returning list of jobs scheduled for authenticated technician
5. Get unread alerts endpoint (`GET /api/repair/alerts`) with id, severity, message, timestamp, dismissed
6. Get region summary endpoint (`GET /api/repair/region/summary`) returning region, storeCount, machineCount, operational, degraded, critical, partsPending

## Priority 2 (Core Actions)
7. Dismiss alert endpoint (`POST /api/repair/alerts/{id}/dismiss`) marking alert as dismissed
8. Get all machines in technician's region (`GET /api/repair/machines`) with full details including status, downtime, priority, revenue impact
9. Get complete machine detail (`GET /api/repair/machines/{id}`) including installDate, warranty, repairState, estimatedCompletion, lastNote
10. Get last 10 repair records for machine (`GET /api/repair/machines/{id}/history`) with date, technician, issueType, duration, outcome, diagnosis, stepsText, partsReplaced[]
11. Get compatible parts for machine (`GET /api/repair/machines/{id}/parts`) with stock status and ETA
12. Get all internal notes for machine (`GET /api/repair/machines/{id}/notes`) in reverse chronological order
13. Create new internal note (`POST /api/repair/machines/{id}/notes`) with timestamp
14. Update machine repair state (`PATCH /api/repair/machines/{id}/status`) changing state to "In Progress", "Awaiting Parts", "Completed", "Escalated"
15. Request specific part (`POST /api/repair/machines/{id}/parts/request`) submitting request to support technician or hub
16. Get all scheduled repair jobs (`GET /api/repair/schedule`) with optional date range filters (from/to parameters)
17. Mark scheduled job as started (`POST /api/repair/schedule/{jobId}/start`) marking as "In Progress"
18. Get overdue maintenance jobs (`GET /api/repair/schedule/overdue`) for technician's region
19. Get jobs waiting for parts (`GET /api/repair/schedule/waiting`) for technician's region

## Priority 3 (Secondary Features)
20. Upload photo attachment (`POST /api/repair/machines/{id}/photos`) with multipart/form-data
21. Delete photo attachment (`DELETE /api/repair/machines/{id}/photos/{photoId}`)
22. Update job scheduled date/time (`PATCH /api/repair/schedule/{jobId}`) for drag-to-reschedule support
23. Cancel scheduled repair job (`POST /api/repair/schedule/{jobId}/cancel`)
24. Get all parts relevant to technician's region (`GET /api/repair/parts`) with optional filters (machineId, partName, partNumber)
25. Get all open part orders (`GET /api/repair/parts/orders`) with ETA and status
26. Mark part order as received (`PATCH /api/repair/parts/orders/{orderId}/receive`) and update inventory

## Priority 4 (Advanced/Optional)
27. Optimize repair sequence endpoint (`POST /api/repair/route/optimize`) accepting machineIds[] and constraints, returning optimized sequence with time estimates
28. Technician's personal KPI endpoint (`GET /api/repair/performance/kpis`) with optional time range returning repairsCompleted, avgRepairTimeMinutes, onTimePct, firstTimeFixPct, downtimePrevented, teamRank
29. Time-series data for repairs over time (`GET /api/repair/performance/repairs-over-time`) with optional range parameter
30. Repair type breakdown for donut chart (`GET /api/repair/performance/repair-types`) with type and count pairs
31. Last 30 repair records for technician (`GET /api/repair/performance/history`) with full details
32. Technician's rank/percentile vs peers (`GET /api/repair/performance/team-ranking`) in assigned region

## Authorization Notes
- Ensure repair staff can only access machines in their assigned region(s) and stores
- Ensure repair staff cannot modify other technicians' notes or repair history

---

# Backend TODO — Logistics Manager Dashboard

## Priority 1 (MVP — Core)
1. Ensure `/api/logistics/*` endpoints validate `logistics_manager` role in JWT/session
2. Get manager profile endpoint (`GET /api/logistics/manager/me`) returning firstName, hub, region
3. Get real-time KPI endpoint (`GET /api/logistics/kpis`) returning storesAtCritical, deliveriesInTransit, pendingRequests, topTrendingIngredient, topTrendingPct, forecastAccuracyPct
4. Get unread alerts endpoint (`GET /api/logistics/alerts`) with id, severity, message, timestamp, dismissed
5. Get hub inventory status endpoint (`GET /api/logistics/hub/status`) returning name, inventoryPct, alertCount, activeDeliveries, storesNeedingRestock, ordersPending
6. Get top 5 stores needing immediate restock (`GET /api/logistics/stores/critical`) with daysRemaining ≤ 3 and summary info

## Priority 2 (Core Actions)
7. Dismiss alert endpoint (`POST /api/logistics/alerts/{id}/dismiss`) marking alert as dismissed
8. Get all stores endpoint (`GET /api/logistics/stores`) with optional region/health/search filters and pagination
9. Get complete store detail (`GET /api/logistics/stores/{id}`) including ingredient levels, forecast data, requests, history
10. Get ingredient stock levels and forecast (`GET /api/logistics/stores/{id}/inventory`) for store
11. Get supply requests history for store (`GET /api/logistics/stores/{id}/requests`) (pending, approved, in-transit, delivered)
12. Get supply level forecast data (`GET /api/logistics/stores/{id}/forecast`) for next 30 days for chart rendering
13. Get all deliveries endpoint (`GET /api/logistics/deliveries`) with optional status/date range filters (in_transit, out_for_delivery, scheduled)
14. Get complete delivery detail (`GET /api/logistics/deliveries/{id}`) with route, driver, ETA, status
15. Update delivery status during transit (`PATCH /api/logistics/deliveries/{id}/status`)
16. Get all supply requests endpoint (`GET /api/logistics/requests`) with optional status/store/deliveryType filters and pagination
17. Get complete request detail (`GET /api/logistics/requests/{id}`) including ingredients, approval timeline, notes
18. Create new supply request endpoint (`POST /api/logistics/requests`) with toStoreId, ingredients[], deliveryType, sourceStore, notes
19. Approve pending request (`PATCH /api/logistics/requests/{id}/approve`) transitioning to approved, queuing for delivery
20. Cancel request endpoint (`PATCH /api/logistics/requests/{id}/cancel`) only valid for pending status
21. Get request approval workflow events (`GET /api/logistics/requests/{id}/approval-timeline`) with status and timestamps

## Priority 3 (Secondary Features)
22. Get all inventory items endpoint (`GET /api/logistics/inventory`) with current levels, usage, trends, status with optional filters (category, level, sort)
23. Get usage trend data (`GET /api/logistics/inventory/trends`) with optional timeRange returning ingredient, thisPeriod, prevPeriod
24. Get all active recurring delivery schedules (`GET /api/logistics/schedules/recurring`)
25. Schedule optimized route endpoint (`POST /api/logistics/routes/{routeId}/schedule`) with date, driverId, notes
26. Get available drivers list (`GET /api/logistics/drivers`) returning ID and name for assignment
27. Update manually entered supply levels (`PATCH /api/logistics/stores/{id}/supply-health`) for stores with manual data entry
28. Get request approval workflow events (`GET /api/logistics/requests/{id}/approval-timeline`)

## Priority 4 (Advanced/Optional)
29. Get regional consumption patterns (`GET /api/logistics/inventory/regional-variation`) with optional timeRange breakdown by region and ingredient
30. Get historical seasonal data for chart (`GET /api/logistics/inventory/seasonal-patterns`) with month, ingredient, quantity
31. Get AI-generated insights (`GET /api/logistics/inventory/ai-insights`) about trends, anomalies, recommendations
32. Optimize delivery sequence endpoint (`POST /api/logistics/routes/optimize`) accepting storeIds[] and constraints, returning optimized sequence with time estimates
33. Create recurring schedule endpoint (`POST /api/logistics/schedules/recurring`) with pattern, dayOfWeek, timeWindow, hub, storeIds[], notes
34. Update recurring schedule endpoint (`PATCH /api/logistics/schedules/recurring/{id}`)
35. Delete recurring schedule endpoint (`DELETE /api/logistics/schedules/recurring/{id}`)
36. Get AI-suggested quantities endpoint (`GET /api/logistics/inventory/ai-suggested-qty`) based on store usage patterns

## Authorization Notes
- Ensure logistics managers can only access stores, deliveries, requests in their assigned hub/region
- Ensure logistics managers cannot modify other managers' scheduled deliveries or recurring schedules
- Enforce approval workflows (only hub managers can approve, not store-level staff)

---

# Backend TODO — Manager Dashboard

## Priority 1 (MVP — Core)
1. Ensure `/api/manager/*` endpoints validate `manager` role in JWT/session
2. Get manager profile endpoint (`GET /api/manager/me`) returning firstName, storeName, storeLocation
3. Get unread alerts endpoint (`GET /api/manager/alerts`) with id, severity, message, timestamp, dismissed
4. Get revenue KPI endpoint (`GET /api/manager/revenue/kpi`) returning totalRevenue, delta, inventoryCosts, deltaPositive, totalUsers, activeOrders with month-over-month comparison
5. Get all inventory items endpoint (`GET /api/manager/inventory`) filtered by category (syrups, sodas, add_ins) returning id, name, level, capacity, pct, daysRemaining, trend, unit
6. Get order metrics endpoint (`GET /api/manager/orders/kpi`) with optional date range (days=30|90) returning orderVolumeWeek, orderVolumeMonth, fulfillmentTime, satisfactionScore with deltas
7. Get store location endpoint (`GET /api/manager/store/location`) for read-only store location reference

## Priority 2 (Core Actions)
8. Dismiss alert endpoint (`POST /api/manager/alerts/{id}/dismiss`) marking alert as dismissed
9. Get 30-day revenue trend endpoint (`GET /api/manager/revenue/daily-trend`) returning date, revenue, costs for LineChart
10. Get top 8 items by order volume (`GET /api/manager/orders/popular-items`) with optional date range returning name, orders sorted descending
11. Get hourly order distribution (`GET /api/manager/orders/peak-hours`) with optional date range returning hour (0-23), count
12. Get daily order distribution (`GET /api/manager/orders/peak-days`) with optional date range returning day (Mon-Sun), count
13. Get paginated revenue breakdown by category (`GET /api/manager/revenue/by-category`) with date, category, items, revenue, vs_last_period supporting pagination and sorting
14. Create new supply request endpoint (`POST /api/manager/supply-requests`) with items (itemId, qty, unit), source (hub | nearby_store)
15. Get paginated supply requests endpoint (`GET /api/manager/supply-requests`) with status filtering (pending, approved, in_transit, delivered) returning id, items, qty, submitted, eta, status
16. Get supply movement history endpoint (`GET /api/manager/supply-requests/history`) with sorting, filtering, pagination returning date, items, qty, source, status

## Priority 3 (Secondary Features)
17. Get AI-recommended items to order (`GET /api/manager/inventory/ai-recommendations`) returning item, suggested, unit, supplier, reason
18. Accept AI recommendations endpoint (`POST /api/manager/inventory/accept-recommendations`) creating supply request with recommended items
19. Get AI-suggested items with default quantities (`GET /api/manager/inventory/ai-suggestions`) for request form
20. Support sorting on inventory endpoint (`?sort=name|stock|urgency`)
21. Support filtering on inventory endpoint (`?filter=all|low|critical`)

## Priority 4 (Advanced/Optional)
22. Get cooler status data endpoint (`GET /api/manager/coolers`) (feature coming soon)
23. Get nearby store inventory for comparison (`GET /api/manager/stores/nearby`) (feature coming soon)
24. Get supply hub inventory levels endpoint (`GET /api/manager/supply-hub/inventory`) (feature coming soon)

## Authorization Notes
- Ensure managers can only access their own store's data (not other stores or region-wide data)
- Enforce store-level scope on all queries via store_id from ManagerProfile.store_registry

---

# Backend TODO — Super Admin Dashboard

## Priority 1 (MVP — Core)
1. Create role CRUD endpoints (`GET/POST/PUT/DELETE /backend/super-admin/roles/`) managing predefined roles with permission checklists
2. Get last-updated timestamp endpoint (`GET /backend/super-admin/last-updated/`) returning timestamp of last dashboard update
3. Get KPI metrics aggregation endpoint (`GET /backend/super-admin/kpis/`) returning Active Orders, Revenue Today, Inventory Health, Machine Uptime, API Response Time, Network Latency with trend data and targets
4. Get regional status data endpoint (`GET /backend/super-admin/regions/status/`) returning per-region data (online/total stores, alerts, revenue) with region filtering support
5. Get active alerts endpoint (`GET /backend/super-admin/alerts/`) returning severity-sorted alerts with icon and message
6. Get system health checks endpoint (`GET /backend/super-admin/health/`) returning database, cache, queue, external services status

## Priority 2 (Core Actions)
7. Dismiss alert endpoint (`POST /backend/super-admin/alerts/{id}`) updating alert status for dismissal
8. Create store endpoint (`POST /backend/super-admin/stores/`) with name, region, status, inventory percentage, revenue
9. Edit store endpoint (`POST /backend/super-admin/stores/<store_id>/edit/`) updating store fields and status
10. Get store list endpoint with sorting and search (`GET /backend/super-admin/stores/`) with pagination support
11. Create supply hub endpoint (`POST /backend/super-admin/hubs/`) with name, region, inventory levels, status
12. Edit hub endpoint (`POST /backend/super-admin/hubs/<hub_id>/edit/`) updating hub fields
13. Get hub list endpoint with sorting (`GET /backend/super-admin/hubs/`) with pagination support
14. Get audit logs retrieval endpoint (`GET /backend/super-admin/audit-logs/`) returning Who, What, When, Where, Result columns with date range filtering and sorting
15. Update user role assignment endpoint (`POST /backend/super-admin/users/<user_id>/role/`)
16. Assign user to region(s) endpoint (`POST /backend/super-admin/users/<user_id>/region/`)
17. Enable/disable user status toggle endpoint (`POST /backend/super-admin/users/<user_id>/status/`)

## Priority 3 (Secondary Features)
18. Get regional map data endpoint (`GET /backend/super-admin/regions/map/`) returning geographic/visual layout data for regions
19. AI Configuration load endpoint (`GET /backend/super-admin/config/ai/`) returning saved configuration or defaults
20. AI Configuration save endpoint (`POST /backend/super-admin/config/ai/`) persisting Recommendation Engine, Chatbot, Forecasting engine settings
21. Get report data endpoints (`GET /backend/super-admin/reports/`) aggregating Revenue, Orders, Inventory, Machine uptime data
22. Enable/disable maintenance mode endpoint (`POST /backend/super-admin/maintenance-mode/`) with schedule and broadcast message
23. Set system override toggles endpoint (`POST /backend/super-admin/system-overrides/`) persisting 4 override states with confirmation
24. Set notification thresholds endpoint (`POST /backend/super-admin/config/thresholds/`) for latency, inventory, downtime
25. Backup & recovery tracking endpoint (`GET/POST /backend/super-admin/backup/`) tracking last backup, configuring frequency/retention, triggering actions
26. Bulk user role assignment endpoint for bulk actions
27. Bulk user region assignment endpoint for bulk actions
28. Bulk user status changes endpoint for bulk actions

## Priority 4 (Advanced/Optional)
29. Reset AI configuration to defaults endpoint (`POST /backend/super-admin/config/ai/reset/`)
30. Export audit logs endpoint (`POST /backend/super-admin/audit-logs/export/`) in CSV/PDF format
31. CSV export endpoint for reports (`POST /backend/super-admin/reports/export/csv/`)
32. PDF export endpoint for reports (`POST /backend/super-admin/reports/export/pdf/`)
33. Real-time status board auto-refresh (WebSocket or polling) for network health indicator
34. Performance graphs auto-refresh (WebSocket or polling) for 24-hour charts (Network Latency, Order Volume)
35. System health monitoring with real-time or periodic updates

---

# Implementation Notes

## General Guidelines
1. **Filters & Pagination**: All list endpoints should support pagination (`?limit=25&offset=0` or `?page=1&limit=25`) and sorting
2. **Date Range Support**: Endpoints accepting date ranges should use `?from=YYYY-MM-DD&to=YYYY-MM-DD` or `?days=30|90` parameters
3. **Scoping**: Ensure all queries are filtered by authenticated user's scope (store_id, hub, region, assigned stores)
4. **Error Handling**: Return 400 for invalid filters, 403 for unauthorized access, 404 for missing resources, 500 for server errors
5. **Performance**: Cache KPI calculations for 5-10 minutes, consider WebSocket/Server-Sent Events for real-time updates
6. **Data Consistency**: Ensure audit logging is comprehensive and consistent across all user-modifying actions
7. **Role Authorization**: All endpoints must validate appropriate role (admin, repair_staff, logistics_manager, manager, super_admin)
