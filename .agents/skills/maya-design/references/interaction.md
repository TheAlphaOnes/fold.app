# Maya UI: Interaction & Auditory Feedback Principles

## 1. Decision Matrix: Which Audio Profile?

| Sound | Profile | Trigger |
|---|---|---|
| Standard button click | `soft` | Any button press |
| Dropdown / popover opening | `glass` | Transient panel appears |
| Toggle / switch | `toggle` | Boolean state change |
| Copy to clipboard | `crisp tick` | Micro-action confirmation |
| Drag-and-drop release | `drop` | Item placed / file uploaded |
| Form saved / task complete | `success` | Positive terminal action |
| Validation error | `warning` | Field validation fails |
| Critical failure | `error` | System block, hard error |

> **Rule:** Never play sound on typing, hover, keyboard navigation, or scroll. Always check `prefers-reduced-motion` as proxy to mute.

---

## 2. Implementation: Audio (Web Audio API pattern)

```js
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx;

function playTone({ freq = 440, type = 'sine', duration = 0.08, gain = 0.06 }) {
  if (!ctx) ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

// Profile presets
const SOUNDS = {
  'soft':   { freq: 600,  type: 'sine',     duration: 0.08, gain: 0.04 },
  'glass':  { freq: 1200, type: 'sine',     duration: 0.12, gain: 0.03 },
  'toggle': { freq: 800,  type: 'triangle', duration: 0.06, gain: 0.05 },
  'tick':   { freq: 1600, type: 'square',   duration: 0.04, gain: 0.02 },
  'pop':    { freq: 500,  type: 'sine',     duration: 0.10, gain: 0.05 },
  'drop':   { freq: 300,  type: 'sine',     duration: 0.15, gain: 0.06 },
  'success':{ freq: 880,  type: 'sine',     duration: 0.20, gain: 0.05 },
  'warning':{ freq: 400,  type: 'triangle', duration: 0.18, gain: 0.07 },
  'error':  { freq: 220,  type: 'sawtooth', duration: 0.25, gain: 0.08 },
};

function playSound(profile) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || userMuted) return;
  playTone(SOUNDS[profile] ?? SOUNDS['soft']);
}
```

---

## 3. Implementation: Predictive Prefetching

Use predictive prefetching to eliminate network latency based on user intent.

```js
// Trigger prefetch based on cursor trajectory toward a button
button.addEventListener('mousemove', (e) => {
  const rect = button.getBoundingClientRect();
  const buffer = 50; // px hitslop
  const near =
    e.clientX > rect.left - buffer &&
    e.clientX < rect.right + buffer &&
    e.clientY > rect.top - buffer &&
    e.clientY < rect.bottom + buffer;

  if (near) prefetchRoute(button.dataset.href);
});

// Keyboard fallback
button.addEventListener('focus', () => prefetchRoute(button.dataset.href));
```

---

## 4. Accessibility Mandates (Non-Negotiable)

Implement on every component.

### 4.1 Contrast Ratios (WCAG AA minimum)
| Context | Minimum Ratio |
|---|---|
| Normal text (< 18px regular / < 14px bold) | 4.5 : 1 |
| Large text (≥ 18px regular / ≥ 14px bold) | 3.0 : 1 |
| UI components, icons, graphical objects | 3.0 : 1 |
| Placeholder text | 3.0 : 1 (aim for 4.5) |
| Disabled elements | Exempt — but still be legible |

> Check the resolved token pairs from `tokens.md`. All semantic intent text-on-muted-bg pairs meet AA. Never swap text and background colours without re-checking.

### 4.2 Focus Ring Specification
```css
/* Apply to all :focus-visible states */
outline: 2px solid var(--focus-ring-color);
outline-offset: 2px;
border-radius: inherit; /* follows the component's own radius */

/* Focus ring colours */
--focus-ring-color-light: hsl(213, 80%, 52%);  /* Info blue */
--focus-ring-color-dark:  hsl(213, 75%, 62%);

/* For danger-context elements (delete buttons, destructive inputs) */
--focus-ring-color-danger: hsl(0, 72%, 54%);
```
**Never** remove `outline` without providing this exact replacement. `outline: none` without a substitute is an accessibility failure.

### 4.3 Keyboard Navigation
- Tab order must follow visual reading order (left→right, top→bottom).
- All interactive elements (buttons, inputs, links, dropdowns) must be reachable via Tab.
- Modal traps focus inside itself while open. Tab cycles within the modal.
- Escape closes: modals, drawers, dropdowns, tooltips (unless destructive action).
- Arrow keys navigate: dropdown item lists, radio groups, tab bars, sliders.
- Enter / Space activate: buttons, checkboxes, radio buttons, custom interactive elements.

### 4.4 ARIA Role Map
| Component | Role / Attributes |
|---|---|
| Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="{title-id}"` |
| Button | `role="button"` (native `<button>` preferred). Disabled: `aria-disabled="true"` |
| Input | `aria-labelledby` or `aria-label`. Invalid: `aria-invalid="true"`, `aria-describedby="{error-id}"` |
| Loading skeleton | `aria-busy="true"` on the container, `aria-label="Loading..."` |
| Toast | `role="status"` (info/success) or `role="alert"` (warning/error) |
| Dropdown | `role="listbox"` + `aria-expanded` on trigger, `role="option"` on items |
| Accordion | `aria-expanded` on trigger button, `aria-controls` linking to panel |
| Icon-only button | `aria-label="Descriptive action name"` |

### 4.5 Reduced Motion
**Mandatory wrapper for every animation:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```
