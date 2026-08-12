# Maya UI: Component Blueprints

Each blueprint provides: visual construction, exact measurements, all states, and kinetic response. Use these blueprints to implement components in your chosen framework.

---

## 1. Button

**Anatomy:**
```
[ icon? ][ label ]     ← horizontal flex, align-center
↑ padding: 0 16px (h) / 0 10px (v) for default size
   height: 36px default | 32px compact | 42px large
   border-radius: radius-medium (8px)
```

**Variants:**
| Variant | Background | Border | Text |
|---|---|---|---|
| Primary | Intent base colour | none | white |
| Secondary / Ghost | transparent | `border-strong` (0.5px) | `text-primary` |
| Destructive | Danger muted bg | Danger border | Danger text |
| Disabled (any) | original bg | original border | 40% opacity on everything |

**States:**
- **Hover:** background shifts to `Hover Tint` (brighter/lighter intent), transition 150ms `ease-out`.
- **Active/Pressed:** `transform: scale(0.96)`, transition 100ms `spring-bounce`.
- **Focus-visible:** focus ring.
- **Disabled:** `opacity: 0.4`, `pointer-events: none`, `cursor: not-allowed`.

**Audio:** Trigger `soft` profile on press.
**Hit area:** Expand to minimum 40×40px using `padding` or `::after` pseudo-element if visual is smaller.

---

## 2. Card

**Anatomy:**
```
┌─────────────────────────────────────┐  ← border-radius: 12px
│  padding: 24px                      │     box-shadow: High elevation
│  ┌──────────────────────────────┐   │     border: 0.5px border-default
│  │  nested element              │   │     bg: bg-surface-1
│  │  radius: 12 - 24 = use 8px  │   │     gradient overlay: surface lighting
│  └──────────────────────────────┘   │
│  content                            │
└─────────────────────────────────────┘
```

**Interactive card hover (only if card is clickable):**
- Scale: `transform: scale(1.015)`, transition 200ms `ease-out`.
- Shadow: ambient glow increases (add `0 16px 48px rgba(0,0,0,0.12)`).
- Cursor: `pointer`.

**Layout:** Place cards inside a CSS Grid or Flexbox with `gap: 16px` or `gap: 24px`. Cards NEVER set their own margin.

---

## 3. Modal / Dialog

**Anatomy:**
```
Backdrop:  rgba(0, 0, 0, 0.60) + blur(8px)    ← full-screen, blocks scroll
Container: border-radius: 20px
           padding: 32px
           max-width: 540px | 720px (large)
           box-shadow: Modal elevation
           bg: bg-surface-1
```

**Animation:**
- Enter: `scale(0.96) + opacity(0)` → `scale(1) + opacity(1)`, 250–300ms `ease-out`.
- Exit: `scale(0.96) + opacity(0)`, 150ms `ease-in` (faster than entrance).

**Interaction:**
- Render at app root (portal pattern — bypasses stacking contexts).
- Scroll-lock body: `overflow: hidden` on `<body>` while mounted.
- Dismiss: `Escape` key, backdrop click — EXCEPT for destructive confirmations.
- Destructive modals: disable backdrop click and `Escape`. Force explicit Cancel/Confirm.

---

## 4. Input Field

**Anatomy:**
```
height: 40px
padding: 0 12px
border-radius: radius-medium (8px)
border: 0.5px border-strong
box-shadow: Concave depth (inset)
bg: bg-surface-2 (slightly recessed)
```

**States:**
| State | Border | Shadow |
|---|---|---|
| Default | `border-strong` (0.5px) | Concave depth inset |
| Hover | `border-hover` | Concave depth + faint glow |
| Focused | `border-focus` + 2px Info outline offset | Concave depth + Info border glow |
| Error | Danger `border` value | Concave depth + Danger glow |
| Disabled | `border-default` | None — flat |

**Focus transition:** 150ms `ease-out`.
**Validation:** On invalid input — trigger Warning audio profile and set field border to Danger border. Show inline error text (`small` / 13px) below field in Danger text colour.
**Label:** Float above on focus or when field has value. Never inside the field as a permanent label (use placeholder for hints only).

---

## 5. Navigation / Topbar

**Anatomy:**
```
height: 56px (desktop) | 52px (mobile)
padding: 0 24px
position: sticky top 0
z-index: 100
background: Glassmorphism
border-bottom: 0.5px border-default
```
No elevation shadow needed — the blur creates the separation.

---

## 6. Dropdown / Popover

**Anatomy:**
```
border-radius: radius-large (12px)
box-shadow: Modal elevation (floats high above surface)
border: 0.5px border-default
bg: bg-surface-1 (solid — no glass; ensures text legibility)
min-width: 160px
padding: 6px 0 (vertical) for item lists
```

**Item anatomy:**
```
padding: 8px 12px
border-radius: radius-medium (8px) — applies to item, not container
height: 36px
hover: bg-surface-2, transition 100ms ease-out
```

**Timing & Audio:**
- Open: 200ms delay before showing (prevents flicker on cursor transit). Trigger `Pop` audio.
- Close: 150ms delay before hiding (grace time for user to reach the panel).
- Animation: `scale(0.97) + opacity(0)` → `scale(1) + opacity(1)`, 150ms `ease-out`.
- Root rendering: Render at app root. Never inside a local overflow-hidden container.

---

## 7. Badge / Tag

**Anatomy:**
```
padding: 2px 8px
height: 20px (compact) | 24px (standard)
border-radius: radius-micro (4px)
font-size: 11–12px / weight: 500
box-shadow: none — flat
bg: Intent muted-bg
border: 0.5px Intent border
color: Intent text colour
```
Never use solid saturated backgrounds for badges unless representing a critical alert.

---

## 8. Accordion / Expandable

**Trigger row:**
```
padding: 14px 0
display: flex; justify-content: space-between; align-items: center
cursor: pointer
border-bottom: 0.5px border-default
```

**Chevron indicator:**
```
transition: transform 250ms ease-out
expanded: rotate(180deg)
collapsed: rotate(0deg)
```

**Height animation:** Measure inner content and animate outer wrapper height to match. (See `motion.md` for JS implementation pattern).

---

## 9. Loading Skeleton

Skeletons simulate content shape during async load. They replace the empty flash.

**Anatomy:**
```css
/* Base skeleton shape */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--border-default) 25%,
    var(--border-strong) 50%,
    var(--border-default) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: radius-medium (8px);  /* or match the element it replaces */
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; opacity: 0.6; }
}
```

**Sizing rules:**
- Text skeleton: height = font-size + 4px (e.g., body text → 19px tall).
- Card skeleton: match the card's full height.
- Transition out: Fade from skeleton to real content via `opacity: 0 → 1` over 200ms. Never hard-cut.

---

## 10. Toast / Notification

**Anatomy:**
```
position: fixed bottom-right (or top-right for alerts)
margin: 16px
min-width: 280px | max-width: 420px
padding: 12px 16px
border-radius: radius-large (12px)
box-shadow: Modal elevation
border: 0.5px left-accent (4px solid Intent base colour)
bg: bg-surface-1
```

**Rules:**
- Single instance rule: One `<ToastContainer>` at the application root. Never instantiate per-component.
- Stacking: New toasts stack above previous ones. Limit to 3 visible at once. Dismiss oldest when limit exceeded.
- Auto-dismiss: Info/Success: 4000ms. Warning: 6000ms. Error: manual dismiss only.
- Animation: Enter `translateX` in 300ms `ease-out`, Exit in 200ms `ease-in`.

---

## 11. Form Layout

**Vertical stack (standard):**
```
gap between fields: 16px (space-4)
label → input gap: 6px
error message → next field gap: add 8px to the 16px gap
```

**Field group (label + input + error):**
```
┌ Label (13px, 500, text-secondary)
│
├ Input (40px height, concave depth)
│
└ Error text? (12px, Danger text, with × icon)  ← only when invalid
```

- Submit button position: Always right-aligned or full-width. Never left-aligned.
- Multi-column forms (≥ 3 fields): Use CSS Grid `grid-template-columns: 1fr 1fr` with `gap: 16px`. Full-width fields span both columns.

---

## 12. Empty State

**Anatomy:**
```
container: flex column, align-center, gap: 16px
padding: 48px 24px
border: 1px dashed border-strong (dashed = invitation, not error)
border-radius: radius-large
```

**Anatomy elements (top-to-bottom):**
1. Illustration zone: 80×80px max. Simple icon or geometric shape. Never a photo.
2. Headline: `h3` (20px / 500). One line. Action-oriented ("No items yet", "Nothing here").
3. Body: `body` (15px / 400 / text-secondary). One sentence max. Explain why or what to do.
4. CTA button: Primary variant. Single action only.
