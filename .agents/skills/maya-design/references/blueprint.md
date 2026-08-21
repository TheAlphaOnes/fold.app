# The Three-Layer App Blueprint

> **AI Agent Directive:** Do not write code or style UI until you have consciously walked through these three architectural layers. This blueprint is the mandatory sequence for building any application feature, ensuring it is functional, trustworthy, and emotionally engaging.

---

## Layer 1: The Experience Foundation (Functionality First)

Before applying any design tokens or visual polish, you must solve the core functional problem. An app that takes too many clicks to perform its primary function will fail, regardless of how beautiful the UI is.

### AI Mandates for Layer 1:
1. **Write It Down First:** 
   - Never start with visuals. Create a text-based strategy or state machine that maps out the exact user flow.
   - Define the core problem: *What is the user's primary "job to be done" on this screen?*
2. **Screen Mapping (Raw Wireframing):** 
   - Outline every step of the flow.
   - Decide *where* every feature lives hierarchically before deciding *what* it looks like.
   - Group related data and remove any unnecessary steps.
3. **Optimize the Core (Frictionless Execution):** 
   - Build the functional logic first (state management, API calls, data validation).
   - Ensure the user can complete their primary task in the absolute minimum number of interactions.
   - **Anti-Pattern:** Forcing a user to navigate through 3 screens for an action that could be a bottom-sheet modal.

---

## Layer 2: Interface Boosting (The 50-Millisecond Trust Test)

Users judge the reliability of an app within 50 milliseconds. The visual interface is a subconscious trust badge. A modern, minimal, aesthetic design is a business driver, not just decoration.

### AI Mandates for Layer 2:
1. **Curate an Independent Palette:**
   - Do not rely solely on brand logos for UI colors. Use the curated tokens from `tokens.md`.
   - **Action:** Reserve the absolute highest contrast colors (e.g., `theme.accent`, `theme.primary`) STRICTLY for primary calls-to-action (e.g., "Log Expense", "Save Entry").
   - Secondary actions must safely fade into the background (use `theme.backgroundElement`, `theme.textMuted`).
2. **Visual Breathing Room:**
   - Never cram every feature into a single view.
   - **Action:** Implement strategic whitespace using standard gap/padding tokens (e.g., `gap: 24`, `padding: 32`).
   - Reduce the contrast (opacity, text weight) of less important content to establish clear visual hierarchy.
3. **Design for Security:**
   - Clean, minimal design creates subconscious feelings of safety and competence.
   - **Action:** For sensitive views (payments, biometric gates, private journals), increase padding, use strict alignment, and remove all decorative clutter. Use `rgba(0,0,0,0.6)` backdrops to focus attention securely.

---

## Layer 3: Emotional Design Integration (The Secret Sauce)

Digital interfaces naturally lack tone and body language. If you do not intentionally design emotional feedback, the user will treat the app like a cold utility and churn. You must design the human connection.

### AI Mandates for Layer 3:
1. **Micro-interactions for Habits:**
   - For daily-use features, basic confirmations are not enough.
   - **Action:** Inject instant emotional feedback on success. Use `react-native-reanimated` for a subtle bounce (`withSpring`), a glow, or a tactile haptic burst (`expo-haptics`) when a user logs an entry.
2. **Visualize Momentum:**
   - Give the user a sense that they are building something over time.
   - **Action:** Use progress bars, streak counters, or level visualizations. If they abandon the app, make the visual loss of that progress apparent.
3. **Front-Load Trust with Polish:**
   - For high-friction moments (Sign up, Onboarding, Waitlists, Payment), deploy your heaviest design polish.
   - **Action:** Add smooth stagger-fade-ins, flawless input validation, loading spinners inside buttons, and high-quality typography.
4. **Make it Tactile:**
   - Turn basic features into satisfying, physical moments.
   - **Action:** Ensure every button depresses slightly (`scale: 0.96`) on press. Add smooth layout transitions (`LinearTransition`). Use the physics-based motion curves defined in `motion.md` to make the digital screen feel premium and tactile.

---

## The Three Archetypes of Emotional Design

When applying Layer 3, identify which archetype the feature falls into and apply these specific strategies:

1. **Building Habits & Engagement (The Duolingo Method)**
   - *For daily actions like journaling or capturing memories.*
   - **Action:** Add instant emotional feedback to everyday actions (a subtle bounce, a glow). Celebrate small wins intentionally. Visualize momentum by showing streaks or completed logs so the user feels the weight of their progress.
2. **Building Trust & Overcoming Skepticism (The Phantom Method)**
   - *For complex or high-stakes features (privacy, settings, data deletion).*
   - **Action:** Treat visual polish as a core security feature. Make the UI approachable, warm, and highly responsive. How the product feels when someone taps or waits directly impacts their confidence in its stability.
3. **Selling a Premium, Luxury Experience (The Revolut Method)**
   - *For the overarching app feel and onboarding.*
   - **Action:** Nail the first impression with rich visuals and smooth transitions in the onboarding flow. Make data dynamic (charts that respond to dragging). Add quiet animations, fades, and hover effects that don't shout, but combined create a highly premium, tactile feel.

---

## 🛑 Pre-Flight Checklist for AI Agents

Before submitting code for a feature, verify:
- [ ] **Layer 1:** Is the core user task achievable with the absolute minimum number of taps?
- [ ] **Layer 2:** Is the primary CTA the highest contrast element on the screen? Is there enough whitespace?
- [ ] **Layer 3:** Does the feature respond emotionally? (Haptics, spring animations, scale-downs on press).
