# ---vvv IMPORTANT NOTES FOR CREATING THIS PAGE: vvv---
* All UI guidelines (color schema, etc) can be found in guidelines/UI_GUIDELINES.md under "Dashboard UI Standards".
* Do not worry about implementing any of the backend (but I do want users with the proper permissions to be able to at least login and click around the page)
* At the end, make a list of everything that was made a part of the UI that is not yet in the backend. Place in doc "docs/newDocs/DashboardBackendImplementation/backend_todo.md". Doc should be organized by dashboard and split into simple tasks.
# ---^^^ IMPORTANT NOTES FOR CREATING THIS PAGE: ^^^---

# Logistics Manager Dashboard (Web)

This is the web-adapted low-level design for the **Logistics Manager Dashboard**. The original design was written for a React Native mobile app; this version reimagines it for `dashboards_frontend` (React + Vite web). All component patterns follow the **Dashboard UI Standards** in `guidelines/UI_GUIDELINES.md`.

---

## Overall Architecture

The dashboard follows the standard 3-zone shell from UI_GUIDELINES §1:
- **Header (64px, fixed)**: Logo, "Logistics Manager Dashboard" title, user badge, notifications bell, sign out
- **Sidebar (256px full / 64px collapsed)**: Dark `#222831` with 5 main navigation pages
- **Main content area**: `#F9FAFB` background, 12-column responsive grid

### Sidebar Navigation Pages

The logistics manager dashboard is organized into **5 pages** accessible via sidebar nav:

| Page | Route | Icon | Purpose |
|---|---|---|---|
| **Overview** | `/logistics` | `[home icon]` | KPI summary, hub status, critical store alerts |
| **Stores** | `/logistics/stores` | `[building icon]` | Store supply status grid + per-store detail drawer |
| **Inventory** | `/logistics/inventory` | `[box icon]` | Supply levels table + Usage trends & AI insights |
| **Deliveries** | `/logistics/deliveries` | `[truck icon]` | Planning view + Route builder + Automated scheduling |
| **Supply Requests** | `/logistics/requests` | `[clipboard icon]` | New request form + pending requests + history |

---

## Mobile → Web Adaptation

The following mobile-specific patterns have been adapted for web:

| Mobile pattern | Web replacement | Rationale |
|---|---|---|
| Stack/tab screen navigation | Sidebar pages with URL routes | Web uses standard left-nav pattern; clearer information architecture |
| Emoji status indicators 🟢🟡🔴 | Status badge pill components (UI_GUIDELINES §8) | Consistent with design system; better semantics |
| Push notifications to phone | In-app notification bell flyout (UI_GUIDELINES §10) | Bell icon in header with dropdown flyout; no system notifications |
| Full-screen map view (in-app) | "Open Route in Maps" link (Google Maps URL, target="_blank") | Web can't embed maps; URL-based navigation is standard |
| Card-tap to full-screen detail | Right slide-over drawer (480px, fixed) | Keeps store list visible; modern web UX pattern |
| Drag stores in mobile list | Drag-and-drop on web (or up/down arrow buttons) | Web supports drag-and-drop natively |
| Inline AI insights in modal/sheet | Dedicated Inventory page with chart cards + "AI Generated" badge | Larger screen allows detailed charts; clear visual hierarchy |
| Push-based notifications | Toast notifications (UI_GUIDELINES §10) | Web-appropriate notification pattern |
| Swipe gestures | Hover states, click interactions | Desktop doesn't have swipe; tab/click more discoverable |

---

## Page 1: Overview

**Route:** `/logistics` (default landing page)

**Layout:** Vertical scrolling page with `contentArea` wrapper (UI_GUIDELINES §4).

### Sections (top to bottom)

#### 1. Page Header
- **H1:** "Logistics Dashboard"
- **Context pill:** Gray text, `14px / #6B7280`, displays current hub + region assignment (e.g., "Chicago Hub • Midwest Region")

#### 2. Critical Alert Banners (Conditional, stacked)
- **Critical banner** (if any store has ≤1 day remaining): `alertBanner.critical` — "⚠️ X stores at critical supply levels (0–1 days remaining). [View Stores →]" (link goes to `/logistics/stores` with filter=critical)
- **Warning banner** (if any store has 2–3 days remaining): `alertBanner.warning` — "⚡ X stores need supply within 2–3 days. [Plan Delivery →]"
- **Dismiss:** X button top-right on each banner

#### 3. KPI Cards Row
- **Grid:** `repeat(auto-fit, minmax(180px, 1fr))`, gap 16px (UI_GUIDELINES §5)
- **5 cards:**
  1. **Stores at Critical Supply** (red icon tint) — count + icon
  2. **Deliveries In Transit** (cyan icon tint) — count + icon
  3. **Pending Supply Requests** (amber icon tint) — count + icon
  4. **Top Trending Ingredient** (pink icon tint) — ingredient name + trend %
  5. **Forecast Accuracy** (green icon tint) — % accurate vs. actual usage
- **Spacing below:** `margin-bottom: 24px`

#### 4. Two-Column Row (col-4 | col-8)

**Left column (col-4):** **Hub Status Card**
- **Card style:** `#FFFFFF`, `1px solid #E5E7EB`, `12px` radius, `20px` padding, `--shadow-sm`
- **Content:**
  - Hub name (H3, 20px/600)
  - Inventory % full (large number, 28px/700) + progress bar showing `%` filled (use green/amber/red gradient: >70%=green, 40–70%=amber, <40%=red)
  - Alert count with badge: "X alerts" (shows count as a number badge, color-coded by severity)
  - Quick stats (3 rows):
    - "X active deliveries" (with small truck icon)
    - "X stores needing restock" (with small warning icon)
    - "X orders pending" (with small package icon)

**Right column (col-8):** **Critical Stores Card**
- **Card style:** Same as Hub Status
- **Card header:** "Stores Needing Attention" (H3)
- **Content:** Top 5 most urgent stores (sorted by days-remaining ascending):
  - Each store as a horizontal row with divider (`1px solid #F3F4F6`)
  - **Store name** (bold, 14px) + **location** (gray, 12px) — clickable link to store detail drawer
  - **Days remaining indicator:** colored pill badge — "2 days" in red / "5 days" in amber / "12 days" in green (UI_GUIDELINES §8 badge colors)
  - **Recommended restock date** (12px, gray) — "Restock by: March 28"
  - **[Request Supply]** button (secondary, 36px height) aligned right — triggers new supply request drawer pre-filled with this store

#### 5. Upcoming Deliveries Card (Full width)
- **Card style:** Same as above
- **Card header:** "Deliveries in Transit" (H3) + "View All Deliveries →" link (ghost, top-right)
- **Content:** Simplified table showing deliveries currently in-flight (max 5 shown):
  - Columns: Store Destination, ETA (time + date), Driver, Status badge (In Transit / Out for Delivery / Delivered)
  - Row dividers, no hover state (read-only view)
  - **Empty state:** "No active deliveries. [Plan Delivery →]" link to `/logistics/deliveries`

---

## Page 2: Stores

**Route:** `/logistics/stores`

**Layout:** Full-width content area, grid/table toggle.

### Sections

#### 1. Page Header
- **H1:** "Stores"
- **Toolbar (right side):**
  - **View toggle** (secondary button group): [Grid] | [Table] — default Grid (icons + labels)
  - **[Request Supply for Selected]** primary button (disabled until rows selected; becomes enabled when ≥1 checkboxes are checked)

#### 2. Filters & Search Toolbar
- **Search input:** 280px wide, placeholder "Search by store name or location…"
- **Filter dropdowns** (secondary button style, 36px height):
  - **Supply Health:** All / Critical (0–1 days) / Low (2–3 days) / Good (>3 days)
  - **Region/Area:** (shows list of regions in system)
- **Clear filters link:** Ghost text `#08D9D6`, `12px`, appears only if filters active
- **Spacing:** `16px` padding, **border-bottom:** `1px solid #E5E7EB`

#### 3. Store Cards Grid (Default View)
- **Grid:** `repeat(auto-fit, minmax(260px, 1fr))`, gap 16px
- **Each card:** `#FFFFFF`, `1px solid #E5E7EB`, `12px` radius, `20px` padding, `--shadow-sm`
- **Card content:**
  - **Store name** (bold, 16px) + **address** (12px, `#6B7280`)
  - **Supply health badge** (dot + label pill, UI_GUIDELINES §8): "Critical" (red) / "Low" (amber) / "Good" (green)
  - **Large days-remaining number** (32px/700, colored): "2" in red-tint color / "5" in amber-tint / "12" in green-tint
  - **Small label:** "days remaining"
  - **Recommended restock date** (12px, gray): "Restock by: March 28"
  - **Checkbox** (top-left corner): for multi-select bulk actions
  - **Buttons (flex, bottom):**
    - [View Details] (secondary, 36px) → opens Store Detail Drawer
    - [Request Supply] (ghost, 36px) → opens New Supply Request drawer pre-filled

#### 4. Store Table View (Alternate)
- **Full-width table** (UI_GUIDELINES §6), white card with `overflow: hidden`
- **Toolbar (above table):** Same search + filters as Grid view
- **Columns:**
  1. ☐ checkbox (center) — "Select all" in header
  2. Store Name & Location (left-align)
  3. Region (left-align)
  4. Supply Health badge (center-align)
  5. Days Remaining (right-align, colored number)
  6. Restock Date (left-align)
  7. Active Requests (right-align, count)
  8. Actions (center-align) — [Details] [Request] icons or overflow menu
- **Rows:** 52px min-height, dividers, hover `#F3F4F6`
- **Pagination:** 25/page default

#### 5. Store Detail Drawer (Right slide-over, 480px)
- **Trigger:** Click [View Details] on card or table row
- **Position:** `position: fixed; right: 0; top: 64px; bottom: 0; width: 480px; z-index: 300`
- **Style:** `#FFFFFF`, `border-left: 1px solid #E5E7EB`, `box-shadow: --shadow-lg` (0 10px 25px rgba(0,0,0,0.2)), `overflow-y: auto`

**Drawer Header (Sticky):**
- **Background:** `#F9FAFB`, **padding:** `20px 24px`, **border-bottom:** `1px solid #E5E7EB`
- **Content:**
  - **Store name** (16px/600, `#222831`) on left
  - **Supply health badge** + **Close [×] button** (40x40px, ghost) on right

**Tabs (Sticky, below header):**
- **Style:** Horizontal tab list, `border-bottom: 1px solid #E5E7EB`, `padding: 0 24px`
- **Tab styling:**
  - Default: `color: #6B7280`, `padding: 12px 20px`, `border-bottom: 2px solid transparent`, cursor pointer
  - Active: `color: #222831` (bold), `border-bottom: 2px solid #FF2E63`
- **Tabs:** **Summary** | **Ingredients** | **Requests** | **History**

**Tab Panes (scroll within drawer, `padding: 20px 24px`):**

**Summary Pane** (default):
- **Overall Status** section:
  - Store address (12px, gray)
  - Supply health badge (large, 20px)
  - Days until critical depletion: "X days remaining" (large number, colored)
  - Recommended restock date: "Restock by: March 28"
- **Ingredient Categories** section (gray heading "Ingredient Levels"):
  - 3–4 rows (Syrups, Sodas, Add-ins, etc.)
  - Per category: category name + **color-coded progress bar** (`#EF4444` <20%, `#F59E0B` 20–50%, `#10B981` >50%) + "X% full"
- **AI Forecast Chart** (small line chart, 240px height):
  - Title: "Supply Forecast (AI Predicted)"
  - X-axis: Dates (next 30 days)
  - Y-axis: Supply level %
  - Line: forecasted depletion curve
  - Colored zone: green (OK), amber (alert), red (critical)
  - recharts `<LineChart>` using `--chart-1` color

**Ingredients Pane:**
- **Table** (simplified, no overflow, just scroll within pane):
  - Columns: Ingredient Name, Category, Current Level %, Avg Daily Usage, Days Remaining, Status badge
  - Rows: dividers, hover `#F3F4F6`
  - Status badges: In Stock (green) / Low (amber) / Critical (red) — dot + label

**Requests Pane:**
- **Active requests** section:
  - List of supply requests for this store (most recent first)
  - Each row: Request ID (link, `#08D9D6`) + ingredients summary + submitted date + status badge (Pending / Approved / In Transit / Delivered) + ETA
  - Dividers between rows
  - **Empty state:** "No active requests for this store"
- **Quick request button:** [New Request for This Store] button (secondary, full-width) — opens New Supply Request drawer pre-filled

**History Pane:**
- **Supply movement log** — chronological list of past deliveries to this store
- Each row: date + ingredients + quantity delivered + from location (hub or nearby store) + notes
- Dividers, 12px text, gray color
- Reverse-chronological order (newest first)
- Pagination: 10 items shown, [Load More] button

---

## Page 3: Inventory

**Route:** `/logistics/inventory`

**Layout:** Full-width content area with tabs.

### Sections

#### 1. Page Header
- **H1:** "Inventory"
- **Time range selector** (secondary button group, right side): [This Week] / [This Month] / [Last 30 Days] — determines data in both tabs

#### 2. Tabs
- **Style:** Same as Store Detail Drawer tabs (horizontal tab list, active border-bottom `#FF2E63`)
- **Tabs:** [Supply Levels] (default) | [Usage Trends]

### Tab 1: Supply Levels

#### Search & Filter Toolbar
- **Search input:** 280px, placeholder "Search by ingredient name…"
- **Filter dropdowns:**
  - **Category:** All / Syrups / Sodas / Add-ins
  - **Level:** All / Low (<20%) / Medium (20–50%) / High (>50%)
- **Clear filters link:** Ghost `#08D9D6`, 12px
- **Padding:** `16px`, **border-bottom:** `1px solid #E5E7EB`

#### Supply Levels Table
- **Full-width table** (UI_GUIDELINES §6): white card, `overflow: hidden`
- **Sortable columns:**
  1. Ingredient Name (left-align)
  2. Category (left-align)
  3. Current Level % (right-align) — with inline progress bar (`#EF4444` <20%, `#F59E0B` 20–50%, `#10B981` >50%)
  4. Avg Daily Usage (right-align, units — e.g., "12 gal/day")
  5. Days Remaining (right-align, number — e.g., "15 days")
  6. Trend (center-align) — arrow icon (↑ green / ↓ red / → gray) with % change
  7. Status badge (center-align) — In Stock (green) / Low (amber) / Critical (red)
- **Rows:** 52px min-height, dividers, hover `#F3F4F6`
- **Sort indicators:** Click column header to sort; active column shows `#FF2E63` arrow
- **Pagination:** 25/page

#### Empty State
- "No ingredients found. Try adjusting filters."

### Tab 2: Usage Trends

#### AI Generated Label
- **Sticky badge** (amber, 12px, `--badge-warning-bg`): "AI Generated" — appears in the tab area or as a sub-heading

#### Overview Charts Row (col-6 | col-6)

**Left chart (col-6):** **Top Trending Ingredients**
- **Card:** `#FFFFFF`, `1px solid #E5E7EB`, `12px` radius, `20px` padding
- **Title:** "Top Trending Ingredients" (H3)
- **Chart:** Horizontal bar chart (recharts `<BarChart>`)
  - **X-axis:** Ingredient names (e.g., "Cherry Syrup", "Mango Soda")
  - **Y-axis:** Popularity % or volume
  - **Two series:** This period (color `--chart-1: #FF2E63`) | Previous period (color `--chart-2: #08D9D6`)
  - **Legend:** Below chart
- **Height:** 280px

**Right chart (col-6):** **Regional Variation**
- **Card:** Same style
- **Title:** "Ingredient Preference by Region" (H3)
- **Chart:** Grouped bar chart (recharts `<BarChart>`)
  - **X-axis:** Regions (North, South, East, West, etc.)
  - **Y-axis:** Ingredient popularity %
  - **Multiple series:** 3–4 top ingredients, each colored with 6-color chart palette (UI_GUIDELINES §7)
  - **Legend:** Below chart
- **Height:** 280px

#### Seasonal Patterns Chart (Full width)
- **Card:** Same style
- **Title:** "Seasonal Patterns" (H3) + "AI Generated" badge
- **Chart:** Line chart (recharts `<LineChart>`)
  - **X-axis:** Months (12 months, past or future)
  - **Y-axis:** Ingredient popularity %
  - **Multiple series:** 3–4 ingredients, each colored from 6-color chart palette
  - **Hover:** Tooltip showing exact values
  - **Legend:** Right side of chart
- **Height:** 320px

#### AI Insights Panel (Full width)
- **Card:** `#FFFFFF`, `1px solid #E5E7EB`, `12px` radius, `20px` padding, background `#F9FAFB` (subtle)
- **Header:** "AI Insights" (H3) + "AI Generated" badge (amber)
- **Content:** Bulleted list of insights (12px text, `#222831`):
  - Example bullets:
    - "Cherry Syrup trending +18% vs. last month — expected to remain high through Q2"
    - "Mango products outperform in South and East regions by 22%"
    - "Seasonal uptick in cold beverages starts mid-March; recommend increasing soda inventory"
    - "Add-in popularity stable; no significant trends detected"
- **Footer:** "Report generated with ML models; forecast accuracy 87%" (10px, gray)

---

## Page 4: Deliveries

**Route:** `/logistics/deliveries`

**Layout:** Full-width content area with view sub-navigation.

### Sections

#### 1. Page Header
- **H1:** "Deliveries"
- **Sub-nav toggle** (secondary button group, right side): [Planning] | [Route Builder] | [Automated] — default [Planning]

### Sub-View 1: Planning (Default)

#### Planning Table
- **Full-width table** (UI_GUIDELINES §6): white card
- **Toolbar (above table):**
  - **Search input:** 280px, placeholder "Search stores…"
  - **Filter by urgency dropdown:**
    - Immediate (0–1 days)
    - This Week (2–5 days)
    - Next Week (6–10 days)
    - OK (>10 days)
  - **Sortable columns:** Store Name, Current Supply %, Depletion Date, Restock Window, Last Delivery, Actions
- **Columns:**
  1. Store Name & Location (left-align)
  2. Current Supply % (right-align) — with inline progress bar (`#EF4444` <20%, `#F59E0B` 20–50%, `#10B981` >50%)
  3. Forecasted Depletion Date (left-align) — "March 25, 2026"
  4. Suggested Restock Window (center-align) — colored pill badge: "Immediate" (red) / "This Week" (amber) / "Next Week" (blue) / "OK" (green)
  5. Last Delivery (left-align) — "3 days ago"
  6. Actions (center-align) — [Schedule] [Add to Route] buttons (secondary, 36px)
- **Rows:** 52px min-height, dividers, hover `#F3F4F6`
- **Row highlighting:** Rows marked "Immediate" get a subtle red left-border or `alertBanner.critical` style row
- **Pagination:** 25/page

#### Actionable Buttons Above Table
- **[Suggest Delivery Route]** primary button (left side) — triggers Route Builder with AI-optimized suggestion for stores needing immediate/this-week restock

#### Empty State
- "No stores requiring delivery. [All stores well-stocked →]"

### Sub-View 2: Route Builder

#### Split Layout (col-5 | col-7)

**Left column (col-5): Store Selector**
- **Card:** `#FFFFFF`, `1px solid #E5E7EB`, `12px` radius, `20px` padding
- **Header:** "Available Stores" (H3) + search input (full-width) + "Add All to Route" link (ghost)
- **Content:** Scrollable list of stores (each store not yet in route sequence):
  - Checkbox + **store name** (bold) + **address** (gray, 12px) + **supply health badge** (small) + **days remaining** (amber/red colored number) + **[Add]** button
  - Dividers between rows, hover `#F3F4F6`
  - Sort: by urgency (days remaining, ascending) — stores needing supply sooner appear first

**Right column (col-7): Route Sequence**
- **Card:** Same style
- **Header:** "Route Sequence" (H3) + **total time estimate** (18px, bold, right-aligned) — e.g., "Est. 6h 45m"
- **Content:** Ordered list of stores in planned delivery route:
  - Each row shows:
    - **Stop number** (e.g., "1.", "2.", in `#6B7280`)
    - **Drag handle icon** (6 dots, for reorder) + **store name** (bold) + **address** (gray)
    - **Est. delivery time** (12px, gray) — e.g., "8:30–9:15am" or "25 min"
    - **Cumulative time** (12px, gray, right-aligned) — e.g., "1h 30m elapsed"
    - **[×]** remove button (ghost icon, removes stop from route)
  - Dividers between rows
  - **Drag-to-reorder:** Dragging a row re-orders sequence and updates time estimates in real-time
  - **Empty state:** "Add stores from left panel to create route"
- **Buttons below list (full-width, stacked):**
  - **[AI Suggest Optimal Route]** secondary button — auto-sorts all selected stores by delivery efficiency + urgency (uses AI backend)
  - **[Open Route in Maps]** ghost link, target="_blank" — generates Google Maps URL with all waypoints + opens in new tab
  - **[Accept & Schedule]** primary button — saves route and opens scheduling dialog

#### Route Scheduling Dialog (Modal)
- Triggered by [Accept & Schedule] button
- **Title:** "Schedule Delivery"
- **Form:**
  - Delivery date: date picker
  - Driver assignment: dropdown (select from available drivers)
  - Notes: textarea (optional)
  - [Confirm & Save] primary button + [Cancel] ghost button

### Sub-View 3: Automated Scheduling

#### Recurring Schedule Form
- **Card:** `#FFFFFF`, `1px solid #E5E7EB`, `12px` radius, `20px` padding
- **Title:** "Create Recurring Delivery Schedule" (H3)
- **Form fields:**
  - **Pattern:** Radio group
    - [Weekly] — every 7 days
    - [Bi-weekly] — every 14 days
    - [Custom] — custom interval (shows interval input field, in days)
  - **Day of week:** Dropdown (Monday–Sunday) — which day to deliver
  - **Preferred time window:** Two time inputs (start and end time, e.g., 8:00am – 5:00pm)
  - **Hub assignment:** Dropdown (select which hub supplies the route)
  - **Target stores:** Multi-select (select which stores are part of this recurring route) or checkbox list
  - **Notes:** Textarea (optional, special instructions)
  - **[Save Recurring Schedule]** primary button + **[Cancel]** ghost button

#### Existing Recurring Schedules Table
- **Full-width table** (below form)
- **Title:** "Active Recurring Schedules" (H3)
- **Columns:**
  1. Pattern (left-align) — "Weekly on Fridays" / "Bi-weekly"
  2. Next Run Date (left-align)
  3. Stores (left-align) — count, e.g., "5 stores"
  4. Time Window (left-align) — "8:00am–3:00pm"
  5. Hub (left-align)
  6. Actions (center-align) — [Edit] [Pause] [Delete] buttons (secondary/ghost)
- **Rows:** 52px, dividers, hover `#F3F4F6`
- **Empty state:** "No recurring schedules. [Create one →]"

---

## Page 5: Supply Requests

**Route:** `/logistics/requests`

**Layout:** Full-width content area.

### Sections

#### 1. Page Header
- **H1:** "Supply Requests"
- **Primary action:** **[New Request]** button (right side, primary style) — opens New Supply Request Drawer

#### 2. Pending Requests Table
- **Full-width table** (UI_GUIDELINES §6): white card
- **Toolbar (above table):**
  - **Search input:** 280px, placeholder "Search by store or request ID…"
  - **Filter dropdowns:**
    - **Status:** All / Pending / Approved / In Transit / Delivered
    - **Delivery type:** All / From Hub / From Nearby Store
  - **Clear filters link:** Ghost `#08D9D6`
- **Columns:**
  1. Request ID (left-align) — formatted ID (e.g., "REQ-2026-0142"), clickable to expand row
  2. Store (left-align) — store name + location (12px gray)
  3. Ingredients (left-align) — summary text (e.g., "Cherry Syrup, Mango Soda, ...") — clickable to expand
  4. Submitted Date (left-align)
  5. Status badge (center-align) — Pending (gray) / Approved (blue) / In Transit (cyan) / Delivered (green)
  6. Delivery Type (left-align) — "From Hub" or "From [Store Name]"
  7. ETA (left-align) — expected delivery date/time, or "—" if not scheduled
  8. Actions (center-align) — [View] icon / [Cancel] link (if status is Pending)
- **Rows:** 52px, dividers, hover `#F3F4F6`
- **Expandable rows:** Click Request ID to expand and show:
  - Per-ingredient breakdown (ingredient + qty requested + qty confirmed)
  - Full delivery address
  - Notes
  - Approval timeline (dates/times)
- **Pagination:** 25/page

#### 3. Completed Requests (Collapsible Card)
- **Below pending table**
- **Card header:** "Completed Requests" (H3) + [Toggle ▼] collapse button (right-aligned)
- **Initially collapsed** — user clicks header to expand
- **Same table format as pending requests:**
  - Columns: Request ID, Store, Ingredients, Submitted Date, Completed Date, Delivered Date, Qty Confirmed
  - No Actions column (read-only)
  - Pagination: 25/page

#### 4. New Supply Request Drawer (Right slide-over, 480px)
- **Trigger:** Click [New Request] button in page header
- **Position:** Same as Store Detail Drawer
- **Header:** "New Supply Request" (H3) + [×] close button

**Form (inside drawer, `padding: 20px 24px`):**

- **Hub field** (read-only, gray background):
  - Label: "From Hub"
  - Value: Current hub name (e.g., "Chicago Hub")

- **Requesting Store** (required):
  - Label: "To Store"
  - Dropdown: Searchable list of stores, grouped by region
  - Show store name + address + current supply % (small indicator)

- **Ingredients Section** (required):
  - Label: "Ingredients to Order" (H4, 16px)
  - Table-like layout (simplified):
    - Headers: Ingredient | Qty Needed | AI Suggested | Notes
    - Rows: one per ingredient (pre-populated with common ingredients for that store, or empty initially)
    - Per row:
      - **Ingredient name** (bold) — editable dropdown if editing
      - **Qty input** — number field (required), units (gal, case, lb, etc.)
      - **AI suggested qty** (gray, read-only) — e.g., "(Suggested: 15 gal)" — click to auto-fill
      - **Add row** link (ghost) — adds a blank ingredient row at bottom
      - **[×] remove** button on each row (except first)

- **Delivery Type** (required):
  - Label: "Delivery Source"
  - Radio group:
    - [●] Request from Supply Hub (default)
    - [●] Request from Nearby Store (within 100 miles) — shows secondary dropdown to select source store
      - If selected: Dropdown "Choose Source Store" — searchable list of nearby stores with supply levels
      - Show "X stores available with this ingredient" (blue text, informational)

- **Notes** (optional):
  - Label: "Special Instructions" (e.g., "Deliver after 6pm", "Ring doorbell three times")
  - Textarea: `12px`, `#E5E7EB` border, 3 rows

- **Buttons (full-width, stacked, `margin-top: 20px`):**
  - **[Submit Request]** primary button
  - **[Cancel]** ghost button

**Post-submission:**
- Drawer closes, toast notification appears: "Request submitted successfully — ID: REQ-2026-0145" (green success toast from UI_GUIDELINES §10)
- New request appears in Pending Requests table

---

## Component Cross-References

All dashboard components follow the **Dashboard UI Standards** (UI_GUIDELINES.md). Specific sections:

| Component | UI_GUIDELINES Section |
|---|---|
| Layout shell (header/sidebar/main) | §1, §2, §3 |
| KPI Cards | §5 |
| Data Tables | §6 |
| Status Badges (dot + label) | §8 |
| Chart colors & specs (bar, line, donut) | §7 |
| Alert banners (critical/warning/info/success) | §10 |
| Toast notifications | §10 |
| Skeleton loaders & empty states | §11 |
| Modal/Drawer patterns | §1, §3 (header pattern) |

---

## Priority Legend

- **(M)** = Must Have (MVP — launch this, fully functional)
- **(S)** = Should Have (high value, implement ASAP post-MVP)
- **(C)** = Could Have (nice to have, consider for future releases)

---

## Key Differences from Mobile LLD

The web version prioritizes:
1. **Sidebar navigation** — All major sections (Overview, Stores, Inventory, Deliveries, Supply Requests) are distinct pages, not floating panels
2. **Wide-screen layout** — Content uses full horizontal space; tables have more columns and detail
3. **Store Detail as drawer** — Right slide-over (480px, not full screen) keeps store list visible while inspecting details
4. **Route Builder split panel** — Left column for store selection, right column for route sequence with drag-to-reorder
5. **AI insights dedicated page** — Inventory page has a full "Usage Trends" tab with charts + insights (not modal/sheet)
6. **Grid/Table view toggle for Stores** — Stores page defaults to grid (card layout), optional table view
7. **Drag-and-drop route sequencing** — Web natively supports drag-and-drop for reordering
8. **Google Maps integration** — Links to Maps (not embedded maps; web doesn't embed easily)
9. **Recurring schedules** — Automated Scheduling sub-view allows pattern definition + schedule management
10. **No offline support** — Dropped from MVP; assume reliable internet connection

---

*Last Updated: 2026-03-27*
