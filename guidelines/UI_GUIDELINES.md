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

*Last Updated: 2026-03-13*
