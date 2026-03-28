# CodePop UI Guidelines

## Overview
These guidelines ensure a clean, modern, and consistent UI across the entire CodePop application. All developers should follow these standards when building new features or modifying existing components.

---

## Color Palette

Use these colors consistently throughout the app. Do not introduce new colors without approval.

| Color | Hex Code | Usage |
|-------|----------|-------|
| **Primary** | `#FF2E63` | CTAs, highlights, active states, primary buttons |
| **Secondary** | `#08D9D6` | Accents, secondary buttons, hover states, links |
| **Background** | `#F9FAFB` | Page backgrounds, light surfaces |
| **Surface** | `#FFFFFF` | Cards, modals, containers, input fields |
| **Text** | `#222831` | Body text, headings, primary text content |

### Page Background Rule
All page-level screens must use white (`#FFFFFF`) as their background color. The `#F9FAFB` Background token is reserved for inset surfaces (e.g., a subtle well inside a white card) only.

### Color Implementation Examples

```javascript
// React Native / React
const colors = {
  primary: '#FF2E63',
  secondary: '#08D9D6',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#222831',
  border: '#E5E7EB', // Light gray for subtle borders
  disabled: '#D1D5DB', // Lighter gray for disabled states
  error: '#EF4444', // Red for errors
  success: '#10B981', // Green for success
  warning: '#F59E0B', // Amber for warnings
};
```

---

## Typography

Create a clear visual hierarchy with purposeful font choices.

### Font Family
- **Headings & Titles**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif` (System fonts)
- **Body & UI Text**: Same system font stack
- **Monospace** (for code): `'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace`

### Font Sizes & Weights

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| **H1** | 32px | 700 (Bold) | Page titles, main headings |
| **H2** | 24px | 700 (Bold) | Section headings |
| **H3** | 20px | 600 (SemiBold) | Subsection headings |
| **Body Large** | 16px | 400 (Regular) | Primary text, descriptions |
| **Body Normal** | 14px | 400 (Regular) | Standard text, labels |
| **Body Small** | 12px | 400 (Regular) | Helper text, secondary info |
| **Caption** | 10px | 400 (Regular) | Timestamps, small metadata |

### Line Height
- **Headings**: 1.2x (tight spacing for impact)
- **Body Text**: 1.5x - 1.6x (comfortable reading)
- **UI Labels**: 1.4x (compact but readable)

### Text Colors
- **Primary Text** (headings, body): `#222831`
- **Secondary Text** (labels, helper text): `#6B7280`
- **Disabled Text**: `#D1D5DB`
- **Links**: `#08D9D6` (secondary color)

---

## Spacing & Layout

Maintain consistent spacing using an 8px grid system. All spacing should be multiples of 8px.

### Spacing Scale
- **XS**: 4px (minimal spacing)
- **S**: 8px (tight spacing)
- **M**: 16px (standard spacing)
- **L**: 24px (generous spacing)
- **XL**: 32px (large spacing)
- **2XL**: 48px (extra large spacing)
- **3XL**: 64px (maximum spacing)

### Padding
- **Buttons**: 12px vertical × 16px horizontal (minimum 44px height for mobile)
- **Cards/Containers**: 16px - 24px
- **Inputs**: 12px vertical × 12px horizontal
- **Page Margins**: 16px (mobile), 24px (tablet), 32px (desktop)

### Margins & Gaps
- **Between sections**: 24px - 32px
- **Between components**: 16px
- **Between form fields**: 16px
- **Between list items**: 12px

---

## Buttons

Buttons should be clear, accessible, and visually distinct.

### Button States
```
Default → Hover → Active → Disabled
```

### Button Styles

#### Primary Button
- **Background**: `#FF2E63` (primary color)
- **Text Color**: `#FFFFFF`
- **Padding**: 12px vertical × 16px horizontal
- **Border Radius**: 8px
- **Font Weight**: 600 (SemiBold)
- **Min Height**: 44px (mobile)
- **Hover**: Darken by 10% or add shadow
- **Active**: Darken by 15%
- **Disabled**: Background `#D1D5DB`, text `#9CA3AF`

#### Secondary Button
- **Background**: `#F3F4F6` (light gray)
- **Text Color**: `#222831`
- **Border**: 1px solid `#E5E7EB`
- **Padding**: 12px vertical × 16px horizontal
- **Border Radius**: 8px
- **Font Weight**: 600 (SemiBold)
- **Hover**: Background `#E5E7EB`
- **Active**: Background `#D1D5DB`

#### Tertiary/Ghost Button
- **Background**: Transparent
- **Text Color**: `#08D9D6` (secondary color)
- **Padding**: 12px vertical × 16px horizontal
- **Border Radius**: 8px
- **Font Weight**: 600 (SemiBold)
- **Hover**: Background `#F3F4F6`
- **Active**: Background `#E5E7EB`

#### Danger Button
- **Background**: `#EF4444` (red)
- **Text Color**: `#FFFFFF`
- **Padding**: 12px vertical × 16px horizontal
- **Border Radius**: 8px
- **Font Weight**: 600 (SemiBold)
- **Hover**: Darken by 10%
- **Disabled**: Background `#D1D5DB`

### Button Rules
- Always include a minimum height of 44px for mobile accessibility
- Use clear, action-oriented text (e.g., "Save", "Delete", "Submit")
- Icons can accompany text but should not be the only indicator
- Avoid button text longer than 2 words when possible

---

## Cards & Containers

Cards organize content and create visual separation.

### Card Styling
- **Background**: `#FFFFFF` (surface color)
- **Border Radius**: 12px
- **Padding**: 16px - 24px
- **Shadow**:
  - Default: `0 1px 3px rgba(0, 0, 0, 0.1)`
  - Hover: `0 4px 12px rgba(0, 0, 0, 0.15)`
  - Interactive: `0 10px 25px rgba(0, 0, 0, 0.2)`
- **Border**: 1px solid `#E5E7EB` (optional, for subtle definition)

### Elevation Hierarchy
- **Flat** (no shadow): Body text, images
- **Level 1** (subtle shadow): Cards, containers
- **Level 2** (medium shadow): Hovered cards, dropdowns
- **Level 3** (strong shadow): Modals, popovers, floating elements

---

## Forms & Inputs

Keep form interactions clean and intuitive.

### Input Fields
- **Background**: `#FFFFFF` (surface)
- **Border**: 1px solid `#E5E7EB`
- **Border Radius**: 8px
- **Padding**: 12px
- **Font Size**: 14px
- **Font Weight**: 400
- **Text Color**: `#222831`
- **Placeholder Color**: `#9CA3AF` (muted gray)

### Input States
- **Focused**: Border color `#08D9D6` (secondary), shadow `0 0 0 3px rgba(8, 217, 214, 0.1)`
- **Error**: Border color `#EF4444`, background `#FEE2E2`
- **Disabled**: Background `#F3F4F6`, border color `#E5E7EB`, text `#D1D5DB`
- **Filled/Completed**: Border color `#10B981`

### Labels
- **Font Size**: 14px
- **Font Weight**: 600
- **Color**: `#222831`
- **Margin Bottom**: 8px
- **Required indicator**: Use asterisk (*) in primary color if needed

### Error & Helper Text
- **Font Size**: 12px
- **Color**:
  - Error: `#EF4444`
  - Helper: `#6B7280`
- **Margin Top**: 4px

---

## Logo Usage

The CodePop logo is a core brand element and must be used consistently across the entire app.

> **The canonical logo is the `<CodePopLogo>` React Native component below — not `icon.png` or any raster image file. Use this component everywhere the logo appears in the app UI.**

### The Logo Component

The logo renders the "codepop" wordmark entirely in code using `react-native-svg`:
- **"code"** — dark `#222831`, system font, weight 600
- **"pop"** — cyan `#08D9D6`, italic, weight 600
- **Straw** — SVG path through the "o" in "code", stroke `#08D9D6`
- **Bubbles** — two circles above the "o" in "pop", border `#08D9D6`

**Dependency:** `react-native-svg` must be installed.

```jsx
import React from "react";
import { View, Text } from "react-native";
import Svg, { Path } from "react-native-svg";

export function CodePopLogo({ size = 64 }) {
  const s = size / 64; // scale factor
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {/* "code" with straw */}
      <View style={{ position: "relative" }}>
        <Text style={{
          fontSize: size,
          color: "#222831",
          fontWeight: "600",
          letterSpacing: -1,
        }}>code</Text>
        <Svg
          width={50 * s}
          height={90 * s}
          style={{ position: "absolute", left: 30 * s, top: -15 * s }}
        >
          <Path
            d={`M ${20*s} ${85*s} L ${28*s} ${28*s} L ${18*s} ${34*s}`}
            stroke="#08D9D6"
            strokeWidth={4 * s}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      {/* "pop" with bubbles */}
      <View style={{ position: "relative" }}>
        <Text style={{
          fontSize: size,
          color: "#08D9D6",
          fontWeight: "600",
          fontStyle: "italic",
          letterSpacing: -1,
        }}>pop</Text>
        <View style={{
          position: "absolute",
          width: 14 * s, height: 14 * s,
          borderRadius: 7 * s,
          borderWidth: 3, borderColor: "#08D9D6",
          top: 5 * s, left: 52 * s,
        }} />
        <View style={{
          position: "absolute",
          width: 10 * s, height: 10 * s,
          borderRadius: 5 * s,
          borderWidth: 2, borderColor: "#08D9D6",
          top: -8 * s, left: 62 * s,
        }} />
      </View>
    </View>
  );
}
```

### Sizing by Context

| Context | `size` prop |
|---------|-------------|
| Header/Navigation bar | `32` |
| Hero / signed-out home screen | `64` |
| Splash screen | `96` |

### Placement Rules

#### Pages with React Navigation headers (most pages)
Set the logo via `headerTitle` in the screen's `options` inside `App.js`. **Do NOT build a custom header bar inside the page component** — that creates a double header.

```jsx
// In App.js — correct pattern (used on CreateDrink, Cart, etc.)
<Stack.Screen
  name="Cart"
  component={CartPage}
  options={{
    headerTitle: () => <CodePopLogo size={28} />,
    headerTitleAlign: 'center',
  }}
/>
```

- Size `28` is used inside the React Navigation header (slightly smaller than the `32` guide value due to header padding)
- Never use `title: 'CodePop'` or any plain string — always use the component
- Never render a second `<CodePopLogo>` inside the page body on these screens

#### Pages without a React Navigation header (signed-out screens, splash)
These screens set `headerShown: false` and must render the logo themselves in the body:
- **Hero / signed-out screen**: `<CodePopLogo size={64} />` centered
- **Splash screen**: `<CodePopLogo size={96} />` centered

### Logo Whitespace
- Maintain minimum whitespace equal to 1/4 of logo height on all sides
- Do not place logo against competing visuals

### Logo Don'ts
- Never stretch, skew, or distort the logo
- Do not alter colors, remove elements, or add effects
- Do not use `icon.png` or other raster images as a substitute for the component in app UI
- Do not use on backgrounds that reduce contrast

---

## Border Radius

Maintain consistency with corner roundness throughout the app.

| Component | Radius |
|-----------|--------|
| **Buttons** | 8px |
| **Input Fields** | 8px |
| **Cards** | 12px |
| **Modals/Dialogs** | 16px |
| **Images** | 8px - 12px |
| **Avatars** | 50% (full circle) or 8px |

---

## Shadows & Depth

Use shadows sparingly to create subtle depth without visual clutter.

### Shadow System
```
Level 1 (Subtle):  0 1px 3px rgba(0, 0, 0, 0.1)
Level 2 (Medium):  0 4px 12px rgba(0, 0, 0, 0.15)
Level 3 (Strong):  0 10px 25px rgba(0, 0, 0, 0.2)
```

### When to Use Shadows
- Cards and containers: Level 1
- Hovered cards: Level 2
- Modals and dropdowns: Level 3
- Floating buttons: Level 2

---

## Animations & Transitions

Keep animations smooth and purposeful. Use consistent timing.

### Timing
- **Fast interactions** (hover, focus): 150ms - 200ms
- **Standard transitions**: 200ms - 300ms
- **Important transitions** (page navigation, modals): 300ms - 500ms

### Easing Functions
- **Default**: `ease-out` (natural, smooth)
- **Entrance**: `cubic-bezier(0.34, 1.56, 0.64, 1)` (bouncy entrance)
- **Exit**: `ease-in` (quick exit)

### Animation Types
- **Opacity changes**: 200ms
- **Position/scale changes**: 300ms
- **Page transitions**: 400ms - 500ms

### Principles
- Avoid animations on every interaction—use them purposefully
- Respect user's motion preferences (prefers-reduced-motion)
- Keep animations under 500ms to feel responsive

---

## Accessibility

All UI must be accessible to all users.

### Color Contrast
- **Normal text**: Minimum WCAG AA (4.5:1 ratio)
- **Large text** (18px+): Minimum 3:1 ratio
- Do not rely solely on color to convey information

### Touch Targets
- Minimum 44px × 44px for touch targets (mobile)
- Minimum 32px for desktop mouse targets
- Maintain 8px spacing between touch targets

### Focus States
- All interactive elements must have visible focus indicators
- Focus indicators should use secondary color (`#08D9D6`)
- Focus outline width: 2px - 3px

### Keyboard Navigation
- All functionality must be accessible via keyboard
- Tab order should follow logical reading order
- Avoid keyboard traps

### Text & Readability
- Use proper heading hierarchy (H1 → H2 → H3, etc.)
- Keep line length between 50-75 characters for body text
- Provide sufficient spacing between lines (1.5x - 1.6x)

---

## Dark Mode (Future Consideration)

When implementing dark mode:
- Invert the color palette (light becomes dark, dark becomes light)
- Maintain contrast ratios for accessibility
- Use slightly reduced opacity shadows on dark backgrounds
- Test all UI components in both modes

---

## Implementation Checklist

Before publishing any UI component:

- [ ] Uses colors from the approved palette
- [ ] Typography follows the size/weight guidelines
- [ ] Spacing uses the 8px grid system
- [ ] Border radius is consistent with guidelines
- [ ] Buttons follow the specified button styles
- [ ] Focus states are visible and accessible
- [ ] Touch targets are minimum 44px (mobile)
- [ ] Color contrast meets WCAG AA standards
- [ ] Logo (if used) follows usage rules
- [ ] Tested on multiple screen sizes
- [ ] No custom colors or undefined spacing values

---

## Questions & Exceptions

If you need to deviate from these guidelines:
1. Document the exception with reasoning
2. Seek approval from the design lead
3. Update these guidelines if the exception becomes standard

---

# Dashboard UI Standards

This section extends the base CodePop UI Guidelines specifically for the `dashboards_frontend` web application (React + Vite). All five role-based dashboards (Super Admin, Admin, Manager, Repair Staff, Logistics Manager) must follow these standards. These rules are authoritative and specific — every dashboard developer must read this section alongside the base guidelines before writing CSS.

The dashboards app already has `tokens.css` with all base tokens loaded into `:root`. The new CSS custom properties defined in Section 9 belong in that same file, appended after the existing tokens.

## 1. Overall Layout Architecture

Every dashboard uses an identical three-zone shell. The content inside each zone varies by role; the shell does not.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER  (position: fixed; top: 0; left: 0; right: 0; height: 64px;   │
│           z-index: 200; background: #FFFFFF; border-bottom: 1px solid  │
│           #E5E7EB)                                                      │
├────────────────┬────────────────────────────────────────────────────────┤
│  SIDEBAR       │  MAIN CONTENT                                          │
│  (position:    │  (margin-left: 256px at desktop;                       │
│   fixed;       │   padding-top: 64px;                                   │
│   top: 64px;   │   background: #F9FAFB;                                 │
│   left: 0;     │   min-height: calc(100vh - 64px);                      │
│   bottom: 0;   │   overflow-y: auto)                                    │
│   width: 256px;│                                                        │
│   z-index: 100)│                                                        │
└────────────────┴────────────────────────────────────────────────────────┘
```

### Breakpoints

| Name | `min-width` | Sidebar behavior | Content margin-left |
|---|---|---|---|
| Mobile | `< 768px` | Hidden; hamburger opens a drawer overlay | `0` |
| Tablet | `768px` | Collapsed icon rail, `64px` wide | `64px` |
| Desktop | `1280px` | Full sidebar, `256px` wide | `256px` |
| Wide | `1536px` | Full sidebar, `256px` wide; content max-width expands | `256px` |

**Content max-width:** `1440px`, centered within the available content column. At Wide breakpoints, add `margin: 0 auto` on the inner wrapper.

**Do not invent custom breakpoints.** Use only the four values above.

### CSS Shell Structure

```css
/* DashboardShell.module.css — reference */

.shell {
  display: block;
  min-height: 100vh;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  z-index: 200;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.sidebar {
  position: fixed;
  top: 64px;
  left: 0;
  bottom: 0;
  width: var(--sidebar-width-full);   /* 256px */
  z-index: 100;
  overflow-y: auto;
  background-color: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  transition: width var(--transition-standard);
}

.sidebar.collapsed {
  width: var(--sidebar-width-collapsed);  /* 64px */
}

.main {
  margin-left: var(--sidebar-width-full);
  padding-top: 64px;
  min-height: calc(100vh - 64px);
  background-color: var(--color-background);
  overflow-y: auto;
}

@media (max-width: 1279px) {
  .sidebar { width: var(--sidebar-width-collapsed); }
  .main { margin-left: var(--sidebar-width-collapsed); }
}

@media (max-width: 767px) {
  .sidebar {
    width: var(--sidebar-width-full);
    transform: translateX(-100%);
    transition: transform var(--transition-standard);
  }
  .sidebar.mobileOpen { transform: translateX(0); }
  .main { margin-left: 0; }
}
```

## 2. Sidebar Navigation

### Color Decision

The sidebar uses the dark `#222831` background (same as the primary text color in the main palette). This creates a strong visual separation from the white header and the `#F9FAFB` main area. It is deliberately **not** the primary pink — that color is reserved for active state accents only.

### Full Spec

| Property | Value |
|---|---|
| Background | `#222831` (= `--sidebar-bg`) |
| Width (full) | `256px` |
| Width (collapsed/icon rail) | `64px` |
| Border-right | `1px solid #1A1F26` (= `--sidebar-border`) |
| Internal scroll | `overflow-y: auto` with custom scrollbar (track `#1A1F26`, thumb `#3D4450`) |

### Nav Item Anatomy

Each item contains an SVG icon (20px × 20px) on the left, and a text label to the right. In the collapsed icon-rail state, the label is hidden and a tooltip appears on hover.

```
[icon 20px] [label 14px]         — full sidebar
[icon 20px]                      — collapsed rail (label tooltip on hover)
```

### Nav Item States

| State | Background | Text color | Left accent |
|---|---|---|---|
| Default | transparent | `#A8B3C0` (= `--sidebar-text`) | none |
| Hover | `rgba(255,255,255,0.06)` | `#FFFFFF` | none |
| Active / selected | `rgba(255, 46, 99, 0.15)` | `#FFFFFF` | `4px solid #FF2E63` |
| Disabled | transparent | `rgba(168, 179, 192, 0.4)` | none |

### Nav Item CSS

```css
.navItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  margin: 2px 8px;
  border-radius: var(--radius-sm);   /* 8px */
  font-size: var(--font-size-body);  /* 14px */
  font-weight: var(--font-weight-normal);
  color: var(--sidebar-text);        /* #A8B3C0 */
  text-decoration: none;
  cursor: pointer;
  border-left: 4px solid transparent;
  transition: background-color var(--transition-fast),
              color var(--transition-fast),
              border-color var(--transition-fast);
}

.navItem:hover {
  background-color: rgba(255, 255, 255, 0.06);
  color: #FFFFFF;
}

.navItem.active {
  background-color: rgba(255, 46, 99, 0.15);
  color: #FFFFFF;
  border-left-color: var(--color-primary);  /* #FF2E63 */
  font-weight: var(--font-weight-semibold);
}

.navItem .icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: inherit;
}
```

### Section Dividers and Group Labels

Group nav items under section labels when there are more than 5 items.

```css
.navGroupLabel {
  padding: 16px 16px 6px 20px;
  font-size: var(--font-size-caption);  /* 10px */
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(168, 179, 192, 0.6);    /* muted sidebar text */
}
```

Example groups: **Overview**, **Management**, **System**.

### Nested Nav Items

Second-level items (sub-pages) appear indented when their parent is active. They do not get the 4px left border — instead they use the secondary brand color `#08D9D6` as their active text color.

```css
.navSubItem {
  padding: 8px 16px 8px 44px;   /* 44px left = icon(20) + gap(12) + 12px indent */
  font-size: var(--font-size-body-small);  /* 12px */
  color: var(--sidebar-text);
}

.navSubItem.active {
  color: var(--color-secondary);  /* #08D9D6 */
  background-color: rgba(8, 217, 214, 0.08);
  border-left-color: var(--color-secondary);
}
```

### Sidebar Footer

Pin a footer row at the bottom of the sidebar containing: user avatar (24px circle, initials), display name (truncated), and a logout icon button. This stays visible without scrolling.

```css
.sidebarFooter {
  position: sticky;
  bottom: 0;
  background-color: var(--sidebar-bg);
  border-top: 1px solid var(--sidebar-border);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}
```

## 3. Top Header Bar

### Spec

| Property | Value |
|---|---|
| Height | `64px` |
| Background | `#FFFFFF` |
| Border-bottom | `1px solid #E5E7EB` |
| Shadow | none (the border is sufficient; shadow would fight with sidebar) |
| z-index | `200` |
| Padding | `0 24px` |
| Layout | `display: flex; align-items: center; justify-content: space-between;` |

### Left Section

1. Logo wordmark: Use a web-adapted text version matching the brand ("**code**_pop_" — "code" in `#222831` weight 600, "pop" in `#08D9D6` weight 600 italic). Size: approximately 28px effective height. This is the web equivalent of the React Native `<CodePopLogo size={32} />`.
2. Dashboard title: `16px / 600 / #6B7280` — e.g., "Super Admin Dashboard". This is **not** an H1; it is a supporting label.
3. Optional: A vertical divider `1px solid #E5E7EB` between logo and title.

### Right Section

Items ordered right-to-left: Logout, User badge, Notifications bell, (optional) breadcrumb if no sidebar is in use.

**Notifications Bell:**
- Icon button, 40px × 40px tap target
- Badge count: 16px circle, `#FF2E63` background, white text 10px
- Clicking opens a flyout (see Section 10)

**User Role Badge:**
- Avatar: 32px circle, background `#08D9D6`, white initials 12px/700
- Role label: 12px, `#6B7280`, displayed to the left of the avatar

**Logout Button:**
- Ghost/tertiary style per UI_GUIDELINES.md
- Text: "Sign out" — 14px / 600 / `#6B7280`
- Hover: text becomes `#222831`
- No icon required (keep the header uncluttered)

## 4. Dashboard Grid and Content Area

### Content Area Wrapper

```css
.contentArea {
  padding: 32px;
  max-width: 1440px;
  margin: 0 auto;
}

@media (max-width: 1279px) {
  .contentArea { padding: 24px; }
}

@media (max-width: 767px) {
  .contentArea { padding: 16px; }
}
```

### Page Header (inside Content Area)

Appears at the top of every page within the content area, below the sticky shell header.

```
[Breadcrumb — 12px / #6B7280]                    [Action Buttons]
[Page Title H1 — 32px / 700 / #222831]
[Optional subtitle — 14px / #6B7280]
```

- Breadcrumb uses `>` separator in `#D1D5DB`
- Margin below page header before first content row: `24px`

### The 12-Column Grid

Use CSS Grid with 12 named columns and a `24px` gap.

```css
.dashboardGrid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

/* Column span utilities */
.col-3  { grid-column: span 3; }   /* 1/4 width */
.col-4  { grid-column: span 4; }   /* 1/3 width */
.col-6  { grid-column: span 6; }   /* 1/2 width */
.col-8  { grid-column: span 8; }   /* 2/3 width */
.col-9  { grid-column: span 9; }   /* 3/4 width */
.col-12 { grid-column: span 12; }  /* full width */

@media (max-width: 1279px) {
  /* 3-col and 4-col become 6-col on tablet */
  .col-3, .col-4 { grid-column: span 6; }
}

@media (max-width: 767px) {
  /* Everything becomes full width on mobile */
  .col-3, .col-4, .col-6, .col-8, .col-9, .col-12 {
    grid-column: span 12;
  }
}
```

### Background

The main content area background is `#F9FAFB`. Cards within it are `#FFFFFF`. This follows the existing `tokens.css` convention: `--color-background` for the canvas, `--color-surface` for elevated surfaces.

## 5. Metric / Stat Cards (KPI Cards)

These are the large headline numbers at the top of a dashboard — "Total Revenue: $4,521", "Active Orders: 127", etc.

### Layout Within a Card

```
┌──────────────────────────────────────┐
│  [Icon bg 40px]    [Label 12px gray] │
│                                      │
│  [Value: 32px / 700 / #222831]       │
│  [Delta: ↑ 12% vs. yesterday — 12px] │
└──────────────────────────────────────┘
```

### KPI Card Spec

| Property | Value |
|---|---|
| Background | `#FFFFFF` |
| Border | `1px solid #E5E7EB` |
| Border-radius | `12px` |
| Padding | `20px` |
| Shadow | `0 1px 3px rgba(0, 0, 0, 0.1)` |
| Hover shadow | `0 4px 12px rgba(0, 0, 0, 0.15)` |
| Hover cursor | `pointer` (if drillable) |
| Transition | `box-shadow 150ms ease-out` |

### Icon Background

The icon sits in a rounded square, 40px × 40px, `border-radius: 10px`. Background is a `0.12` opacity tint of a contextual color. Icon itself is 20px in the full-opacity version of that color.

| Metric type | Icon bg tint | Icon color |
|---|---|---|
| Revenue / financial | `rgba(16, 185, 129, 0.12)` | `#10B981` |
| Orders / activity | `rgba(255, 46, 99, 0.12)` | `#FF2E63` |
| Inventory / stock | `rgba(8, 217, 214, 0.12)` | `#08D9D6` |
| Machine / uptime | `rgba(245, 158, 11, 0.12)` | `#F59E0B` |
| Users / accounts | `rgba(59, 130, 246, 0.12)` | `#3B82F6` |
| Alerts / errors | `rgba(239, 68, 68, 0.12)` | `#EF4444` |

### Typography Within KPI Card

| Element | Size | Weight | Color |
|---|---|---|---|
| Label | `12px` | `400` | `#6B7280` |
| Value | `28px` | `700` | `#222831` |
| Delta positive (↑) | `12px` | `600` | `#10B981` |
| Delta negative (↓) | `12px` | `600` | `#EF4444` |
| Delta neutral (—) | `12px` | `400` | `#6B7280` |

**Value sizing note:** Use `28px` (not the H1 `32px`) so cards can sit in a row without feeling too large. If the value is a very long number (e.g., currency with decimals), drop to `22px` to prevent overflow.

### KPI Card Grid Layout

```css
.kpiRow {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
```

This auto-fits from 6 cards on Wide down to 1 card on mobile without manual breakpoint overrides.

## 6. Data Tables

### When to Use

Use a data table whenever there are more than ~10 rows of structured records, or when the user needs to sort, filter, search, or take per-row actions. Do not use a table for simple lists (use a card list instead).

### Table Container

```css
.tableContainer {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);    /* 12px */
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
```

### Table Structure

```
[Search + Filter bar]  ← above the table, inside the container
─────────────────────────────────────────
[TH] [TH] [TH] [TH]   ← sticky header
─────────────────────────────────────────
[TD] [TD] [TD] [TD]   ← row 1
[TD] [TD] [TD] [TD]   ← row 2 (alternate)
...
─────────────────────────────────────────
[Pagination controls]  ← below the table, inside the container
```

### Header Row

| Property | Value |
|---|---|
| Background | `#F9FAFB` (= `--color-background`) |
| Border-bottom | `2px solid #E5E7EB` |
| Font size | `12px` |
| Font weight | `600` |
| Color | `#6B7280` |
| Text transform | `uppercase` |
| Letter spacing | `0.05em` |
| Cell padding | `12px 16px` |
| `position` | `sticky; top: 0; z-index: 10` |

### Data Rows

**Use divider lines, not zebra striping**, as the primary row separator. Divider lines are cleaner and more professional for data-dense dashboards.

| Property | Value |
|---|---|
| Row min-height | `52px` |
| Cell padding | `12px 16px` |
| Font size | `14px` |
| Color | `#222831` |
| Border-bottom | `1px solid #E5E7EB` |
| Hover background | `#F3F4F6` |
| Hover transition | `background-color 100ms ease-out` |
| Last row border-bottom | none |

**Exception — zebra striping:** Use optional alternating row backgrounds (`#F9FAFB` on even rows) only in read-only audit log tables where the user needs to track horizontally across many columns. Do not use zebra striping in tables that have row actions.

### Column Alignment Rules

| Content type | Alignment |
|---|---|
| Text (names, labels, descriptions) | Left |
| Numbers (counts, quantities) | Right |
| Currency | Right (always include currency symbol) |
| Percentages | Right |
| Dates / times | Left |
| Status badges | Center |
| Action buttons / icons | Center or Right-pinned |

### Sortable Column Indicators

Sortable columns show a sort icon on header hover. Active sort shows direction.

```
[Column Label] ↕   ← hover (neutral sort icon, #D1D5DB)
[Column Label] ↑   ← sorted ascending, icon color #FF2E63
[Column Label] ↓   ← sorted descending, icon color #FF2E63
```

Clicking cycles: default → ascending → descending → default.

### Search and Filter Bar

```css
.tableToolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
}
```

- Search input: full input field spec from UI_GUIDELINES.md. Width: `min(280px, 100%)`.
- Filter dropdowns: secondary button style with chevron icon, 36px height (dashboard tables are not mobile touch targets).
- "Clear filters" link: ghost text in `#08D9D6`, 12px.

### Pagination

```
Showing 1–25 of 143 results        [< Prev]  [1] [2] [3] ... [6]  [Next >]
```

```css
.tablePagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  font-size: 12px;
  color: #6B7280;
}

.pageBtn {
  min-width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.pageBtn.active {
  background-color: var(--color-primary);
  color: #FFFFFF;
}
```

Default rows per page: **25**. Offer options: 25 / 50 / 100 in a small select dropdown.

### Row Actions

Actions that apply to a single row live in an "Actions" column pinned to the right. Use icon buttons (24px × 24px, no background by default, hover background `#F3F4F6`, border-radius `6px`). For more than 2 actions, use a `...` overflow menu (popover).

## 7. Chart and Data Visualization Color Palette

The chart palette is separate from the brand palette. It must be distinguishable in both color and (where possible) pattern, to support accessibility.

### The 6-Color Chart Palette

| Token | Hex | Role |
|---|---|---|
| `--chart-1` | `#FF2E63` | Primary series (totals, main metric) |
| `--chart-2` | `#08D9D6` | Secondary series (comparison, forecast) |
| `--chart-3` | `#F59E0B` | Tertiary series (warnings, third category) |
| `--chart-4` | `#6366F1` | Quaternary (cool purple — new users, new routes) |
| `--chart-5` | `#10B981` | Positive / success series |
| `--chart-6` | `#F97316` | Orange — sixth category when needed |

These six do not include red (`#EF4444`) intentionally — red is reserved for semantic error/alert meaning and should not appear as a neutral data series.

### Grid Lines and Axes

| Element | Value |
|---|---|
| Grid lines (horizontal) | `1px solid #E5E7EB` (= `--color-border`) |
| Grid lines (vertical) | none by default; only add if specifically needed |
| Axis line | `1px solid #D1D5DB` |
| Axis tick label | `11px / 400 / #6B7280` |
| Axis title | `12px / 600 / #6B7280` |
| Chart background | transparent (sits on `--color-surface` card) |

### Tooltip Style

```css
/* Chart tooltip */
.chartTooltip {
  background-color: #222831;
  color: #FFFFFF;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 12px;
  line-height: 1.6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  pointer-events: none;
}

.chartTooltipLabel {
  font-weight: 600;
  margin-bottom: 4px;
  color: #A8B3C0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.chartTooltipValue {
  font-weight: 700;
  font-size: 16px;
  color: #FFFFFF;
}
```

### Chart Type Decision Matrix

| Use case | Chart type | Rationale |
|---|---|---|
| Revenue over time, order trends | Line chart | Shows continuity and trend direction |
| Comparing categories (regions, stores) | Bar chart (vertical) | Easy comparison of discrete groups |
| Inventory % across ingredients | Horizontal bar | Labels are long; horizontal reads better |
| Composition (supply type breakdown) | Donut chart (not pie) | Donut leaves center for a KPI number |
| Popularity trends over months | Area chart | Emphasizes volume and trend |
| Route / supply schedule | Gantt-style timeline | (see Section 12) |
| Machine uptime % | Radial gauge (single) | Immediately communicates "how full is the bucket" |

**Note:** The project uses `recharts` (already in `package.json`). Use `<LineChart>`, `<BarChart>`, `<AreaChart>`, `<PieChart>` (configured as donut via `innerRadius`). Do not introduce a second charting library.

### Chart Container Card

All charts live inside a standard surface card:

```css
.chartCard {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px 24px;
  box-shadow: var(--shadow-sm);
}

.chartCard .chartTitle {
  font-size: var(--font-size-body-large); /* 16px */
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin-bottom: 4px;
}

.chartCard .chartSubtitle {
  font-size: var(--font-size-body-small); /* 12px */
  color: var(--color-text-secondary);
  margin-bottom: 20px;
}
```

### Legend

Place legends below the chart, horizontally. Each legend item: 10px × 10px color swatch (circle, `border-radius: 50%`), then label in `12px / 400 / #6B7280`. Make legend items clickable to toggle series.

## 8. Status Badges and Indicators

Badges are the primary way to communicate state at a glance in tables and cards. Every badge uses the **dot + label** pattern.

### Dot + Label Pattern

```
● Online         — 8px filled circle + label text
● Offline
● Under Repair
```

```css
.statusBadge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;     /* pill shape */
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.statusDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
```

### Machine Status Badges

| Status | Dot color | Background | Text color | Label |
|---|---|---|---|---|
| Online | `#10B981` | `rgba(16, 185, 129, 0.12)` | `#059669` | "Online" |
| Offline | `#EF4444` | `rgba(239, 68, 68, 0.12)` | `#DC2626` | "Offline" |
| Under Repair | `#F59E0B` | `rgba(245, 158, 11, 0.12)` | `#D97706` | "Under Repair" |
| Maintenance | `#6366F1` | `rgba(99, 102, 241, 0.12)` | `#4F46E5` | "Maintenance" |

### Supply Level Badges

| Level | Dot color | Background | Text color | Label |
|---|---|---|---|---|
| In Stock | `#10B981` | `rgba(16, 185, 129, 0.12)` | `#059669` | "In Stock" |
| Low | `#F59E0B` | `rgba(245, 158, 11, 0.12)` | `#D97706` | "Low" |
| Critical | `#EF4444` | `rgba(239, 68, 68, 0.12)` | `#DC2626` | "Critical" |
| Out of Stock | `#6B7280` | `rgba(107, 114, 128, 0.12)` | `#4B5563` | "Out of Stock" |

**Critical supply items also get a pulsing dot animation** to draw urgent attention:

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.statusDot.pulse {
  animation: pulse 1.5s ease-in-out infinite;
}
```

Apply `.pulse` only to `#EF4444` dots (Critical, Offline).

### User Account Status Badges

| Status | Dot color | Background | Text color | Label |
|---|---|---|---|---|
| Active | `#10B981` | `rgba(16, 185, 129, 0.12)` | `#059669` | "Active" |
| Disabled | `#F59E0B` | `rgba(245, 158, 11, 0.12)` | `#D97706` | "Disabled" |
| Deleted | `#6B7280` | `rgba(107, 114, 128, 0.10)` | `#6B7280` | "Deleted" |

Deleted rows in the Admin dashboard table also apply `opacity: 0.6` to the entire row and use `text-decoration: line-through` on the user name only.

### Severity / Alert Badges

| Severity | Color | Background | Label |
|---|---|---|---|
| Critical | `#EF4444` | `rgba(239, 68, 68, 0.12)` | "Critical" |
| Warning | `#F59E0B` | `rgba(245, 158, 11, 0.12)` | "Warning" |
| Info | `#3B82F6` | `rgba(59, 130, 246, 0.12)` | "Info" |
| Resolved | `#10B981` | `rgba(16, 185, 129, 0.12)` | "Resolved" |

## 9. Dashboard-Specific CSS Custom Properties

Add these to `/dashboards_frontend/src/styles/tokens.css`, appended after the existing token block.

```css
/* ─── Dashboard Shell Tokens ─────────────────────────────────── */
:root {
  --sidebar-bg: #222831;
  --sidebar-border: #1A1F26;
  --sidebar-text: #A8B3C0;
  --sidebar-width-full: 256px;
  --sidebar-width-collapsed: 64px;

  /* ─── Chart Colors ──────────────────────────────────────────── */
  --chart-1: #FF2E63;
  --chart-2: #08D9D6;
  --chart-3: #F59E0B;
  --chart-4: #6366F1;
  --chart-5: #10B981;
  --chart-6: #F97316;
  --chart-grid: #E5E7EB;
  --chart-axis: #D1D5DB;
  --chart-label: #6B7280;
  --chart-tooltip-bg: #222831;

  /* ─── Table Tokens ──────────────────────────────────────────── */
  --table-header-bg: #F9FAFB;
  --table-header-text: #6B7280;
  --table-row-hover: #F3F4F6;
  --table-border: #E5E7EB;

  /* ─── KPI Card Tokens ───────────────────────────────────────── */
  --kpi-icon-size: 40px;
  --kpi-value-size: 28px;

  /* ─── Status Badge Tints ────────────────────────────────────── */
  --badge-success-bg: rgba(16, 185, 129, 0.12);
  --badge-success-text: #059669;
  --badge-warning-bg: rgba(245, 158, 11, 0.12);
  --badge-warning-text: #D97706;
  --badge-error-bg: rgba(239, 68, 68, 0.12);
  --badge-error-text: #DC2626;
  --badge-neutral-bg: rgba(107, 114, 128, 0.12);
  --badge-neutral-text: #4B5563;
  --badge-info-bg: rgba(59, 130, 246, 0.12);
  --badge-info-text: #1D4ED8;

  /* ─── Alert/Banner Tokens ───────────────────────────────────── */
  --alert-critical-bg: #FEF2F2;
  --alert-critical-border: #EF4444;
  --alert-warning-bg: #FFFBEB;
  --alert-warning-border: #F59E0B;
  --alert-info-bg: #EFF6FF;
  --alert-info-border: #3B82F6;
  --alert-success-bg: #F0FDF4;
  --alert-success-border: #10B981;

  /* ─── Skeleton Loader ───────────────────────────────────────── */
  --skeleton-base: #E5E7EB;
  --skeleton-highlight: #F3F4F6;
}
```

## 10. Alert / Notification Banners

### In-Page Alert Banner

Used for persistent page-level messages (e.g., "Machine #4 has been offline for 3 hours — action required").

```
[Colored left border 4px] [Icon 16px] [Title — Bold] [Body text]   [Dismiss ×]
```

```css
.alertBanner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  border-left: 4px solid;
  margin-bottom: 16px;
  font-size: var(--font-size-body);
}

.alertBanner.critical {
  background-color: var(--alert-critical-bg);   /* #FEF2F2 */
  border-color: var(--alert-critical-border);   /* #EF4444 */
  color: #991B1B;
}

.alertBanner.warning {
  background-color: var(--alert-warning-bg);    /* #FFFBEB */
  border-color: var(--alert-warning-border);    /* #F59E0B */
  color: #92400E;
}

.alertBanner.info {
  background-color: var(--alert-info-bg);       /* #EFF6FF */
  border-color: var(--alert-info-border);       /* #3B82F6 */
  color: #1E40AF;
}

.alertBanner.success {
  background-color: var(--alert-success-bg);    /* #F0FDF4 */
  border-color: var(--alert-success-border);    /* #10B981 */
  color: #065F46;
}

.alertBannerTitle {
  font-weight: 600;
  margin-bottom: 2px;
}

.alertBannerDismiss {
  margin-left: auto;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
}
.alertBannerDismiss:hover { opacity: 1; }
```

### Notification Bell Flyout

The bell icon in the header opens a right-anchored flyout panel (not a full modal).

| Property | Value |
|---|---|
| Width | `360px` |
| Max height | `480px` |
| Overflow-y | `auto` |
| Background | `#FFFFFF` |
| Border | `1px solid #E5E7EB` |
| Border-radius | `12px` |
| Box-shadow | `0 10px 25px rgba(0, 0, 0, 0.2)` (Level 3) |
| Position | `position: absolute; top: 56px; right: 24px;` |
| z-index | `300` |

**Flyout header:** "Notifications" (H3, 20px/600) on the left, "Mark all read" ghost link on the right (12px / `#08D9D6`).

**Each notification row:**
- Left: Severity dot (8px) or category icon (16px, colored per badge spec)
- Right of icon: Title (14px/600/`#222831`), then body snippet (12px/`#6B7280`)
- Far right: relative time (11px/`#9CA3AF`)
- Padding: `14px 16px`
- Border-bottom: `1px solid #F3F4F6`
- Hover background: `#F9FAFB`
- Unread: left background tint `rgba(255, 46, 99, 0.04)` + 6px unread dot `#FF2E63`

### Toast Notifications

Toasts appear in the **bottom-right corner**, stack upward, and auto-dismiss after **5 seconds** (critical alerts require manual dismiss).

```css
.toastContainer {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 500;
  max-width: 360px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  background-color: #222831;
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  font-size: 14px;
  animation: slideInRight 200ms ease-out;
}

@keyframes slideInRight {
  from { transform: translateX(120%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
```

The toast icon on the left is colored per severity: `#EF4444` (critical), `#F59E0B` (warning), `#10B981` (success), `#3B82F6` (info). The text body is always white on the dark `#222831` toast background.

## 11. Empty States and Loading States

### Skeleton Loaders

Use skeleton loaders — never a centered spinner — when loading data for cards and tables. Skeletons match the shape of the content they replace, so the layout does not shift on load.

```css
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--skeleton-base) 25%,
    var(--skeleton-highlight) 50%,
    var(--skeleton-base) 75%
  );
  background-size: 800px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: var(--radius-sm);
}
```

**KPI card skeleton:** 4 blocks matching card dimensions, using `.skeleton` on:
- A 40px × 40px square (icon placeholder)
- A 60px × 12px bar (label)
- A 100px × 28px bar (value)
- A 80px × 12px bar (delta)

**Table skeleton:** Show 8 skeleton rows at the actual row height (52px). Each row has 1–2 block-level skeleton elements in each column cell. The table header remains visible during load so the user knows what columns are coming.

**Chart skeleton:** A single `border-radius: 8px` skeleton block filling the chart height (typically `240px` or `320px`).

### Empty States

Use empty states when a view has no records — not as an error, but as a "fresh start" or "nothing matches."

**Structure:**

```
        [Illustration or Icon — 64px, muted gray #D1D5DB]
        [Title — 18px / 600 / #222831]
        [Subtitle — 14px / #6B7280, max-width: 320px, centered]
        [Optional CTA Button — primary style]
```

```css
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
  color: var(--color-text-secondary);
}

.emptyStateIcon {
  width: 64px;
  height: 64px;
  color: #D1D5DB;
  margin-bottom: 16px;
}

.emptyStateTitle {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
}

.emptyStateSubtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  max-width: 320px;
  line-height: 1.6;
  margin-bottom: 24px;
}
```

**Empty state copy examples (consistent voice):**

| View | Title | Subtitle |
|---|---|---|
| User table (no results) | "No users found" | "Try adjusting your search or clear filters to see all users." |
| Alerts panel (no alerts) | "All clear" | "No active alerts. The system is running normally." |
| Repair schedule (no repairs) | "No repairs scheduled" | "All machines are healthy. Add a repair job to get started." |
| Supply requests (none pending) | "No pending requests" | "Submit a supply request to begin tracking inventory movements." |

### Zero-Data Chart Treatment

When a chart has no data to plot, do not render an empty axis. Instead:

1. Render the chart card container normally (title, subtitle)
2. Fill the chart area with the empty state layout: muted icon (a chart icon in `#D1D5DB`), then "No data available for this period" in 14px/`#6B7280`
3. Do not render axes, grid lines, or legend

## 12. Calendar / Timeline Component (Repair Staff)

The Repair Staff dashboard includes a repair schedule calendar. This is a distinct component from standard tables.

### Calendar View Modes

Offer three modes via a toggle in the card header:

| Mode | Layout |
|---|---|
| Month | Standard monthly grid (7 columns × ~5 rows) |
| Week | 7-column day view with hour rows (8am–8pm) |
| Timeline | Horizontal Gantt — machines as rows, dates as columns |

The **Timeline / Gantt** view is the most useful for repair staff and should be the default.

### Timeline / Gantt Spec

```
           Mon 3/24   Tue 3/25   Wed 3/26   Thu 3/27   Fri 3/28
Machine 1  [===Repair Job: Replace Pump==========]
Machine 2             [===Scheduled Maintenance===]
Machine 3  [In Progress: Seal Replacement]
```

| Property | Value |
|---|---|
| Row height | `48px` |
| Machine label column width | `160px` |
| Day column width | `120px` (min), fluid |
| Header bg | `#F9FAFB` |
| Header text | `12px / 600 / #6B7280` |
| Row border-bottom | `1px solid #F3F4F6` |
| Today column highlight | `background: rgba(8, 217, 214, 0.06)` with `2px solid #08D9D6` top/bottom |
| Alternate row bg | none (use dividers only) |

### Job Bar (Gantt Block) Spec

```css
.ganttJobBar {
  height: 28px;
  border-radius: 6px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
```

| Job Status | Bar bg | Text color |
|---|---|---|
| Scheduled (future) | `rgba(8, 217, 214, 0.20)` | `#0891B2` |
| In Progress | `rgba(255, 46, 99, 0.20)` | `#BE185D` |
| Overdue | `rgba(239, 68, 68, 0.25)` | `#B91C1C` |
| Completed | `rgba(16, 185, 129, 0.20)` | `#059669` |

Overdue bars additionally get a `border: 2px solid #EF4444` to further distinguish from normal bars.

Hover state on a job bar: `box-shadow: 0 2px 8px rgba(0,0,0,0.2)` + tooltip showing job name, machine ID, assigned tech, date range.

### Month / Week Calendar Grid

| Property | Value |
|---|---|
| Day cell bg | `#FFFFFF` |
| Day cell border | `1px solid #E5E7EB` |
| Today cell header | `#FF2E63` background, white text, `border-radius: 50%` |
| Event pill (in month view) | Same colors as gantt job bars, `border-radius: 4px`, `font-size: 11px` |
| Weekend column bg | `rgba(249, 250, 251, 0.6)` tint |
| Off-month days | text `#D1D5DB` |

### Calendar Toolbar

```
[< Prev Month]  [March 2026]  [Next Month >]     [Month | Week | Timeline]
```

- Nav arrows: icon button, 36px × 36px
- Current period label: 18px / 600 / `#222831`
- View mode toggle: button group, secondary button style, active state uses `#FF2E63` background/white text

```css
.calendarViewToggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.calendarViewToggle button {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border-right: 1px solid var(--color-border);
}

.calendarViewToggle button:last-child {
  border-right: none;
}

.calendarViewToggle button.active {
  background: var(--color-primary);
  color: #FFFFFF;
}
```

## Dashboard Implementation Checklist

Before marking any dashboard page as complete, verify all of the following:

- [ ] Uses `DashboardShell` with fixed header + sidebar + main content structure
- [ ] Sidebar uses `--sidebar-bg: #222831`, correct active state with `#FF2E63` left border
- [ ] Collapsed sidebar shows icon rail at tablet breakpoint (768px–1279px)
- [ ] Mobile hamburger drawer works correctly
- [ ] Header is exactly 64px, background `#FFFFFF`, border-bottom `1px solid #E5E7EB`
- [ ] Content area background is `#F9FAFB`, not white
- [ ] Surface cards are `#FFFFFF` with `border: 1px solid #E5E7EB` and `border-radius: 12px`
- [ ] KPI cards use 28px value text, 12px label, correct icon tint backgrounds
- [ ] Data tables: sticky header on `#F9FAFB`, divider rows, right-align numbers
- [ ] Status badges use exact colors from the badge spec tables (dot + label pattern)
- [ ] Charts use only the 6 `--chart-*` colors; no arbitrary colors
- [ ] Chart tooltips use dark `#222831` background with white text
- [ ] Loading states use skeleton shimmer loaders, not a spinner
- [ ] Empty states follow the icon + title + subtitle + optional CTA pattern
- [ ] Alert banners use the 4-color system (critical/warning/info/success)
- [ ] Toast notifications appear bottom-right, use dark `#222831` background
- [ ] New CSS custom properties from Section 9 added to `tokens.css`
- [ ] All new tokens reference via `var()` — no hardcoded hex values in component CSS
- [ ] Recharts is the only charting library used
- [ ] Focus states: `2px solid #08D9D6` on all interactive elements
- [ ] `@media (prefers-reduced-motion: reduce)` disables shimmer and slide-in animations

---

*Last Updated: 2026-03-27*
