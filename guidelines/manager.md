# ---vvv IMPORTANT NOTES FOR CREATING THIS PAGE: vvv---
* All UI guidelines (color schema, etc) can be found in guidelines/UI_GUIDELINES.md under "Dashboard UI Standards".
* Do not worry about implementing any of the backend (but I do want users with the proper permissions to be able to at least login and click around the page)
* At the end, make a list of everything that was made a part of the UI that is not yet in the backend. Place in doc "docs/newDocs/DashboardBackendImplementation/backend_todo.md". Doc should be organized by dashboard and split into simple tasks.
# ---^^^ IMPORTANT NOTES FOR CREATING THIS PAGE: ^^^---


**(M) Manager Dashboard** — Web Implementation Guide

Last updated: 2026-03-28. All patterns follow `UI_GUIDELINES.md`. Reference the logistics dashboard (`dashboards_frontend/src/pages/logistics/`) as the canonical architecture pattern.

---

## File Structure

```
dashboards_frontend/src/pages/manager/
├── ManagerDashboard.jsx          ← shell: state, Sidebar, TopBar, page switcher
├── ManagerDashboard.module.css
├── mockData.js                   ← all mock data (KPIs, alerts, inventory, requests)
├── components/
│   ├── Sidebar.jsx               ← 5 nav items, collapse support, mobile overlay
│   ├── Sidebar.module.css
│   ├── TopBar.jsx                ← logo, page title, notifications bell, user badge, logout
│   └── TopBar.module.css
└── pages/
    ├── Overview.jsx
    ├── Overview.module.css
    ├── Revenue.jsx
    ├── Revenue.module.css
    ├── Inventory.jsx
    ├── Inventory.module.css
    ├── OrderStats.jsx
    ├── OrderStats.module.css
    ├── SupplyRequests.jsx
    └── SupplyRequests.module.css
```

---

## Sidebar Navigation

Fixed left sidebar (256px / 64px collapsed) with dark `#222831` background per UI_GUIDELINES §2.

| Label | Page ID | Icon |
|---|---|---|
| Overview | `overview` | 🏠 |
| Revenue | `revenue` | 💰 |
| Inventory | `inventory` | 📦 |
| Order Stats | `orders` | 📊 |
| Supply Requests | `requests` | 🚚 |

Active item: `rgba(255,46,99,0.15)` bg + white text + `4px solid #FF2E63` left border. Default text `#A8B3C0`.

---

## Shell Layout

Standard layout shell per UI_GUIDELINES §1:
- Fixed top header: 64px height, white, `z-index: 200`
- Fixed sidebar: 256px full / 64px collapsed, `z-index: 100`
- Main content: `margin-left: 256px`, `padding-top: 64px`, `background: #F9FAFB`, `padding: 32px`, `max-width: 1440px`

**TopBar** (mirrors logistics `TopBar.jsx`): "code**pop**" logo (§3 spec), "Manager Dashboard" page title, notifications bell with badge count from urgent alerts (flyout 360px wide, `z-index: 300`, shows top 5 unread), user first name, logout button.

---

## Pages

---

### Overview Page
*Replaces: Navigation Hub + Notifications Center*

**Quick Access Cards** — top section, 3-column CSS grid (`repeat(auto-fit, minmax(200px, 1fr))`), gap 16px.

Cards use the KPI card spec (UI_GUIDELINES §5): icon in 40px tinted rounded square, label, value or badge count. Clicking a card calls `onNavigate(pageId)` to switch sidebar pages. Cards:
- Notifications (badge count of unread alerts)
- Revenue Report
- Inventory Report
- Order Statistics
- Supply Requests
- (S) Settings

**Notifications / Alerts Panel** — below cards, full-width.

Render as an inline list of alert rows using the severity left-border pattern (UI_GUIDELINES §10): `4px solid` left border colored by severity. Each row:
- Severity badge (UI_GUIDELINES §8 dot + pill: Critical/Warning/Info/Resolved)
- Alert message text
- Timestamp (right-aligned, `12px/#6B7280`)
- Dismiss button (ghost, `×`)

(S) Alerts sorted by urgency then timestamp. Example alerts:
- "Vanilla syrup at 15% — suggest ordering 50 units from Supply Hub by Friday" (Warning)
- (S) "Supply delivery arriving today 2–4pm" (Info)

No modals — everything is inline and dismissible.

---

### Revenue Page
*Replaces: Revenue & Performance Report with modal drill-downs*

**KPI Cards row** — 4 cards using `super-admin/components/KPICard` (reuse existing component):
- Total Revenue (this month) — with delta vs. last month
- Inventory Costs (this month, % of revenue)
- Total User Accounts (assigned to location)
- Active Orders count

**Revenue Chart** — below KPI row. `recharts` `LineChart` or `BarChart` (per UI_GUIDELINES §7). Last 30 days revenue trend. Uses chart color `#FF2E63` as primary line. Dark tooltip (`#222831` bg). Grid lines `#E5E7EB`. Axis ticks `11px/#6B7280`.

**Drill-down Table** — below chart. Standard table per UI_GUIDELINES §6: sticky header (`#F9FAFB` bg, `12px/600/#6B7280` uppercase), 52px row height, `12px 16px` padding, hover `#F3F4F6`, `1px solid #E5E7EB` dividers, 25/page pagination. Columns: Date, Category, Items, Revenue, vs. Last Period.

---

### Inventory Page
*Replaces: Inventory Report with category tab screens*

**Category Tabs** — pill tab bar: Syrups / Sodas / Add-ins. Active tab: `background: #FF2E63`, white text. Switching tabs filters the stock grid below.

**Stock Grid** — CSS grid of item cards (`repeat(auto-fit, minmax(220px, 1fr))`). Each card (white, 12px radius, 20px padding, shadow-sm):
- Item name (`16px/600`)
- Current level + % capacity
- Days remaining (`12px/#6B7280`)
- Horizontal progress bar: green ≥50%, amber 20–49%, red <20% (per §8 badge colors)
- Usage trend label
- "Add to Request" ghost button → navigates to Supply Requests page

Sort/filter bar above grid: Sort by (Category / Stock Level / Urgency), Filter by status (All / Low / Critical).

**Cooler Status Grid** — separate section below stock grid. Label: "Cooler Status — *Feature Coming Soon*" (dimmed, `opacity: 0.5`). Grid of cooler slot cards each showing name + status badge (Online/Offline/Under Repair per §8). For full coolers: age of drink + replacement recommendation note.

**AI Ordering Recommendations** — highlighted callout card with `#08D9D6` left accent border (`4px solid`). Lists recommended quantities per ingredient. Shows recommended suppliers ranked by price/delivery time. "Accept & Order" primary button (`#FF2E63`) → navigates to Supply Requests page with form pre-filled.

**(C) Nearby Store Comparison** — collapsible section below AI card. Quick view of neighboring store stock levels.

**(C) Supply Hub Inventory** — collapsible section. Available stock at assigned hub.

---

### Order Stats Page
*Replaces: Order Statistics screens*

**Popular Items** — `recharts` `BarChart` showing top items (syrups, sodas, add-ins) ranked by order volume. Horizontal bar chart, 6-color chart palette from §7.

**Time-Based Trends** — two charts side by side on desktop, stacked on mobile:
- Peak Hours: `recharts` `AreaChart` (hourly, 0–24h)
- Peak Days: `recharts` `BarChart` (Mon–Sun)

(S) Date range selector: Last 30 days / Last 90 days toggle.

**Performance Metrics** — KPI card row (using `KPICard`):
- Order Volume this week — delta vs. last week
- Order Volume this month — delta vs. last month
- (C) Average fulfillment time (order placed → picked up)
- (C) Customer satisfaction score (if available)

---

### Supply Requests Page
*Replaces: Request form + pending list as separate app screens*

**Two-column layout** on desktop (`grid-template-columns: 2fr 3fr`, gap 24px). Stacks to single column on mobile (<768px).

**Left Column — Request Submission Form:**
- Pre-filled: Store location (read-only field)
- AI-suggested quantities per ingredient (editable number inputs, label shows AI badge in `#08D9D6`)
- Two action buttons:
  - (M) [Request from Supply Hub] — primary `#FF2E63` button
  - (C) [Request from Nearby Store] — secondary button, opens a dropdown of stores within 100 miles
- [Submit Request] button (primary, full-width, min-height 44px)

**Right Column — Pending Requests Tracker:**

Upper half: table per UI_GUIDELINES §6. Columns: Request ID, Items, Quantity, Submitted Date, ETA, Status badge. Status values: Submitted / Approved / In Transit / Delivered (§8 badge colors). (S) ETA tracking with progress step indicator (Submitted → Approved → In Transit → Delivered).

Lower half: **Supply Movement History** table. Columns: Date, Item(s), Quantity, Source, Status badge. Sortable headers (active sort arrow in `#FF2E63`). 25/page pagination. Filter bar: Status / Date Range / Item Type.

---

## Styling Rules

- CSS Modules only (no Tailwind, no global styles except `tokens.css`)
- Inline `style` props only for dynamic computed values (e.g., progress bar width, badge color)
- All color values from UI_GUIDELINES tokens
- All spacing in multiples of 8px
- Card border-radius: 12px; button/input border-radius: 8px
- Button min-height: 44px (accessibility)

## Priority Legend

- **(M)** Must Have — implement for MVP
- **(S)** Should Have — implement if time allows
- **(C)** Could Have — stretch goal
