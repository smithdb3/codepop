-=-=-=-=-=-=-=-=-=-=-=-=-=-
Make this whole page according to UI guidelines in guidelines/UI_GUIDELINES.md

# Super Admin Dashboard

## 1. Global Navigation & Context
- **Top Bar:** CodePop Logo, Admin Name, Logout, System Status (Operational/Issue).
- **Region Selector:** 7-Region Dropdown (Chicago, NJ, Logan, Dallas, Phoenix, Atlanta, Seattle).
- **Sidebar:** Navigation to Dashboard, User Mgmt, AI Config, Audit Logs, and System Settings.

## 2. Real-Time Monitoring (The "Pulse")
- **Metrics Cards:** - Active Orders (with % trend)
  - Revenue Today (vs Target)
  - Inventory Health (85% threshold)
  - Machine Uptime (98.5% avg)
- **Alerts Panel:** - Severity: 🔴 Critical | 🟡 Warning | 🟢 Info
  - Actions: [Acknowledge] [View Details]
- **System Health:** Database, Cache (Redis), and Queue (Celery) status indicators.

## 3. AI & System Configuration
- **AI Controls:** - Confidence Threshold (0.5 - 0.95 slider)
  - Forecasting Frequency (1h, 6h, Daily)
  - Auto-Restock Toggle
- **Emergency Overrides:** - Maintenance Mode (Global)
  - Rate Limiter Override
  - Manual Geolocation Toggle

## 4. Administrative Tools
- **User Management:** Role-based access (Super Admin, Logistics, Repair).
- **Audit Logs:** Full history of actions (User, Action, Timestamp, Result).
- **Store Management:** Create/Edit stores, assign to Regions/Hubs.

## 5. Technical Constraints
- **Refresh Rate:** 30-second polling or WebSocket updates.
- **Safety:** All "Override" or "Delete" actions require a confirmation modal.
- **Search:** Global search must support Store Name, Hub ID, and User Email.

-=-=-=-=-=-=-=-=-=-=-=-=-=-
Make this whole page according to UI guidelines in guidelines/UI_GUIDELINES.md

**(M) Super Admin Dashboard**

Global Navigation Panel
* (M) Header/Top Bar
  * CodePop Logo
  * "Super Admin Dashboard" title
  * (S) Current user: "Admin Name" with logout
  * (S) System status indicator: "All Systems Operational" (green/red)
  * (C) Time last updated: "Updated 2 min ago" *(BACKEND NOT IMPLEMENTED)*
* (M) Region Selector (Dropdown/Tabs) - this is for "Regions & Stores" and "Supply Hubs" pages
  * 7 regional options: Chicago, New Jersey, Logan, Dallas, Phoenix, Atlanta, Seattle
  * (C) Visual: Map with region highlights *(BACKEND NOT IMPLEMENTED)*
  * Shows stores/hubs in selected region *(BACKEND NOT IMPLEMENTED)*
* (M) Navigation Sidebar/Menu
  * Dashboard (home) 
  * Regions & Stores
  * Supply Hubs
  * User Management
  * AI Configuration
  * Reports & Analytics
  * Audit Logs
  * System Settings
  * Help & Documentation
* (M) Store/Hub Data Views
  * Searchable store list (search by name, location) 
  * Filterable by: Region, Status (Online/Offline), Issue Level
  * Quick stats per store: *(BACKEND NOT IMPLEMENTED)*
    - Store name & location
    - Current status (green/red/yellow)
    - Active orders count
    - Current inventory %
    - Machine status summary
    - Revenue this month
    - Last health check timestamp
  * Click store to drill down to details 
* (C) Role & Permissions Access *(BACKEND NOT IMPLEMENTED)*
  * Quick link: "Manage Roles"
  * Shows current roles: Super Admin, Admin, Logistics Manager, Repair Staff
  * Hover/tap to view permissions
---
System Overview Panel
* (M) Real-Time Status Board
  * Large status indicators:
```  
    ┌──────────────────────────────┐
    │ NETWORK STATUS: HEALTHY ✓    │
    │ Uptime: 99.9% (12 days)      │
    │ Last Incident: 3 days ago    │
    └──────────────────────────────┘
```
* (M) Key Metrics Cards (4-6 metrics) *(BACKEND NOT IMPLEMENTED)*
  * Active Orders: 127 (↑ 15% from yesterday)
  * Revenue Today: $4,250 (target: $5,000)
  * Inventory Health: 85% (adequate stock)
  * Machine Uptime: 98.5% (1 down)
  * API Response Time: 120ms (target <200ms)
  * Network Latency: 45ms (avg)
  * Each metric clickable for drill-down=
* (M) Regional Status Grid *(BACKEND NOT IMPLEMENTED)*
  * 7 boxes, one per region
  * Each shows:
    - Region name
    - Number of stores online/total
    - Alerts count (⚠️  2 alerts)
    - Revenue this month
    - Status: 🟢 Healthy / 🟡 Degraded / 🔴 Critical
  * Tap to drill into region details
* (M) Active Alerts / Issues Panel *(BACKEND NOT IMPLEMENTED)*
  * List of current issues sorted by severity
  * Color-coded: 🔴 Critical, 🟡 Warning, 🟢 Info
  * Examples:
    - 🔴 "Dallas Hub: High latency detected (500ms)"
    - 🟡 "Logan Store #3: Machine offline - needs maintenance"
    - 🟡 "Inventory Alert: Vanilla syrup running low (5% stock)"
    - 🟢 "Atlanta: 3 new orders received"
  * Each alert shows:
    - Time: "2 minutes ago"
    - Affected region/store
    - Action button: "View Details" or "Acknowledge"
  * Auto-dismiss or manual clear
* (C) Timeline / Alert History *(BACKEND NOT IMPLEMENTED)*
  * Last 24 hours in timeline view
  * Shows when each issue occurred
  * Severity timeline (red/yellow/green bar)
  * Hover to see details
  * Export alert history
---
Configuration & Control Section
* (S) Global AI Parameter Controls *(BACKEND NOT IMPLEMENTED)*
  * Section: "AI Configuration"
  * Controls for:
    - Recommendation Engine
      * Confidence threshold: [slider 0.5-0.95]
      * Suggestion frequency: [slider 1-10]
      * Personalization level: [Low] [Medium] [High]
    - Chatbot Settings
      * Response confidence min: [slider]
      * Enable escalation at: [slider] confidence level
      * Max retry attempts: [input field]
    - Forecasting Engine
      * Update frequency: [Every hour] [Every 6 hours] [Daily]
      * Prediction accuracy threshold: [slider]
      * Enable auto-restock: [toggle]
  * "Save Changes" button (disabled until changes made)
  * "Reset to Defaults" button
* (M) System Override Toggles *(BACKEND NOT IMPLEMENTED)*
  * Emergency controls (red background)
  * Toggles with confirmation dialogs:
    - 🔴 Maintenance Mode (disables all orders)
      * Show: "Maintenance window until [date/time]"
      * (C) Broadcast message to users option
    - 🔴 Pause All Recurring Orders
      * Show: "Paused 145 recurring orders"
      * "Resume All" button
    - 🔴 Disable Geolocation Tracking
    - 🟡 Rate Limiter Override
      * Show: "Current limit: XXX requests/minute"
      * Temporarily increase for testing
  * (S) All overrides log who activated and when
* (C) User Management *(BACKEND NOT IMPLEMENTED)*
  * "Manage Users" section
  * Admins, logistics managers, repair staff list
  * Per user:
    - Name, email, role
    - Region(s) assigned
    - Last login
    - Status (Active/Inactive)
    - Actions: Edit, Reset Password, Disable, Delete
  * "Create New User" button with form
  * Bulk actions: Disable all, Reset passwords
---
Additional Sections
* (S) Store Management *(BACKEND NOT IMPLEMENTED)*
  * Edit store details (address, hours, machines)
  * Assign stores to regions
  * View store status
  * Force offline/maintenance mode per store
* (S) Hub Viewing *(BACKEND NOT IMPLEMENTED)*
  * View hub status
  * Hub-level metrics
* (M) Reports & Analytics *(BACKEND NOT IMPLEMENTED)*
  * Revenue reports (nationwide, by region, by store)
  * Order trends
  * Inventory trends
  * Machine uptime reports
  * (C) Export to CSV/PDF
* (C) Audit Logs / Activity History *(BACKEND NOT IMPLEMENTED)*
  * Who: User performing action
  * What: Action taken (e.g., "Created user", "Changed AI threshold")
  * When: Timestamp
  * Where: Affected resource (store, region, order)
  * Result: Success/Failure
  * Filterable by: User, Action type, Date range, Status
  * Export audit logs
* (C) Maintenance Mode *(BACKEND NOT IMPLEMENTED)*
  * Global maintenance toggle
  * Schedule maintenance window (date/time)
  * Auto-resolve after maintenance period
* (C) System Health Dashboard *(BACKEND NOT IMPLEMENTED)*
  * Database health (connection pools, query performance)
  * Cache health (Redis/Memcache)
  * Queue health (Celery tasks)
  * External service status (Stripe, Mapbox, Dialogflow)
  * Each shows: Status, Uptime, Last checked
---
Key Features Needed
* (M) Real-Time Updates
  * Dashboard auto-refreshes (every 30 sec)
* (M) Drill-Down Navigation
  * Click region → see stores in region
  * Click store → see details (inventory, machines, orders)
  * Click alert → see affected resource & remediation options
* (M) Search & Filter
  * Global search: Find store, user, hub by name
  * Filter by: Region, Status, Issue type
  * Save custom views/filters

-=-=-=-=-=-=-=-=-=-=-=-=-=-
Make this whole page according to UI guidelines in guidelines/UI_GUIDELINES.md