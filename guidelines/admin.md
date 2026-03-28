# ---vvv IMPORTANT NOTES FOR CREATING THIS PAGE: vvv---
* All UI guidelines (color schema, etc) can be found in guidelines/UI_GUIDELINES.md under "Dashboard UI Standards".
* Do not worry about implementing any of the backend (but I do want users with the proper permissions to be able to at least login and click around the page)
* At the end, make a list of everything that was made a part of the UI that is not yet in the backend. Place in doc "docs/newDocs/DashboardBackendImplementation/backend_todo.md". Doc should be organized by dashboard and split into simple tasks.
# ---^^^ IMPORTANT NOTES FOR CREATING THIS PAGE: ^^^---

# Admin Dashboard (Web)

## Page Structure

Layout: Fixed header (64px) + fixed sidebar (256px, dark `#222831`) + main content area.

**Sidebar Nav Groups:**
- **Overview:** Dashboard home
- **User Management:** Users, Managers
- **System:** Roles & Permissions, Audit Trail

**Content Area:** 12-column grid, padding 32px, background `#F9FAFB`. All sections below are within this main area.

---

## KPI Cards Row

Display six key metrics in a `repeat(auto-fit, minmax(180px, 1fr))` grid layout with 16px gap.

**KPI Cards spec:** `#FFFFFF` bg, `1px solid #E5E7EB` border, `12px` radius, `20px` padding, shadow Level 1. Each card:
- Icon bg: 40px × 40px, 10px radius, 0.12 opacity color tint
- Label: 12px / 400 / `#6B7280`
- Value: 28px / 700 / `#222831`
- Delta: 12px / 600 (green for ↑, red for ↓)

**Admin KPI cards:**
1. **Total Users** — Users icon / blue tint `rgba(59,130,246,0.12)`
2. **Active Users** — checkmark / success tint `rgba(16,185,129,0.12)`
3. **Disabled Accounts** — warning / amber tint `rgba(245,158,11,0.12)`
4. **Total Managers** — person-crown / primary tint `rgba(255,46,99,0.12)`
5. **Custom Roles** — roles / cyan tint `rgba(8,217,214,0.12)`
6. **Recent Audit Events** — alert / error tint `rgba(239,68,68,0.12)`

---

## User Management

**Section Layout:** Column spanning full width or col-12 in grid.

### Toolbar

Flex row, gap 12px, padding 16px, border-bottom `1px solid #E5E7EB`. Items (left to right):
- Search input: 280px max, placeholder "Search by name or email"
- Filter tabs (inline): [All] [Active] [Disabled] [Deleted] — toggle active state bg `#F9FAFB` + `2px bottom border #FF2E63`
- Spacer (flex: 1)
- **[+ Add User]** primary button

### Data Table

**Header row:** bg `#F9FAFB`, border-bottom `2px solid #E5E7EB`, font 12px/600/`#6B7280` uppercase, `letter-spacing: 0.05em`, padding `12px 16px`, sticky top.

**Columns:** Name | Email | Location/Region | Role | Last Login | Status | Actions

**Status Column Values & Badge Styles:**
- Active: green dot + "Active" label, `#10B981` color, `rgba(16,185,129,0.12)` bg
- Disabled: amber dot + "Disabled", `#F59E0B` color, `rgba(245,158,11,0.12)` bg
- Deleted: gray dot + "Deleted" (strikethrough), `#6B7280` color, row at `opacity: 0.6`

**Data rows:** min-height 52px, padding `12px 16px`, border-bottom `1px solid #E5E7EB`, font 14px/`#222831`, hover bg `#F3F4F6`.

**Row Actions Column:**
- Active accounts: icon buttons [Edit] [Disable] [Make Manager] [Delete] — if > 2, collapse to `...` overflow popover
- Disabled accounts: icon buttons [Edit] [Enable] [Delete]
- Deleted accounts: text "View only" (non-recoverable log)

**Bulk Actions Toolbar** (appears when rows selected):
- Flex row, padding 16px, bg `rgba(255,46,99,0.04)`, border-bottom `1px solid #FF2E63`
- Text: "X selected" (bold)
- Buttons: [Disable Selected] [Reset Passwords] [Export] (secondary style)

**Pagination:** "Showing X–Y of Z results" + page buttons (32px × 32px). Default: 25 rows. Options: 25 / 50 / 100.

### Add User Modal

Triggered by **[+ Add User]** button. Right-side drawer or full modal with form fields:
- Name, Email, Role (dropdown), Location/Region (dropdown), Password (generated or user-set)
- Buttons: [Create] [Cancel]

---

## Manager Accounts

**Section Layout:** Full width column or col-12 in grid.

### Toolbar

Flex row, gap 12px, padding 16px, border-bottom `1px solid #E5E7EB`. Items:
- Search input: 280px max, placeholder "Search by name or email"
- Filter dropdown: Region/Store selection (secondary button style, 36px height, chevron icon)
- Spacer
- **[+ Promote to Manager]** primary button

### Data Table

**Header row:** Same style as User Management (sticky `#F9FAFB`, `2px border #E5E7EB`).

**Columns:** Name | Email | Region(s)/Store(s) | Reports To | Active Users Under | Last Login | Actions

**Data rows:** min-height 52px, hover bg `#F3F4F6`. Font 14px / `#222831`.

**Row Actions:** `...` overflow popover with options [Edit] [View Reports] [Reset Password] [Disable].

**Pagination:** 25 rows default.

### Promote to Manager Modal

Triggered by **[+ Promote to Manager]** button. Modal or right-side drawer:
- Search field: "Select an active user to promote"
- Active users list (filterable): Name, Email, Current Role
- Region/Store assignment dropdown (multi-select)
- Buttons: [Promote] [Cancel]

---

## Role & Permission Management

**Section Layout:** Full width, col-12.

### Roles Grid

Display all roles (Super Admin, Admin, Manager, Staff, Repair Staff, + any custom roles) as cards in a `repeat(auto-fit, minmax(240px, 1fr))` grid, gap 16px.

**Role Card Spec:** `#FFFFFF` bg, `1px solid #E5E7EB` border, `12px` radius, `16px` padding, shadow Level 1.

**Card Content:**
- Role name: 16px / 600 / `#222831`
- Permission count badge: pill style, 12px/600, `#FF2E63` bg + white text
- Active user count: 12px / `#6B7280`
- Action buttons: [Edit] [Delete] secondary style, 32px height, pinned bottom

### Edit Role Modal

Triggered by [Edit] on a role card. Full-panel modal or wide drawer:
- Title: "Edit [Role Name]"
- Permission checklist grouped by capability category (e.g., "User Management", "System Settings", "Reporting")
- Toggle switches for each permission
- Buttons: [Save] [Cancel]

### Create Custom Role

**[+ Custom Role]** button in page header (next to page title).

Opens same modal as Edit Role, but blank:
- Role name input field
- Permission checklist (all unchecked by default)
- Buttons: [Create] [Cancel]

---

## System Audit Trail

**Section Layout:** Full width, col-12.

### Toolbar

Flex row, gap 12px, padding 16px, border-bottom `1px solid #E5E7EB`. Items:
- Date-range picker: "From [date] to [date]" (secondary button style)
- Filter dropdown: "Action Type" (secondary, 36px height)
- Filter dropdown: "Actor" (secondary, 36px height)
- Spacer
- **[Export CSV]** secondary button

### Data Table

**Header row:** bg `#F9FAFB`, `2px border #E5E7EB`, sticky top, 12px/600/`#6B7280` uppercase.

**Columns:** Timestamp | Actor | Action | Target | Status

**Data rows:**
- Min-height 52px, padding `12px 16px`, border-bottom `1px solid #E5E7EB`
- **Zebra striping allowed** (exception: read-only log with many columns for easier scanning)
- Hover bg `#F3F4F6`
- Font 14px / `#222831`

**Column Details:**
- Timestamp: Left-aligned, e.g. "2026-03-28 14:32:15"
- Actor: Name + role badge (secondary color bg, 12px font)
- Action: e.g., "User Created", "Role Updated", "Password Reset"
- Target: Resource name or ID affected
- Status: Badge — green "Success" or red "Failed"

**No row actions** (view-only log).

**Pagination:** 50 rows default, "Showing X–Y of Z".

---

## Notes

- All modals: 480px–640px width (right-side drawer on desktop), full-width on mobile
- All tables: Numbers right-aligned, text left-aligned, badges center-aligned
- All buttons: 44px min height for mobile touch targets
- All colors: Reference `UI_GUIDELINES.md` Section 9 (CSS Custom Properties) for tokens
- Search inputs: max-width 280px, follow form input spec from `UI_GUIDELINES.md`
- All status badges: use exact dot + label pattern from `UI_GUIDELINES.md` Section 8