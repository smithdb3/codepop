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

## Notes for Backend Implementation

1. **Filters & Pagination**: All list endpoints (machines, schedule, parts) should support pagination (`?page=1&limit=25`) and sorting (`?sort=status,-priority`)
2. **Real-time Data**: Consider WebSocket or Server-Sent Events for real-time alert updates if technicians are in the field
3. **Region Scoping**: All queries should be filtered by `assignedRegion` from technician's profile to prevent cross-region data access
4. **Error Handling**: Return 400 for invalid filters, 403 for unauthorized access, 404 for missing resources, 500 for server errors
5. **Performance**: Consider caching region summaries and KPIs for 5–10 minutes to reduce DB load
6. **Data Consistency**: Machine status updates should trigger alerts if critical thresholds are crossed (e.g., downtime > 2 hours)
