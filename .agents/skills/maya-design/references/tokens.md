# Maya UI: Design Tokens & Layout Conventions

## 1. Spacing Scale (8-point grid)

| Token | Value | Use |
|---|---|---|
| `space-1` | 4px | Half-step. Icon gaps, tight inline padding. |
| `space-2` | 8px | Default inner gap between related elements. |
| `space-3` | 12px | Vertical padding in compact components. |
| `space-4` | 16px | Standard component internal padding (horizontal). |
| `space-6` | 24px | Section gap, card padding. |
| `space-8` | 32px | Large spacing between unrelated groups. |
| `space-12` | 48px | Section separators. |
| `space-16` | 64px | Page-level breathing room. |

> **Rule:** Never use a spacing value not on this table. If you need 20px, round to `space-6` (24px).

---

## 2. Border Radii

| Token | Value | Use |
|---|---|---|
| `radius-micro` | 4px | Inline tags, standard badges, code chips. |
| `radius-medium` | 8px | Buttons, input fields, dropdowns, small cards. |
| `radius-large` | 12px | Structural cards, panels, nested containers. |
| `radius-xl` | 20px | Modals, dialogs, major screen overlays. |
| `radius-full` | 9999px | Pills, circular avatars, toggle tracks. |

**Concentric Radii (mandatory for nested elements):**
```
Inner Radius = Outer Radius − Container Padding
```
Example: Card with `radius-large` (12px) and 4px inner padding → nested image needs 8px radius. If result ≤ 0, use 1px.

---

## 3. Typography Scale

| Role | Size | Line Height | Weight | Use |
|---|---|---|---|---|
| `display` | 48px | 1.1 | 500 | Hero headlines, marketing only. |
| `h1` | 32px | 1.2 | 500 | Page titles. |
| `h2` | 24px | 1.3 | 500 | Section headings. |
| `h3` | 20px | 1.35 | 500 | Sub-section headings. |
| `h4` | 17px | 1.4 | 500 | Card titles, sidebar headings. |
| `body-lg` | 16px | 1.75 | 400 | Long-form paragraphs, reading content. |
| `body` | 15px | 1.7 | 400 | Default UI text. |
| `small` | 13px | 1.5 | 400 | Secondary labels, metadata, captions. |
| `caption` | 11px | 1.4 | 400 | Timestamps, fine print. Never go smaller. |
| `code` | 13px | 1.6 | 400 | Monospace — code blocks, data tables. |

**Text Emphasis (use opacity/colour, NOT arbitrary size jumps):**
- **Primary:** full colour weight — headings, active labels, key data.
- **Secondary:** 55% opacity — body text, descriptions.
- **Muted:** 35–38% opacity — placeholders, inactive states, section labels.

**OpenType Requirements:**
- Enable tabular figures (`font-variant-numeric: tabular-nums`) for prices, counts, dashboards.
- Enable slashed zeros (`font-feature-settings: "zero" 1`) in code-adjacent UI.
- Balanced heading wrapping (`text-wrap: balance`) on all `h1`–`h3`.
- Sub-pixel antialiasing: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale`.
- Strip all default system margins from typography elements. Parent layout handles all spacing.

---

## 4. Color System — Dark Mode

```css
/* Dark Mode Backgrounds */
--bg-root:       #0A0A0A;   /* Page root — deepest surface */
--bg-surface-1:  #141414;   /* Primary component surface */
--bg-surface-2:  #1C1C1C;   /* Nested surface (+1 elevation) */
--bg-surface-3:  #242424;   /* Further nested (+2 elevation) */

/* Dark Mode Borders */
--border-default: rgba(255, 255, 255, 0.08);
--border-strong:  rgba(255, 255, 255, 0.14);
--border-hover:   rgba(255, 255, 255, 0.28);
--border-focus:   rgba(255, 255, 255, 0.40);

/* Dark Mode Text */
--text-primary:   #EFEFEF;
--text-secondary: rgba(255, 255, 255, 0.55);
--text-muted:     rgba(255, 255, 255, 0.35);
```

> **Nesting rule:** Each surface must be lighter than its parent. Max 3 distinct surfaces. Never stack more.

---

## 5. Color System — Light Mode

```css
/* Light Mode Backgrounds */
--bg-root:       #FFFFFF;
--bg-surface-1:  #F7F7F6;
--bg-surface-2:  #F0F0EF;
--bg-surface-3:  #E8E8E7;

/* Light Mode Borders */
--border-default: rgba(0, 0, 0, 0.08);
--border-strong:  rgba(0, 0, 0, 0.14);
--border-hover:   rgba(0, 0, 0, 0.28);
--border-focus:   rgba(0, 0, 0, 0.40);

/* Light Mode Text */
--text-primary:   #111110;
--text-secondary: rgba(0, 0, 0, 0.55);
--text-muted:     rgba(0, 0, 0, 0.38);
```

---

## 6. Semantic Intent Colors

Every intent must be implemented across all 5 states. Apply the dark-mode shift when in dark mode.

#### Success
| State | Light Mode | Dark Mode |
|---|---|---|
| Base | `hsl(152, 68%, 36%)` → `#1D9E75` | `hsl(152, 58%, 44%)` |
| Hover | `hsl(152, 68%, 42%)` | `hsl(152, 58%, 50%)` |
| Muted bg | `hsla(152, 68%, 36%, 0.12)` | `hsla(152, 60%, 50%, 0.14)` |
| Border | `hsla(152, 68%, 36%, 0.35)` | `hsla(152, 58%, 44%, 0.35)` |
| Text | `hsl(152, 68%, 26%)` | `hsl(152, 60%, 70%)` |

#### Warning
| State | Light Mode | Dark Mode |
|---|---|---|
| Base | `hsl(38, 92%, 48%)` → `#EF9F27` | `hsl(38, 85%, 54%)` |
| Hover | `hsl(38, 92%, 54%)` | `hsl(38, 85%, 60%)` |
| Muted bg | `hsla(38, 92%, 48%, 0.12)` | `hsla(38, 85%, 54%, 0.14)` |
| Border | `hsla(38, 92%, 48%, 0.35)` | `hsla(38, 85%, 54%, 0.35)` |
| Text | `hsl(38, 85%, 30%)` | `hsl(38, 85%, 72%)` |

#### Danger
| State | Light Mode | Dark Mode |
|---|---|---|
| Base | `hsl(0, 72%, 54%)` → `#E24B4A` | `hsl(0, 65%, 60%)` |
| Hover | `hsl(0, 72%, 60%)` | `hsl(0, 65%, 66%)` |
| Muted bg | `hsla(0, 72%, 54%, 0.12)` | `hsla(0, 65%, 60%, 0.14)` |
| Border | `hsla(0, 72%, 54%, 0.35)` | `hsla(0, 65%, 60%, 0.35)` |
| Text | `hsl(0, 72%, 38%)` | `hsl(0, 65%, 76%)` |

#### Info
| State | Light Mode | Dark Mode |
|---|---|---|
| Base | `hsl(213, 80%, 52%)` → `#2D80D9` | `hsl(213, 75%, 58%)` |
| Hover | `hsl(213, 80%, 58%)` | `hsl(213, 75%, 64%)` |
| Muted bg | `hsla(213, 80%, 52%, 0.12)` | `hsla(213, 75%, 58%, 0.14)` |
| Border | `hsla(213, 80%, 52%, 0.35)` | `hsla(213, 75%, 58%, 0.35)` |
| Text | `hsl(213, 80%, 34%)` | `hsl(213, 75%, 74%)` |

---

## 7. Shadows & Elevation

#### Concave Depth (inputs, pressed/recessed areas)
```css
/* Light */
box-shadow: inset 0 2px 6px rgba(0,0,0,0.07), inset 0 1px 2px rgba(0,0,0,0.04);
/* Dark */
box-shadow: inset 0 2px 6px rgba(0,0,0,0.50), inset 0 1px 2px rgba(0,0,0,0.30);
```

#### Low Elevation (badges, inline interactive tags)
```css
/* Light */
box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04);
/* Dark */
box-shadow: 0 1px 2px rgba(0,0,0,0.40), 0 2px 6px rgba(0,0,0,0.20);
```

#### High Elevation (cards, panels — standard)
```css
/* Light */
box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06);
/* Dark */
box-shadow: 0 2px 8px rgba(0,0,0,0.50), 0 8px 32px rgba(0,0,0,0.35);
```

#### Modal / Dialog Elevation (highest — detached overlays)
```css
/* Light */
box-shadow: 0 4px 16px rgba(0,0,0,0.12), 0 20px 64px rgba(0,0,0,0.08);
/* Dark */
box-shadow: 0 4px 16px rgba(0,0,0,0.60), 0 20px 64px rgba(0,0,0,0.50);
```

#### Surface Lighting Gradient (applies to all card/panel surfaces)
```css
/* Simulate overhead light — must be nearly invisible */
background-image: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
/* Dark mode: */
background-image: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%);
```
> If you can obviously see the gradient, halve the opacity.

#### Glassmorphism (sticky topbars, floating nav only)
```css
background: rgba(var(--bg-root-rgb), 0.75);  /* 75% opacity root bg */
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border-bottom: 0.5px solid var(--border-default);
```

---

## 8. Premium Surface Techniques

Use these for high-emphasis sections, hero areas, or premium feature highlights.

### 8.1 Gradient Border
Creates a coloured gradient border using `background-clip`. Works on any element with no real `border` property.
```css
.gradient-border {
  background:
    linear-gradient(var(--bg-surface-1), var(--bg-surface-1)) padding-box,
    linear-gradient(135deg,
      hsl(213, 80%, 60%),
      hsl(152, 68%, 50%),
      hsl(38, 92%, 55%)
    ) border-box;
  border: 1px solid transparent;
  border-radius: radius-large;  /* 12px */
}
```

### 8.2 Noise Texture Overlay
For premium empty states or marketing hero sections. Stack over base background.
```css
.noise-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* SVG noise pattern */
  opacity: 0.04;  /* Max 5%. Adjust to barely visible. */
  mix-blend-mode: overlay;
  pointer-events: none;
  border-radius: inherit;
}
```

### 8.3 Aurora / Mesh Background
Soft coloured radial glows for hero sections. Never inside product chrome.
```css
.aurora-bg {
  background:
    radial-gradient(ellipse 80% 60% at 20% 40%,
      hsla(213, 80%, 52%, 0.15) 0%,
      transparent 60%),
    radial-gradient(ellipse 60% 80% at 80% 60%,
      hsla(152, 68%, 36%, 0.12) 0%,
      transparent 60%),
    var(--bg-root);
}
```

### 8.4 Glowing Focus Ring (premium variant)
Enhances the base focus ring with a soft colour glow.
```css
/* Replaces the standard focus ring in premium contexts */
:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
  box-shadow:
    0 0 0 4px hsla(213, 80%, 52%, 0.20),  /* soft glow halo */
    var(--existing-shadow);               /* preserve element's own shadow */
}
```
