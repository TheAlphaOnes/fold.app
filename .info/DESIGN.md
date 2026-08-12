# Tactile Hardware Design System

This document outlines the design language, UI tokens, motion guidelines, and UX philosophy for the `web-have-sounds` documentation and landing page.

## Core Philosophy

The overarching theme is **"Tactile Hardware"**. The interface should feel less like a traditional web page and more like a high-end digital synthesizer or audio engineering tool.

Every interaction (hover, click, release) must provide immediate, satisfying multi-sensory feedback through:
1. **Visuals:** Snappy, physics-based CSS transforms and shadow manipulation.
2. **Audio:** Procedural sounds synthesized in real-time via the `web-have-sounds` engine.

---

## 1. Color Palette

We use a deep, almost pure-black dark mode ("Dark Void") contrasted with high-energy "Liquid Lava" accents to evoke glowing LEDs on dark graphite hardware.

| Token | Hex | Usage |
| :--- | :--- | :--- |
| **Dark Void** | `#0A0A0A` | Main application background. Purest dark. |
| **Surface 1** | `#141414` | Primary elevated surfaces (panels, cards). |
| **Surface 2** | `#1C1C1C` | Secondary elevated surfaces (buttons, toggles). |
| **Surface 3** | `#242424` | Tertiary surfaces (active states, hover highlights). |
| **Liquid Lava** | `#f56e0f` | Primary accent. Used for glowing active states, waveforms, and critical CTAs. |
| **Gluon Grey** | `#1b1b1e` | Deep muted background element. |
| **Slate Grey** | `#262626` | Subtle separators and borders. |
| **Dusty Grey** | `#878787` | Muted text and inactive icons. |
| **Snow** | `#fbfbfb` | Primary text. Not pure white, reducing eye strain against the dark void. |

*Borders are handled via opacity (`rgba(255, 255, 255, 0.08)` to `0.28`) to blend naturally over different surface depths.*

---

## 2. Typography

Typography is highly geometric, legible, and technical.

- **Primary Sans (UI & Prose):** `Inter`, `-apple-system`, `sans-serif`
- **Monospace (Code & Technical Labels):** `JetBrains Mono`, `monospace`

**Styling Rules:**
- Technical labels (like "DOM Bindings", "Output") should be uppercase, heavily tracked (`tracking-widest`), small (`text-[10px]` or `11px`), and muted (`opacity-50`).
- Headings are tight, bold, and use `Inter`.

---

## 3. Motion & Physics (The "Chunky Key")

To simulate physical hardware buttons, we rely heavily on box-shadow manipulation rather than generic CSS scales.

The `.chunky-key` class is the core interaction primitive:

### Idle State
- Small top border to catch simulated overhead light (`border-top: 1px solid rgba(255, 255, 255, 0.1)`).
- Layered box shadows to create physical height (`2px 10px 15px rgba(0,0,0,0.5)`).

### Active (Pressed) State
- The button translates diagonally down (`translate(2px, 4px)`).
- It scales down slightly to simulate pushing into Z-space (`scale(0.97)`).
- The outer shadow flattens, and a deep **inner shadow** is applied (`inset 0 3px 6px rgba(0,0,0,0.3)`) to simulate the user's finger occluding the light.
- Brightness drops (`filter: brightness(0.9)`).

### Easing Curves
- **Release (Up):** Snappy but slightly elastic: `cubic-bezier(0.34, 1.56, 0.64, 1)` (duration `0.1s`).
- **Press (Down):** Hard and immediate: `ease` (duration `0.03s`).

---

## 4. Audio Feedback (UX)

The UI visual state is only 50% of the experience. Every interactive element must be bound to the audio engine.

- **Buttons & Toggles:** Bind to `click`, `pop`, or `tick` sounds.
- **Hovers:** Bind to `hover` (use sparingly, mostly on critical navigational elements to avoid fatigue).
- **Destructive/Heavy Actions:** Bind to `thud` or `drop`.
- **Backgrounds:** Use `startLoop('hum')` or `startLoop('pulse')` at a very low volume to give the interface a "running engine" presence.

*When attaching sounds to DOM elements declaratively, use `data-uisound` and `data-uisound-feel` attributes.*

---

## 5. Layout & Grid

- **Overscroll:** We disable browser bounce (`overscroll-behavior: none`) globally so the app feels native and fixed, like a hardware console.
- **Grids:** Use faint borders (`rgba(255, 255, 255, 0.15)`) to partition the screen into logical "modules" (like a Eurorack synthesizer).
- **Visualizers:** Canvas visualizers (oscilloscopes, sequencers) should use `shape-rendering: crispEdges` or exact pixel scaling (`devicePixelRatio`) to maintain a sharp, technical aesthetic.
