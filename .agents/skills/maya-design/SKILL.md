---
name: maya-design
description: >
  Use this skill whenever building UI, creating components, designing applications,
  or implementing animations. Provides the complete Maya design system: all token values,
  component blueprints with exact measurements, motion curves, interaction rules,
  accessibility mandates, and anti-patterns.
---

# Maya Design System

> **AI Agent Quick-Start:** This system is divided into 4 core references. You must consult the relevant reference based on your current task. Every named token resolves to a concrete value in the references. 

## Reference Guide
- **`references/tokens.md`**: Spacing, Border Radii, Typography, Colors (Light/Dark), Semantic Intents, Shadows, and Premium Surfaces.
- **`references/motion.md`**: Motion Curves, Durations, Theme Toggling, Container Animation, and Icon Swapping.
- **`references/interaction.md`**: Audio Profiles, Accessibility Mandates, ARIA Roles, Prefetching, and Sound Implementation.
- **`references/components.md`**: Exact anatomies and blueprints for 12 core UI components.

---

## Philosophy (3 pillars — memorise these)

| Pillar | Meaning |
|---|---|
| **Premium Aesthetics** | Every surface must feel considered. Curated colours, glass blur, layered shadows. Never plain. |
| **Dynamic Interaction** | UI responds kinetically to user intent. Spring physics, scale transforms, acoustic feedback. |
| **Systematic Composition** | Mathematically derived spacing. Components own their inner padding; layouts own the gaps between them. |

---

## Universal Rules

### Hard NEVER (breaking these produces wrong output)
1. **Never use linear easing** on state changes. Only on continuous progress bars.
2. **Never hardcode generic colour names** (`green`, `red`, `gray`). Always use the resolved token values from `tokens.md`.
3. **Never add outer margins to a component.** Components own inner padding. The parent layout gap owns the space between them.
4. **Never animate `width` or `height` directly** on auto-sized containers. Measure first, animate the resolved numeric dimension.
5. **Never use a single flat box-shadow.** Always layer two (tight edge + soft ambient).
6. **Never use solid neutral gray for modal backdrops.** Use alpha transparency: `rgba(0, 0, 0, 0.60)`.
7. **Never stack more than 3 distinct surfaces.** Depth becomes unreadable.
8. **Never play jarring or loud audio.** Default volume is subtle; severity scales up.
9. **Never nest a concentric element without adjusting its radius.** Always apply: `inner = outer - padding`.
10. **Never render modals inside local component trees.** Always render at the application root (portal / teleport pattern).

### Always
1. Anything clickable must visually depress on active state: `transform: scale(0.96)`.
2. Hover transitions must never be instant: minimum 100ms `ease-out`.
3. Every interactive element needs a minimum 40×40px hit target.
4. Disabled elements must be at 40% opacity and block all interaction at the render layer.
5. When a blocking modal mounts, scroll-lock the background view.
6. Every sound must have a visual equivalent. Sound enhances; never communicates alone.
7. Strip default system margins from all typography. Parent layout handles all spacing.
8. Prefer `transform` and `opacity` for animation. Never animate `width`, `height`, `top`, `left` directly.

---

## Anti-Patterns

### Visual Anti-Patterns
| ❌ Wrong | ✓ Correct |
|---|---|
| `border-radius: 6px` (arbitrary) | Use `radius-medium` (8px) |
| `color: green` (generic) | Use Semantic Intent from `tokens.md` |
| Single `box-shadow: 0 4px 8px rgba(...)` | Layer two shadows: tight edge + ambient |
| Solid gray modal backdrop `#00000099` | Use `rgba(0, 0, 0, 0.60)` with blur |
| Obvious visible gradient on dark theme | Max gradient opacity is 2–3%. |
| Component setting `margin: 16px` | Use layout gap — component sets `padding` only |

### Motion Anti-Patterns
| ❌ Wrong | ✓ Correct |
|---|---|
| `transition: all 300ms linear` | Use specific properties with correct curves |
| `transition: width 300ms` on auto-dimension | Measure first, animate resolved numeric value |
| Enter and exit same duration | Exit faster: modal enters 250ms, exits 150ms |
| All elements animate simultaneously | Stagger child elements 80ms apart |

### Interaction Anti-Patterns
| ❌ Wrong | ✓ Correct |
|---|---|
| Hit target < 40×40px | Expand with padding or `::after` pseudo-element |
| Popover opens instantly on hover | Add 200ms intentional delay |
| Modal rendered inside a component | Render at app root via portal |
| Backdrop click closes destructive modal | Disable outside-click for destructive actions |

---

## Companion Reference
- `userinterface-wiki` — UX laws (Fitts's Law, Miller's Law, Hick's Law) that underpin Maya's interaction model.
