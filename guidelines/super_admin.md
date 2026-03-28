# ---vvv IMPORTANT NOTES FOR CREATING THIS PAGE: vvv---
* All UI guidelines (color schema, etc) can be found in guidelines/UI_GUIDELINES.md under "Dashboard UI Standards".
* Do not worry about implementing any of the backend (but I do want users with the proper permissions to be able to at least login and click around the page)
* At the end, make a list of everything that was made a part of the UI that is not yet in the backend.
# ---^^^ IMPORTANT NOTES FOR CREATING THIS PAGE: ^^^---

# Super Admin Dashboard

## Web Dashboard Layout Organization

The Super Admin Dashboard follows a classic web admin dashboard layout with a fixed sidebar navigation, sticky top bar, and responsive multi-column content area.

```
┌─────────────────────────────────────────────────────────────┐
│  TOP BAR (sticky, full-width, height 64px)                  │
│  Logo (32) │ "Super Admin Dashboard"    Status │ User │ Out │
├──────────┬─────────────────────────────────────────────────┤
│ SIDEBAR  │  CONTENT AREA (fluid, scrollable)                │
│ (256px)  │  ┌─────────────────────────────────────────────┐ │
│          │  │ Breadcrumb / Page Header                    │ │
│ • Home   │  ├────────────┬────────────┬──────────────────┤ │
│ • Regions│  │  KPI Card  │  KPI Card  │   KPI Card   ... │ │
│ • Hubs   │  ├────────────┴────────────┴──────────────────┤ │
│ • Users  │  │ Regional Grid (2/3)    │ Alerts (1/3)      │ │
│ • AI     │  ├──────────────────────────────────────────────┤ │
│ • Reports│  │ Charts / Data Tables / Config Panels         │ │
│ • Audit  │  └──────────────────────────────────────────────┘ │
│ • Config │                                                   │
│ • Help   │                                                   │
└──────────┴─────────────────────────────────────────────────┘
```

### Layout Sections (top to bottom)

1. **Top Bar** — Fixed, sticky, full-width. Contains logo, page title, system status, user info, logout.
2. **Left Sidebar** — Fixed, 256px wide. Contains primary navigation menu. Collapses to icon rail (64px) at tablet breakpoints.
3. **Main Content** — Fluid width, scrolls vertically. Contains:
   - Page Header (breadcrumb, title, action buttons)
   - KPI Metrics Row (responsive CSS grid)
   - Regional Status Grid + Alerts Panel (side-by-side on desktop, stacked on tablet/mobile)
   - Secondary panels (charts, tables, configuration)

### Responsive Breakpoints

| Breakpoint | Screen Width | Layout Changes |
|---|---|---|
| **Mobile** | < 768px | Sidebar hidden (hamburger menu), single-column content, full-width cards |
| **Tablet** | 768px–1279px | Sidebar collapses to icon rail (64px), 2-col content grid, 2-3 KPI cards per row |
| **Desktop** | 1280px–1535px | Full sidebar (256px), multi-col layout, 4 KPI cards per row |
| **Wide** | 1536px+ | Full sidebar, wider content area, 6 KPI cards per row |

---

## Component Details

### Top Navigation Bar
* **Fixed position**, sticky (z-index: 100), height 64px, background white
* **Left section:**
  - CodePop Logo (size: 32px, per UI_GUIDELINES.md)
  - "Super Admin Dashboard" title (H2, #222831)
  - Time last updated: "Updated 2 min ago" *(BACKEND NOT IMPLEMENTED)*
* **Right section:**
  - System status indicator: "All Systems Operational" (green/red badge)
  - Current user: "Admin Name" (Body Normal, #222831)
  - Logout button (secondary style)
* **Spacing:** 16px horizontal padding, center items vertically

---

### Left Sidebar Navigation
* **Fixed position**, left side, width 256px, full viewport height (below top bar)
* **Background:** #FFFFFF, border-right 1px solid #E5E7EB
* **Scrollable content**, independent scroll from main area
* **Navigation items:**
  - Dashboard (home icon)
  - Regions & Stores
  - Supply Hubs
  - User Management
  - AI Configuration
  - Reports & Analytics
  - Audit Logs
  - System Settings
  - Help & Documentation
* **Item styling:**
  - Font: Body Normal (14px), #222831
  - Padding: 12px 16px
  - Spacing between items: 4px
  - **Active state:** Left border 4px #FF2E63 + subtle background tint (#FEF2F7)
  - **Hover state:** Background #F3F4F6
  - Icons: 20px, left-aligned with 8px margin-right
* **Responsive:**
  - At tablet breakpoint (768px–1279px): Collapse to icon rail (64px), no text labels, show tooltip on hover
  - At mobile breakpoint (<768px): Hide sidebar, show hamburger menu in top bar to toggle drawer navigation

---

### Page Header (in Main Content Area)
* **Breadcrumb navigation** (optional, 12px, #6B7280)
  - Example: "Dashboard > Regions > Chicago"
  - Last item: current page (no link)
* **Page title** (H1, 32px, #222831)
* **Contextual action buttons** (right-aligned, e.g., "Create Store", "Export Data")
* **Spacing:** 24px bottom margin before KPI cards

---

### Key Metrics Cards Row
* **CSS Grid layout:** `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))`
* **Responsive behavior:**
  - Desktop (1280px+): 4-6 cards per row
  - Tablet (768px–1279px): 2-3 cards per row
  - Mobile (<768px): 1 card per row
* **Each card:**
  - Background: #FFFFFF, border 1px #E5E7EB, border-radius 12px
  - Padding: 16px
  - Metric value: H2 (#222831)
  - Metric label: Body Small (#6B7280)
  - Trend indicator: "↑ 15%" (green #10B981) or "↓ 5%" (red #EF4444)
  - Target value: Body Small, secondary text
  - **Hover state:** Shadow Level 2, cursor pointer
  - **Click behavior:** Drill down to detailed view or modal
* **Metrics to display (BACKEND NOT IMPLEMENTED):**
  - Active Orders: 127 (↑ 15% from yesterday)
  - Revenue Today: $4,250 (target: $5,000)
  - Inventory Health: 85% (adequate stock)
  - Machine Uptime: 98.5% (1 down)
  - API Response Time: 120ms (target <200ms)
  - Network Latency: 45ms (avg)
* **Gap between cards:** 16px

---

### Regional Status Grid
* **Position:** Takes up 2/3 of width on desktop (1280px+), stacks below KPI row on tablet/mobile
* **Grid layout:** `grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))`
* **7 region boxes** (one per region: Chicago, New Jersey, Logan, Dallas, Phoenix, Atlanta, Seattle)
* **Each box:**
  - Background: #FFFFFF, border 1px #E5E7EB, border-radius 12px
  - Padding: 16px
  - Region name: Body Large (#222831)
  - Stores online/total: Body Small (#6B7280) — e.g., "8/10 online"
  - Alerts count: Badge with count — e.g., "⚠️ 2"
  - Revenue this month: Body Small (#6B7280) — e.g., "$12,500"
  - Status badge: 🟢 Healthy / 🟡 Degraded / 🔴 Critical
  - **Hover state:** Shadow Level 2, cursor pointer
  - **Click behavior:** Drill into region details page
* **Gap:** 16px

---

### Active Alerts / Issues Panel
* **Position:** Right-rail panel alongside Regional Grid on desktop, stacks below grid on tablet/mobile
* **Width:** 1/3 on desktop, full-width on smaller screens
* **Header:** "Active Alerts" (H3, #222831) with count badge
* **Sorted by severity:** Critical (🔴) → Warning (🟡) → Info (🟢)
* **Each alert row:**
  - Severity icon/badge (left)
  - Message: Body Normal (#222831)
  - Time: "2 minutes ago" (Body Small, #6B7280)
  - Affected region/store: Body Small (#6B7280)
  - Action button: "View Details" or "Acknowledge" (secondary style, small)
  - **Hover state:** Background #F3F4F6
  - **Padding:** 12px, border-bottom 1px #E5E7EB
* **Auto-dismiss:** High-priority alerts remain visible; low-priority auto-dismiss after 5 minutes
* **Manual clear:** Swipe left (mobile) or delete icon (desktop) to dismiss individual alert
* **New alert toast:** When new alerts arrive, show toast notification (bottom-right corner, auto-dismiss 5s)

**Example alerts:**
- 🔴 "Dallas Hub: High latency detected (500ms)"
- 🟡 "Logan Store #3: Machine offline - needs maintenance"
- 🟡 "Inventory Alert: Vanilla syrup running low (5% stock)"
- 🟢 "Atlanta: 3 new orders received"

---

### Real-Time Status Board
* **Optional prominent status section** (can appear at top of main content or in sidebar)
* **Display:**
  ```
  ┌──────────────────────────────┐
  │ NETWORK STATUS: HEALTHY ✓    │
  │ Uptime: 99.9% (12 days)      │
  │ Last Incident: 3 days ago    │
  └──────────────────────────────┘
  ```
* **Styling:** Background tint (#F0FDF4 for healthy, #FEF2F2 for critical), border-left 4px color-coded
* **Auto-refresh:** Every 30 seconds

---

### Performance Graphs & Charts *(NOT IMPLEMENTED)*
* **Full-width sections** below alerts/regional grid
* **Charts:**
  - Network latency over 24h (line graph)
  - Order volume over time
  - API response times
  - Machine uptime trends
* **Sizing:** Responsive, fill container width
* **Hover behavior:** Tooltip shows data point details (not tap-based)
* **Legend:** Clickable to toggle series visibility
* **Auto-refresh:** Every 30 seconds

---

### Store/Hub Data Tables *(BACKEND NOT IMPLEMENTED)*
* **Location:** "Regions & Stores" page and "Supply Hubs" page
* **Search & Filter bar** (above table):
  - Global search input: "Search by store name, location..."
  - Filter dropdowns: Region, Status (Online/Offline), Issue Level
  - Clear filters button
  - Save view / custom filter button (optional)
* **Table structure:**
  - Sortable column headers (click to sort A→Z or Z→A)
  - Row hover highlight (#F3F4F6)
  - Sticky header (when scrolling)
  - Pagination: Show 25, 50, 100 rows per page; page controls at bottom
  - OR virtual scroll for very large lists
* **Columns (example for Stores):**
  - Store Name (clickable, leads to detail view)
  - Region
  - Status (badge: Online 🟢, Offline 🔴)
  - Active Orders (numeric)
  - Inventory % (bar chart mini)
  - Revenue This Month (currency)
  - Last Health Check (relative time, e.g., "2 min ago")
  - Actions (view icon, edit icon in context menu)
* **Row styling:**
  - Font: Body Normal (14px)
  - Padding: 12px vertical
  - Striped backgrounds optional (#F9FAFB every other row)
* **Click to drill down:** Click store name or row to open detail modal/page

---

## Regions & Stores Page

### Region Selector Bar *(BACKEND NOT IMPLEMENTED)*
* **Location:** Below page header, above data table
* **Presentation options:**
  - Dropdown: "Select Region" with all 7 options
  - OR horizontal button group: Chicago | New Jersey | Logan | Dallas | Phoenix | Atlanta | Seattle
* **Selected state:** Primary color (#FF2E63) background
* **Visual map:** Optional map with region highlights *(BACKEND NOT IMPLEMENTED)*
* **Shows:** Stores/hubs in selected region in the table below

---

## Supply Hubs Page
* **Same structure** as Regions & Stores
* **Hub-specific columns** in data table:
  - Hub Name
  - Region
  - Status
  - Assigned Stores (count)
  - Inventory Level
  - Last Updated
  - Actions

---

## Configuration & Control Section

### Global AI Parameter Controls *(BACKEND NOT IMPLEMENTED)*
* **Page:** "AI Configuration"
* **Section layout:** Vertical stack of collapsible/expandable panels
* **Panels:**
  - **Recommendation Engine**
    - Confidence threshold: [slider 0.5-0.95] with value display
    - Suggestion frequency: [slider 1-10]
    - Personalization level: [Radio] Low / Medium / High
  - **Chatbot Settings**
    - Response confidence min: [slider]
    - Enable escalation at: [slider] confidence level
    - Max retry attempts: [input field, number]
  - **Forecasting Engine**
    - Update frequency: [Radio] Every hour / Every 6 hours / Daily
    - Prediction accuracy threshold: [slider]
    - Enable auto-restock: [toggle]
* **Hover tooltips:** Each setting has "Learn More" icon; hover to show tooltip *(NOT IMPLEMENTED)*
* **Button group** (bottom):
  - "Save Changes" (primary button, disabled until changes made)
  - "Reset to Defaults" (secondary button)
* **Spacing:** 24px between panels, 16px between controls

---

### System Override Toggles *(BACKEND NOT IMPLEMENTED)*
* **Emergency controls section** (red/warning styling)
* **Warning banner:** "⚠️ Override controls affect all users and systems. Use with caution."
* **Each toggle:**
  - Label (Body Large, #222831)
  - Description (Body Small, #6B7280)
  - Toggle switch (off/on)
  - Status text below toggle (e.g., "Paused 145 recurring orders")
  - Click-to-confirm modal dialog before enabling
* **Toggles:**
  - 🔴 **Maintenance Mode** (disables all orders)
    - Shows: "Maintenance window until [date/time]"
    - Option: Broadcast message to users *(NOT IMPLEMENTED)*
  - 🔴 **Pause All Recurring Orders**
    - Shows: "Paused XXX recurring orders"
    - "Resume All" button
  - 🔴 **Disable Geolocation Tracking**
    - Shows: "All stores using manual time-based ordering" *(NOT IMPLEMENTED)*
  - 🟡 **Rate Limiter Override**
    - Shows: "Current limit: XXX requests/minute"
    - Allows temporarily increasing limit for testing
* **Audit:** All overrides log who activated and when (visible in Audit Logs page)
* **Styling:** Red background tint (#FEF2F2), border-left 4px #EF4444

---

### Role Management & Permissions *(BACKEND NOT IMPLEMENTED)*
* **Page:** "User Management" > "Manage Roles" section
* **Current roles list:**
  - Super Admin (read-only)
  - Admin (edit/delete)
  - Logistics Manager (edit/delete)
  - Repair Staff (edit/delete)
  - [+ Create New Role] button
* **Click role to edit:**
  - Modal opens with role name + permission checklist
  ```
  ┌─────────────────────────┐
  │ Role: Logistics Manager │
  ├─────────────────────────┤
  │ ☑ View Orders           │
  │ ☑ View Inventory        │
  │ ☑ Create Supply Req     │
  │ ☐ Approve Supply Req    │
  │ ☐ Manage Stores         │
  │ ☐ View Analytics        │
  │ ☐ Manage Users          │
  └─────────────────────────┘
  ```
  - Checkboxes use standard form styling from UI_GUIDELINES.md
  - Buttons: "Save Changes" (primary), "Delete Role" (danger, if unused)

---

### User Management Table *(BACKEND NOT IMPLEMENTED)*
* **Page:** "User Management"
* **Table columns:**
  - Name
  - Email
  - Role (dropdown to change)
  - Region(s) Assigned
  - Last Login (relative time)
  - Status (Active/Inactive toggle)
  - Actions (Edit, Reset Password, Disable, Delete icons)
* **Search & filter bar** (above table)
* **Bulk actions:** "Select All" checkbox, then bulk actions like "Reset Passwords" or "Disable All"
* **"Create New User" button** (top-right, opens form modal)

---

## Store & Hub Management *(BACKEND NOT IMPLEMENTED)*

### Store Management
* **Page:** "Regions & Stores" > select store from table
* **Store detail view/modal:**
  - Create new store: "New Store" form (address, hours, machines, region assignment)
  - Edit store details: Form fields (name, address, hours, phone)
  - Assign to region: Dropdown selector
  - View current status (online/offline)
  - Force offline/maintenance mode toggle (with confirmation)

### Hub Viewing & Management *(BACKEND NOT IMPLEMENTED)*
* **Hub viewing:** See hub status, hub-level metrics (assigned stores count, inventory level)
* **Hub management:** Create supply hubs, assign stores to hubs

---

## Reports & Analytics *(BACKEND NOT IMPLEMENTED)*
* **Page:** "Reports & Analytics"
* **Report types:**
  - Revenue reports (nationwide, by region, by store)
  - Order trends
  - Inventory trends
  - Machine uptime reports
* **Presentation:** Charts, tables, exportable data
* **Export options:** CSV, PDF buttons

---

## Audit Logs *(BACKEND NOT IMPLEMENTED)*
* **Page:** "Audit Logs"
* **Searchable/filterable log table:**
  - Who: User performing action
  - What: Action taken (e.g., "Created user", "Changed AI threshold")
  - When: Timestamp (sortable)
  - Where: Affected resource (store, region, order)
  - Result: Success/Failure (badge)
* **Filters:** User, Action type, Date range, Status
* **Export:** Export audit logs (CSV/PDF)
* **Table features:** Pagination, sortable columns, row hover highlight

---

## System Settings & Maintenance *(BACKEND NOT IMPLEMENTED)*

### Maintenance Mode
* **Toggle:** Global maintenance mode on/off
* **Options:**
  - Schedule maintenance window (date/time picker)
  - Broadcast message to all users (text field) *(NOT IMPLEMENTED)*
  - Auto-resolve after maintenance period
* **Status display:** Show active maintenance period in top bar or alert banner

### Notification/Alert Settings *(NOT IMPLEMENTED)*
* **Thresholds:** Configure alert thresholds via sliders:
  - Critical latency: [slider] ms
  - Low inventory: [slider] %
  - Machine downtime: [slider] hours
* **Notification channels:** Checkboxes: Email, In-app, SMS
* **Alert routing:** Table showing "Rule" → "Who gets notified"

### Backup & Recovery *(NOT IMPLEMENTED)*
* **Status display:**
  - Last backup timestamp: "Yesterday 2:00 AM"
  - Backup frequency: Dropdown [Daily] [Weekly]
* **Actions:**
  - "Backup Now" button (primary)
  - "Restore from backup" button (danger, requires confirmation)
  - Retention policy dropdown: [30 days] [90 days] [1 year]

### System Health Dashboard *(NOT IMPLEMENTED)*
* **Status cards** for each subsystem:
  - Database health (connection pools, query performance)
  - Cache health (Redis/Memcache)
  - Queue health (Celery tasks)
  - External service status (Stripe, Mapbox, Dialogflow)
* **Each card shows:** Status (🟢/🟡/🔴), Uptime percentage, Last checked timestamp
* **Auto-refresh:** Every 30 seconds

---

## Key Features & Interactions

### Real-Time Updates
* Dashboard auto-refreshes every 30 seconds (or WebSocket for instant updates)
* Toast notifications for critical alerts (bottom-right corner)
* Loading skeleton/spinner during refresh

### Drill-Down Navigation
* Click region card → Regions & Stores page filtered by region
* Click store name in table → Store detail view
* Click alert → View affected resource & remediation options
* Browser back/forward: Navigate using URL-based routing

### Search & Filter
* **Global search:** Optional header search box → Find store, user, hub by name
* **Page-level filters:** Region selector, Status filters, Issue type filters
* **Save custom views:** Option to bookmark filtered views (optional)
* **Clear filters:** Clear button resets all filters

### Keyboard Navigation
* Tab through interactive elements (buttons, links, toggles, form inputs)
* Enter to activate buttons/links
* Space to toggle switches/checkboxes
* Escape to close modals

### Empty States
* When no data: Show empty state illustration + "No [items] found. [Action button]"
* When filters return 0 results: "No results match your filters. [Clear filters button]"

---

## Style & Spacing Reference

* **Typography:** See UI_GUIDELINES.md (H1–Caption sizes)
* **Colors:** See UI_GUIDELINES.md (Primary #FF2E63, Secondary #08D9D6, etc.)
* **Grid spacing:** 8px base unit (16px margins between sections, 12px between list items)
* **Border radius:** Cards 12px, inputs 8px, modals 16px (see UI_GUIDELINES.md)
* **Shadows:** Level 1 (subtle) on cards, Level 2 on hover, Level 3 on modals
* **Focus states:** 2-3px outline in secondary color #08D9D6 (see UI_GUIDELINES.md)
