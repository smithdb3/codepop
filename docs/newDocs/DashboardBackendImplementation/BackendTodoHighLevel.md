# Backend TODO — High Level (by Priority)

Tasks ordered by priority. P1 = minimum functioning dashboard. P4 = optional/nice-to-have.

---

# Admin Dashboard

## P1 — Dashboard Loads with Real Data
1. Lock down all admin pages so only admin/super_admin roles can access them.
2. Set up the audit log database model so user actions can be recorded.
3. Hook up the Users table to show real user data (status, location, last login).
4. Hook up the KPI cards at the top of the dashboard (total users, active users, managers, etc.).
5. Hook up the Roles list to show real roles and their permission counts.
6. Hook up the Permissions list so roles can be assigned real permissions.

## P2 — Core Actions Work
7. Hook up the Disable User button.
8. Hook up the Enable User button.
9. Hook up the Role detail view to show full permission list and assigned users.
10. Hook up the Create Role form.
11. Hook up the Edit Role form (block editing built-in roles).
12. Hook up the Delete Role button (block if users are still assigned to it).
13. Hook up the Add Permission to Role toggle.
14. Hook up the Remove Permission from Role toggle.
15. Hook up the Audit Log table to show real log entries (paginated, filterable by date/action/actor).
16. Hook up the Delete User button (soft delete to preserve audit history).
17. Hook up the Add User form.
18. Hook up the Promote to Manager form.

## P3 — Secondary Features
19. Hook up Bulk Disable for selected users.
20. Hook up Bulk Reset Passwords for selected users.
21. Hook up Bulk Export (CSV) for selected users.
22. Hook up Export Audit Logs button (CSV).
23. Add status filter to the Users table.

## P4 — Optional
24. Advanced user search and filter optimizations.
25. Cache KPI data for performance.

---

# Repair Staff Dashboard

## P1 — Dashboard Loads with Real Data
1. Lock down all repair pages so only `repair_staff` role can access them.
2. Hook up the technician profile (name, region, assigned stores) shown in the header/sidebar.
3. Hook up the KPI cards (machines down, repairs today, parts pending, revenue impact).
4. Hook up the Today's Schedule section on the overview.
5. Hook up the Alerts panel to show real unread alerts.
6. Hook up the Region Summary section (store count, machine statuses, parts pending).

## P2 — Core Actions Work
7. Hook up the Dismiss Alert button.
8. Hook up the Machines list to show real machines in the technician's region.
9. Hook up the Machine Detail view (install date, warranty, repair state, completion estimate).
10. Hook up the Repair History tab on a machine (last 10 repairs).
11. Hook up the Compatible Parts tab on a machine (with stock status and ETA).
12. Hook up the Notes tab on a machine to show existing notes.
13. Hook up the Add Note form on a machine.
14. Hook up the Update Repair Status dropdown (In Progress, Awaiting Parts, Completed, Escalated).
15. Hook up the Request Part button on a machine.
16. Hook up the full Schedule page (all upcoming jobs, date range filter).
17. Hook up the Start Job button on a scheduled job.
18. Hook up the Overdue Jobs section.
19. Hook up the Waiting on Parts section.

## P3 — Secondary Features
20. Hook up photo uploads on a machine.
21. Hook up photo deletion on a machine.
22. Hook up drag-to-reschedule on the Schedule page.
23. Hook up the Cancel Job button.
24. Hook up the Parts Inventory list (with filters for machine, part name, part number).
25. Hook up the Open Part Orders list.
26. Hook up the Mark Part as Received button on a part order.

## P4 — Optional
27. Hook up the Optimize Repair Route button (AI-generated repair sequence).
28. Hook up the Performance page KPIs (repairs completed, avg time, on-time %, team rank).
29. Hook up the Repairs Over Time chart on the Performance page.
30. Hook up the Repair Types donut chart on the Performance page.
31. Hook up the Repair History table on the Performance page.
32. Hook up the Team Ranking section on the Performance page.

---

# Logistics Manager Dashboard

## P1 — Dashboard Loads with Real Data
1. Lock down all logistics pages so only `logistics_manager` role can access them.
2. Hook up the manager profile (name, hub, region) shown in the header/sidebar.
3. Hook up the KPI cards (stores at critical, deliveries in transit, pending requests, trending ingredient, forecast accuracy).
4. Hook up the Alerts panel to show real unread alerts.
5. Hook up the Hub Status section (inventory %, active deliveries, stores needing restock, pending orders).
6. Hook up the Critical Stores list (top 5 stores with ≤3 days remaining).

## P2 — Core Actions Work
7. Hook up the Dismiss Alert button.
8. Hook up the Stores list with search and health filters (critical/low/good).
9. Hook up the Store Detail view (inventory, forecast, requests, history).
10. Hook up the Store Inventory tab.
11. Hook up the Store Supply Requests tab.
12. Hook up the Store Forecast chart.
13. Hook up the Deliveries list with status and date range filters.
14. Hook up the Delivery Detail view (route, driver, ETA, status).
15. Hook up the Update Delivery Status button.
16. Hook up the Supply Requests list with status/store/type filters and pagination.
17. Hook up the Request Detail view (ingredients, approval timeline, notes).
18. Hook up the Create Supply Request form.
19. Hook up the Approve Request button.
20. Hook up the Cancel Request button.
21. Hook up the Request Approval Timeline view.

## P3 — Secondary Features
22. Hook up the Inventory list (all hub inventory with category/level/sort filters).
23. Hook up the Inventory Usage Trends chart (week/month/30-day view).
24. Hook up the Recurring Schedules list.
25. Hook up the Schedule a Delivery Route form (driver, date, notes).
26. Hook up the Drivers dropdown for delivery assignment.
27. Hook up manual supply level update for stores with manual data entry.

## P4 — Optional
28. Hook up the Regional Consumption Patterns chart.
29. Hook up the Seasonal Patterns chart.
30. Hook up the AI Insights panel on the Inventory page.
31. Hook up the Optimize Delivery Route button.
32. Hook up the Create Recurring Schedule form.
33. Hook up Edit and Delete on recurring schedules.
34. Hook up AI-suggested quantities on the Supply Request form.

---

# Manager Dashboard

## P1 — Dashboard Loads with Real Data
1. Lock down all manager pages so only `manager` role can access them.
2. Hook up the manager profile (name, store name, store location) shown in the header/sidebar.
3. Hook up the Alerts panel to show real unread alerts.
4. Hook up the Revenue KPI cards (total revenue, inventory costs, active users, active orders).
5. Hook up the Inventory list filtered by category (syrups, sodas, add-ins) with real stock levels and days remaining.
6. Hook up the Order Stats KPI cards (order volume, fulfillment time, satisfaction score).
7. Hook up the store location field on the Supply Request form (read-only pre-fill).

## P2 — Core Actions Work
8. Hook up the Dismiss Alert button.
9. Hook up the 30-day Revenue Trend chart.
10. Hook up the Top Items by Order Volume chart.
11. Hook up the Peak Hours chart.
12. Hook up the Peak Days chart.
13. Hook up the Revenue by Category table (with pagination and sort).
14. Hook up the Create Supply Request form.
15. Hook up the Supply Requests list (with status filter and pagination).
16. Hook up the Supply Movement History table (with sort, filter, pagination).

## P3 — Secondary Features
17. Hook up the AI Recommendations panel on the Inventory page.
18. Hook up the Accept AI Recommendations button (auto-creates supply request).
19. Hook up AI-suggested quantities on the Supply Request form.
20. Add stock/urgency sort options to the Inventory list.
21. Add critical/low/all filter to the Inventory list.

## P4 — Optional
22. Hook up the Cooler Status section (feature coming soon).
23. Hook up the Nearby Store Comparison panel (feature coming soon).
24. Hook up the Supply Hub Inventory panel (feature coming soon).

---

# Super Admin Dashboard

## P1 — Dashboard Loads with Real Data
1. Hook up Role management so roles and permissions reflect real data.
2. Hook up the "Last Updated" timestamp on the dashboard header.
3. Hook up the KPI cards (active orders, revenue today, inventory health, machine uptime, API response time, network latency).
4. Hook up the Regional Status section (online stores, alerts, revenue per region).
5. Hook up the Alerts panel to show real severity-sorted alerts.
6. Hook up the System Health panel (database, cache, queue, external services status).

## P2 — Core Actions Work
7. Hook up the Dismiss Alert button.
8. Hook up the Create Store form.
9. Hook up the Edit Store form.
10. Hook up the Stores list with search, sort, and pagination.
11. Hook up the Create Supply Hub form.
12. Hook up the Edit Supply Hub form.
13. Hook up the Hubs list with sort and pagination.
14. Hook up the Audit Logs table (Who, What, When, Where, Result with date range filter and sort).
15. Hook up the user Role dropdown in User Management.
16. Hook up the user Region assignment in User Management.
17. Hook up the user Enable/Disable toggle in User Management.

## P3 — Secondary Features
18. Hook up the Regional Map view.
19. Hook up the AI Configuration load/save forms (Recommendation Engine, Chatbot, Forecasting).
20. Hook up the Reports page to show real aggregated data (revenue, orders, inventory, machine uptime).
21. Hook up the Maintenance Mode toggle (with broadcast message and schedule).
22. Hook up the System Override toggles.
23. Hook up the Notification Threshold sliders (latency, inventory, downtime).
24. Hook up the Backup & Recovery section (last backup time, configure frequency/retention, trigger backup).
25. Hook up Bulk Role Assignment for users.
26. Hook up Bulk Region Assignment for users.
27. Hook up Bulk Status Changes for users.

## P4 — Optional
28. Hook up the Reset AI Config to Defaults button.
29. Hook up Export Audit Logs button (CSV/PDF).
30. Hook up Export Reports button (CSV and PDF).
31. Real-time auto-refresh for the Status Board (network health indicator).
32. Real-time auto-refresh for Performance charts (24hr latency and order volume).
33. System health monitoring with live updates.
