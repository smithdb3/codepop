# ---vvv IMPORTANT NOTES FOR CREATING THIS PAGE: vvv---
* All UI guidelines (color schema, etc) can be found in guidelines/UI_GUIDELINES.md under "Dashboard UI Standards".
* Do not worry about implementing any of the backend (but I do want users with the proper permissions to be able to at least login and click around the page)
* At the end, make a list of everything that was made a part of the UI that is not yet in the backend. Place in doc "backend_todo.md". Doc should be organized by dashboard and split into simple tasks.
# ---^^^ IMPORTANT NOTES FOR CREATING THIS PAGE: ^^^---

# Repair Staff Dashboard (Web)

This is the web-adapted low-level design for the **Repair Staff Dashboard**. The original design was written for a React Native mobile app; this version reimagines it for `dashboards_frontend` (React + Vite web). All component patterns follow the **Dashboard UI Standards** in `guidelines/UI_GUIDELINES.md`.

---

## Overall Architecture

The dashboard follows the standard 3-zone shell from UI_GUIDELINES §1:
- **Header (64px, fixed)**: Logo, "Repair Staff Dashboard" title, user badge, notifications bell, sign out
- **Sidebar (256px full / 64px collapsed)**: Dark `#222831` with 5 main navigation pages
- **Main content area**: `#F9FAFB` background, 12-column responsive grid

### Sidebar Navigation Pages

The repair staff dashboard is organized into **5 pages** accessible via sidebar nav:

| Page | Route | Icon | Purpose |
|---|---|---|---|
| **Overview** | `/repair` | `[home icon]` | Daily dashboard — today's schedule, KPIs, critical alerts |
| **Machines** | `/repair/machines` | `[cog icon]` | Full machine status table + detail drawer |
| **Schedule** | `/repair/schedule` | `[calendar icon]` | Repair scheduling calendar (Gantt/Week/Month views) |
| **Parts & Inventory** | `/repair/parts` | `[package icon]` | Parts availability + open order tracker |
| **Performance** | `/repair/performance` | `[chart icon]` | Personal metrics & statistics (Could Have) |

---

## Mobile → Web Adaptation

The following mobile-specific patterns have been adapted for web:

| Mobile pattern | Web replacement | Rationale |
|---|---|---|
| Stack/tab screen navigation | Sidebar pages with URL routes | Web uses standard left-nav pattern; clearer information architecture |
| Bottom persistent Quick Actions bar | Action buttons in Machine Detail drawer header | Web drawer is fixed right side; actions prominent at top |
| "Navigate" button (opens GPS app) | "Open in Maps" link (Google Maps URL, target="_blank") | Web can't launch GPS app; URL-based navigation is standard |
| Take Photo button (camera device) | "Upload Photos" file input button | Web uses file upload dialog; photos stay with notes |
| Push notifications to phone | In-app notification bell flyout (UI_GUIDELINES §10) | Bell icon in header with dropdown flyout; no system notifications |
| Emoji status indicators 🔴🟡🟢 | Status badge pill components (UI_GUIDELINES §8) | Consistent with design system; better semantics |
| Full-screen Machine Detail view | Right slide-over drawer (480px, fixed) | Keeps machine list visible; modern web UX pattern |
| Today's Schedule as blocking full-screen view | Card component on Overview page | Sidebar already uses space; schedule is one card among many |
| Offline cache support (app feature) | **Dropped from MVP** | Web browser caching is unreliable; server is always primary |
| Swipe gestures | Hover states, click interactions | Desktop doesn't have swipe; tab/click more discoverable |

---

## Page 1: Overview

**Route:** `/repair` (default landing page)

**Layout:** Vertical scrolling page with `contentArea` wrapper (UI_GUIDELINES §4).

### Sections (top to bottom)

#### 1. Page Header
- **H1:** "Good morning, [Technician Name]"
- **Date/Region pill:** Gray text, `14px / #6B7280`, displays current date + "Chicago Region" as a light badge

#### 2. Critical Alert Banner (Conditional)
- **Visibility:** Show only if any machine has been offline >2 hours
- **Style:** `alertBanner.critical` from UI_GUIDELINES §10 — red left border, light red background `#FEF2F2`
- **Content:** "⚠️ 2 machines offline for 3h 15m — estimated revenue impact $660/hr. [View Machines →]" (link goes to `/repair/machines` with status=critical filter)
- **Dismissible:** X button top-right

#### 3. KPI Cards Row
- **Grid:** `repeat(auto-fit, minmax(180px, 1fr))`, gap 16px (UI_GUIDELINES §5)
- **4 cards:**
  1. **Machines Down** (red icon tint) — count + icon
  2. **Repairs Today** (pink icon tint) — count + icon
  3. **Parts Pending** (amber icon tint) — count + icon
  4. **Revenue Impact** (green icon tint) — $ amount prevented + icon
- **Spacing below:** `margin-bottom: 24px`

#### 4. Two-Column Row (col-8 | col-4)

**Left column (col-8):** **Today's Schedule Card**
- **Card style:** `#FFFFFF`, `1px solid #E5E7EB`, `12px` radius, `20px` padding, `--shadow-sm`
- **Card header:** "Today's Schedule" (H3, 20px/600) + "Route Optimization" button (secondary style) in top-right
- **Time-blocked list (8am–6pm):**
  - Each job as a horizontal row:
    - **Time block:** `12px / #6B7280` — "9:00am–10:15am"
    - **Store name + address:** `14px` (bold), clickable link to Google Maps (target="_blank")
    - **Machine status badge:** From UI_GUIDELINES §8 (green/amber/red dot + label)
    - **Est. duration:** `12px / #6B7280` — "(1h 15m)"
    - **Action buttons:** [Start Repair] (primary, 36px height) + [Open in Maps] (ghost)
  - **Divider between rows:** `1px solid #F3F4F6`
  - **Max 5 items shown;** "View all →" link if more jobs exist (goes to `/repair/schedule`)
- **Empty state:** "No repairs scheduled for today. [View Schedule →]"

**Right column (col-4):** **Regional Summary Card**
- **Card style:** Same as Today's Schedule
- **Content:**
  - **Region:** "Assigned to: Chicago" (bold, 16px)
  - **Store count:** "12 stores"
  - **Machine count:** "47 machines"
  - **Status breakdown bar:** Horizontal stacked bar showing:
    - Green section: "24 Operational"
    - Amber section: "3 Degraded"
    - Red section: "2 Critical"
  - **Quick action button:** [View All Machines] → `/repair/machines`

#### 5. Notifications / Activity Feed Card (Full width)
- **Card style:** Same as above
- **Card header:** "Alerts & Activity" (H3)
- **Content:** List of recent alerts (max 8 items):
  - Each alert: **severity dot** (using badge colors from UI_GUIDELINES §8) + **message text** + **timestamp** (`12px / #9CA3AF`) + **[Dismiss]** link
  - Example rows:
    - 🔴 "Machine #4 critical downtime (5h 22m)" — 2 hours ago
    - 🟡 "Parts for Machine #7 arrived at hub" — 4 hours ago
    - 🟢 "Repair #42 marked complete by you" — 6 hours ago
  - **Empty state:** "All caught up! No recent alerts."
  - **View all link:** "View all alerts →" (ghost link)

---

## Page 2: Machines

**Route:** `/repair/machines`

**Layout:** Full-width content area with 12-column grid. Machines table takes col-12. When a machine is selected, a right drawer slides in.

### Sections

#### 1. Page Header
- **H1:** "Machines — [Region Name]"
- **Primary action:** [Plan Route for Selected] button (becomes enabled when rows are selected, see Bulk Actions below)

#### 2. Quick-Filter Pill Row
- **Style:** Horizontal row of clickable pills, `border-radius: 999px`, `padding: 4px 10px`
- **Default pill (no color):** "All" — shows total machine count
- **Status pills:**
  - "5 Critical" (red badge color `--badge-error-text` text on `--badge-error-bg` background)
  - "3 Degraded" (amber badge color)
  - "24 Operational" (green badge color)
  - "2 Parts Pending" (blue/info badge color)
- **Clicking a pill filters the table** to show only machines in that status
- **Margin below:** `16px`

#### 3. Table Container (Full width, UI_GUIDELINES §6)
- **White card:** `1px solid #E5E7EB`, `12px` radius, `overflow: hidden`, `--shadow-sm`

**Toolbar (inside table):**
- **Search input:** 280px wide, placeholder "Search by machine ID, model, location…"
- **Filter dropdowns** (secondary button style, 36px height):
  - Status: All / Critical / Degraded / Operational / Offline
  - Store: (shows list of stores in region)
  - Machine Type: (shows list of models)
  - Urgency: All / Today / This Week / Overdue / Maintenance Only
  - Parts Availability: All / Has Parts / Waiting on Parts / Back-order
- **Clear filters link:** Ghost text `#08D9D6`, `12px`, appears only if filters are active
- **Padding:** `16px`, **border-bottom:** `1px solid #E5E7EB`

**Table Header (sticky):**
- **Background:** `#F9FAFB`, **border-bottom:** `2px solid #E5E7EB`
- **Columns** (left to right):
  1. ☐ (checkbox, center) — "Select all" checkbox in header
  2. Machine ID & Store (left-align) — "Machine 4 • Chicago Store #2"
  3. Model / Serial (left-align)
  4. Status (center-align) — badge component
  5. Downtime Duration (right-align, if offline)
  6. Last Service (left-align)
  7. Priority Score (right-align, 0–100)
  8. Revenue Impact (right-align) — $ per hour if down
  9. Actions (center) — icon buttons

**Rows:**
- **Min-height:** `52px`
- **Divider line:** `1px solid #E5E7EB` between rows
- **Hover state:** `background-color: #F3F4F6`
- **Alignment:** Numbers right-align, text left-align, badges/status center
- **Status badges:** Dot + label pill (Critical Down / Degraded / Operational)
- **Row actions (pinned right, 24px icons):**
  - [Details] icon → slides in Machine Detail drawer
  - [Start Repair] icon → opens quick-action dialog or navigates to drawer "Start" action
  - [Escalate] icon or (overflow menu if >2 actions)

**Pagination (footer):**
- **Text:** "Showing 1–25 of 143 results"
- **Controls:** [< Prev] [1] [2] [3] ... [6] [Next >] + rows-per-page dropdown (25 / 50 / 100)
- **Padding:** `12px 16px`, **border-top:** `1px solid #E5E7EB`

#### 4. Bulk Actions Bar (Appears when rows selected)
- **Fixed bar at bottom:** `position: fixed; bottom: 0; left: 0; right: 0`
- **Background:** `#FFFFFF`, **border-top:** `2px solid #FF2E63`
- **Content:** "X machines selected" + [Plan Route for Selected] primary button + [Clear Selection] ghost link
- **Spacing:** `12px 24px`, height ~56px
- **Animation:** Slide up from bottom when first checkbox clicked

#### 5. Machine Detail Drawer (Right slide-over)
- **Trigger:** Click [Details] button in any table row
- **Position:** `position: fixed; right: 0; top: 64px; bottom: 0; width: 480px`
- **Background:** `#FFFFFF`, **border-left:** `1px solid #E5E7EB`, **shadow:** `--shadow-lg` (0 10px 25px rgba(0,0,0,0.2))
- **Z-index:** `300` (above main content)
- **Overflow:** `overflow-y: auto`

**Drawer Header (Sticky):**
- **Background:** `#F9FAFB`, **padding:** `20px 24px`, **border-bottom:** `1px solid #E5E7EB`
- **Content (flex, space-between):**
  - Left: Machine ID (16px/600, `#222831`) + Model (12px, `#6B7280`)
  - Right: Status badge + Close [×] button (40x40px, ghost style)

**Quick Actions Row (Sticky, below header):**
- **Background:** `#FFFFFF`, **padding:** `12px 24px`, **border-bottom:** `1px solid #E5E7EB`
- **Layout:** Flex, wrapped if needed
- **Buttons (secondary style, 36px height):**
  - [Start Repair]
  - [Mark Complete]
  - [Request Parts]
  - [Escalate] (tertiary/ghost if space-constrained)

**Tabs (below actions):**
- **Style:** Horizontal tab list, `border-bottom: 1px solid #E5E7EB`
- **Tab styling:**
  - Default: `color: #6B7280`, `padding: 12px 20px`, `border-bottom: 2px solid transparent`
  - Active: `color: #222831` (bold), `border-bottom: 2px solid #FF2E63`
- **Tabs:**
  1. **Details** (default tab)
  2. **History**
  3. **Parts**
  4. **Notes**

**Tab Panes (scroll within drawer):**

**Details Pane:**
- Machine info section (gray background, 14px text):
  - Install date, warranty status, technician assigned (if any), location, current status
  - Current repair state: Healthy / In Progress / Awaiting Parts / Scheduled / Overdue
  - Estimated completion (if in progress)
  - Last update timestamp + note snippet
- Machine metrics (cards):
  - "Revenue Impact" (if down, show $ per hour)
  - "Downtime Duration" (if offline)

**History Pane:**
- Table showing last 10 repairs:
  - Date | Technician | Issue Type | Duration | Outcome (checkmark / alert icon)
  - Clicking a row expands to show full details (diagnosis, steps taken, parts replaced)

**Parts Pane:**
- "Common parts for this model" (gray heading, 12px)
- List of parts:
  - Part name + number
  - Status badge (In Stock / Order Pending / Back-order)
  - Quantity available (if in stock)
  - ETA (if pending/back-order)
  - [Request] button
- If all parts available: "All parts in stock — ready to repair"

**Notes Pane:**
- **Internal Notes** section (gray heading):
  - Text area: add/edit internal repair notes
  - Below: existing notes list (reverse-chronological, 12px, gray text with timestamp)
- **Photos section:**
  - Grid of uploaded photos (thumbnails)
  - [Upload Photos] button (file input, accept="image/*")
  - Delete icon on each photo
- **Padding:** `20px 24px` per pane

**Drawer Close:** Click [×] button in header, or click outside drawer (on main content), or press Escape key.

---

## Page 3: Schedule

**Route:** `/repair/schedule`

**Layout:** Full-width content area with calendar/Gantt view and optional right sidebar for Schedule Optimization.

### Sections

#### 1. Page Header
- **H1:** "Repair Schedule"
- **Toolbar (flex, space-between):**
  - Left: [< Prev] month arrow + "March 2026" label (18px/600) + [Next >] month arrow
  - Right: **View Toggle** button group (UI_GUIDELINES §12 `calendarViewToggle` style)
    - Buttons: [Timeline] (default) | [Week] | [Month]
    - Active state: `background: #FF2E63; color: #FFFFFF;`

#### 2. Calendar/Gantt View (Main Content)
- **Default view: Timeline (Gantt)**
  - See UI_GUIDELINES §12 for full Gantt spec
  - **Machines as rows** (160px label column showing machine ID + status)
  - **Dates as columns** (120px min width, fluid)
  - **Job bars:** 28px tall, `6px` border-radius, truncated labels
  - **Status colors:** (per UI_GUIDELINES §12)
    - Scheduled (future): `rgba(8, 217, 214, 0.20)` bg, `#0891B2` text
    - In Progress: `rgba(255, 46, 99, 0.20)` bg, `#BE185D` text
    - Overdue: `rgba(239, 68, 68, 0.25)` bg, `#B91C1C` text, `2px solid #EF4444` border
    - Completed: `rgba(16, 185, 129, 0.20)` bg, `#059669` text
  - **Today column highlight:** `background: rgba(8, 217, 214, 0.06)`, `2px solid #08D9D6` top/bottom
  - **Hover state:** `box-shadow: 0 2px 8px rgba(0,0,0,0.2)` + tooltip showing job name, machine ID, assigned tech, date range
  - **Drag-to-reschedule:** (S) Users can drag job bars to new dates/times
- **Week view:** 7-column grid with hour rows (8am–8pm), jobs as event pills
- **Month view:** Standard monthly grid, jobs as small event pills with dates

#### 3. Categorized Lists (Below Gantt, collapsible accordion cards)
- **Card style:** `#FFFFFF`, `1px solid #E5E7EB`, `12px` radius
- **Sections (each is a collapsed/expandable card):**
  1. **Today's Schedule** — All repairs scheduled for today (expanded by default)
     - List items: time + machine ID + location + status badge + [Start Repair] button
  2. **Overdue Maintenance** — Machines past maintenance window (red badge count in title)
     - List items with [Schedule Now] button
  3. **Upcoming This Week** — All scheduled repairs next 7 days
     - List items with edit/cancel icons
  4. **Waiting on Parts** — Repairs on hold for parts delivery (amber badge count)
     - List items showing ETA, notification status

#### 4. Schedule Optimization Sidebar (Right, col-4, collapsible)
- **(C) Could Have feature**
- **Trigger:** "Route Optimization" button in card header (or dedicated button)
- **Panel layout:** Gray background `#F9FAFB`, `20px` padding
- **Sections:**
  - **Input:**
    - "Select machines to optimize" — list checkboxes or searchable select
    - "Constraints:" — input fields for max drive time, parts availability filter, time window
    - "Preferences:" — checkboxes for "Group by store", "Minimize travel", "Earliest start"
  - **Output (after optimization run):**
    - Sorted sequence of machines with estimated times
    - Total time estimate: "8:30am – 4:15pm (7h 45m job time, 1h 30m travel)"
    - Map view (small, 100% width) with route pins
    - Metrics: "This route saves 45 minutes vs. current order" + Efficiency score (0–100%)
    - Button: [Accept & Load Schedule] (primary)

---

## Page 4: Parts & Inventory

**Route:** `/repair/parts`

**Layout:** Full-width content area with 12-column grid.

### Sections

#### 1. Page Header
- **H1:** "Parts & Inventory"

#### 2. Two-Column Layout (col-7 | col-5)

**Left column (col-7): Parts Availability Table**
- **Table container:** White card, `1px solid #E5E7EB`, `12px` radius
- **Toolbar:** Search input (280px) — search by machine ID, part name, part number
- **Columns:**
  1. Part Name / Number (left-align)
  2. Machine / Model (left-align)
  3. Stock Status (center-align) — badge (In Stock / Order Pending / Back-order)
  4. Qty Available (right-align)
  5. Hub Location (left-align)
  6. Actions (center-align) — [Request] button
- **Row height:** `52px`, dividers, hover state `#F3F4F6`
- **Empty state:** "Search for parts by machine or name"

**Right column (col-5): Open Orders Tracker**
- **Card style:** `#FFFFFF`, `1px solid #E5E7EB`, `12px` radius
- **Card header:** "Open Orders" (H3)
- **Content:** Vertical list of order cards (not a table):
  - Each order card:
    - Part name (14px/bold) + requested date (12px, gray)
    - Status badge (Pending / In Transit / Delivered)
    - ETA (12px, gray, e.g., "Expected: March 28")
    - [Mark Received] button (secondary, 32px)
  - Divider between cards: `1px solid #F3F4F6`
  - **Empty state:** "No pending orders — all parts in stock."

---

## Page 5: Performance (Could Have)

**Route:** `/repair/performance`

**Layout:** Full-width content area with 12-column grid.

### Sections

#### 1. Page Header
- **H1:** "My Performance"
- **Time range selector** (right side): [This Week] / [This Month] / [Last 30 Days] (secondary button group)

#### 2. KPI Cards Row (6 cards, auto-fit)
- **Grid:** `repeat(auto-fit, minmax(180px, 1fr))`
- **Cards (same spec as Overview KPI cards, UI_GUIDELINES §5):**
  1. Repairs Completed
  2. Avg Repair Time
  3. On-Time %
  4. First-Time Fix %
  5. Downtime Prevented ($)
  6. Team Rank (comparison badge)

#### 3. Two Charts Row (col-6 | col-6)

**Left chart (col-6): Repairs Over Time**
- **Card:** `#FFFFFF`, `1px solid #E5E7EB`, `12px` radius, `20px` padding
- **Title:** "Repairs Over Time"
- **Chart:** Line chart using recharts (`<LineChart>`), `--chart-1` color (`#FF2E63`)
- **X-axis:** Dates (this week or month, depending on time range selected)
- **Y-axis:** Repair count
- **Height:** `320px`

**Right chart (col-6): Repair Types Breakdown**
- **Card:** Same as left
- **Title:** "Repair Types Breakdown"
- **Chart:** Donut chart using recharts (`<PieChart>` with `innerRadius`), 6-color palette (UI_GUIDELINES §7)
- **Center:** Optional KPI number (total repairs this period)
- **Legend:** Below chart, horizontal layout

#### 4. Repair History Table (Full width)
- **H3:** "Repair History (Last 30)"
- **Table container:** White card, `1px solid #E5E7EB`, `12px` radius
- **Toolbar:** Search input + sort dropdown (Date / Duration / Customer Rating)
- **Columns:**
  1. Date (left-align)
  2. Machine ID & Location (left-align)
  3. Issue Type (left-align)
  4. Duration (right-align)
  5. Outcome (center-align) — checkmark ✓ or alert icon ⚠️
  6. Rating (center-align) — star rating or N/A
  7. Actions (center) — [View Details] icon button
- **Row height:** `52px`, dividers, hover `#F3F4F6`
- **Pagination:** 25 rows per page (see UI_GUIDELINES §6)

---

## Component Cross-References

All dashboard components follow the **Dashboard UI Standards** (UI_GUIDELINES.md). Specific sections:

| Component | UI_GUIDELINES Section |
|---|---|
| Layout shell (header/sidebar/main) | §1, §2, §3 |
| KPI Cards | §5 |
| Data Tables | §6 |
| Status Badges (dot + label) | §8 |
| Chart colors & specs | §7 |
| Alert banners (critical/warning/info/success) | §10 |
| Skeleton loaders & empty states | §11 |
| Calendar/Gantt (if needed for future) | §12 |

---

## Priority Legend

- **(M)** = Must Have (MVP — launch this, fully functional)
- **(S)** = Should Have (high value, implement ASAP post-MVP)
- **(C)** = Could Have (nice to have, consider for future releases)

---

## Key Differences from Mobile LLD

The web version prioritizes:
1. **Sidebar navigation** — All major sections (Overview, Machines, Schedule, Parts, Performance) are distinct pages, not floating panels
2. **Wide-screen layout** — Content uses full horizontal space; tables and cards have more room to breathe
3. **Machine Detail as drawer** — Right slide-over (not full screen) keeps table visible while editing
4. **Drag-and-drop schedule** — Gantt view supports drag-to-reschedule (web UI affordance)
5. **Charts & metrics** — Performance page includes rich data viz (line charts, donut charts)
6. **No offline support** — Dropped from MVP; assume reliable internet connection for field technicians

---

*Last Updated: 2026-03-27*
