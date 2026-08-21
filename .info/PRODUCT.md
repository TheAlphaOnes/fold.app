# Fold — Product Documentation

> A private, offline-first memory engine. No cloud. No tracking. Everything on-device.

---

## 1. Product Vision

Fold is a personal memory journal that treats your data as yours alone. It exists because every other journaling app ultimately asks you to hand your memories to a server. Fold does not.

The product is built on a single, non-negotiable contract: **your memories belong to you**. No accounts. No server. No backend. No cloud sync. The app makes zero outbound connections except the iTunes Search API (for music previews) and optional, anonymous growth analytics. Everything else — every note, photo, audio recording, location tag, and thought — lives in a local SQLite database that never leaves the device.

Fold is not a productivity tool. It is not a social network. It is not a life-logging dashboard with charts and streaks. It is a quiet, private place to keep the fragments of your life.

---

## 2. Target Audience

### Primary

People who want a digital journal but refuse to give their personal data to a corporation. They have tried Day One, Apple Notes, Notion, or Instagram, and felt uncomfortable with the trade. They value:

- **Privacy as a default**, not a setting buried in a menu.
- **Simplicity over features** — a tool that gets out of the way.
- **Permanence** — their memories should not disappear when a startup shuts down or a server goes offline.
- **Craft** — the act of writing should feel deliberate, not like posting to a feed.

### Secondary

- Design-conscious users drawn to the Teenage Engineering aesthetic.
- Privacy advocates and security-minded individuals.
- People who keep paper journals and want a digital equivalent with the same intimacy.
- Users in regions with unreliable connectivity (the app works fully offline).

### Not the Audience

- Users who want social sharing, comments, or community features.
- Users who want cloud sync across devices.
- Users who want AI-powered insights, summaries, or mood analysis.
- Users who want reminders, streaks, or gamification.

---

## 3. Value Proposition

**Your memories, on your device, in a tool that feels like a precision instrument.**

Fold differentiates on three axes:

1. **Absolute privacy** — Not "privacy-first" marketing. Actually no server. The app has no way to access your data even if it wanted to.
2. **Tactile design** — Teenage Engineering-inspired industrial aesthetic. Monospace typography, film grain, hazard stripes, a spinning vinyl record. It feels like hardware, not software.
3. **Composable memories** — Memories are not just text entries. Each memory is a canvas where text, photos, videos, audio recordings, and music can be arranged freely. The memory becomes a rich, multimedia artifact.

---

## 4. Feature Set

### Writing

- Distraction-free full-page editor.
- 14 selectable typefaces — from system monospace to handwriting, script, pixel, and serif fonts.
- Adjustable font size.
- The writing surface is the focus. No toolbars cluttering the view while typing.

### Capture

- **Photos and videos** — Attach from the library or capture directly from the in-app camera.
- **Camera** — Full camera experience with flash, grid overlay, front/back switch, tap-to-focus. Tap for photo, hold for video.
- **Audio recording** — Voice notes recorded directly into a memory, visualized by a spinning TP-7-inspired vinyl record with a pulsing orange recording indicator.
- **Music** — Search the iTunes catalog, preview tracks, and attach 30-second song previews to a memory. The attached music displays as a vinyl record with album art.
- **Share intent** — Receive photos, videos, or links from other apps (Photos, Chrome, Files) directly into the compose screen.

### Canvas

- Media elements are placed as **draggable stickers** on a canvas overlaid on the text.
- Pan to move, pinch to resize (0.5x to 3x scale).
- Positions persist — the layout you create is saved and restored.
- Audio stickers show a vinyl record; video stickers show a play overlay; image stickers show the photo.

### Gallery

- Memories are displayed as **cards in an inverted vertical carousel**.
- Mathematical snapping centers each card perfectly in the screen.
- Cards scale based on scroll position — the centered card is full size, neighbors shrink.
- Double-tap a card to open the detail slideshow.
- The home screen shows "on this day" memories. The archive shows memories for a selected date.

### Memory Detail

- **Slideshow view** — Each memory is split into slides: text slides and media slides.
- Video slides auto-play when active.
- Audio slides have a **scrubbing vinyl record** — pan gesture to seek through the track.
- **Share as image** — Capture the memory card as a styled image with the Fold logo stamped on it.
- **Share raw file** — Share the original media file or text content.

### Calendar

- A Teenage Engineering-styled calendar on the profile screen.
- Shows which dates have memories (dots on active days).
- Tap a date to view that day's memories in the archive carousel.
- Navigable by days, months, and years.

### Biometric Lock

- Optional Face ID / fingerprint protection.
- Locks the app on launch and when returning from background.
- Shows ASCII cat art while awaiting authentication.
- Falls back gracefully on devices without biometrics.

### Privacy Screen

- When enabled, prevents screenshots and screen recording.
- Shows a blank "SYSTEM SECURED" screen in the app switcher.

### Export and Wipe

- **Export** — Download all memories as a JSON file. Requires biometric authentication.
- **Wipe** — Permanently delete all compositions. Requires biometric authentication and a confirmation dialog.

### Theme

- Three modes: light, dark, system.
- Light: pure white background, pure black text.
- Dark: near-black background (`#0F0F0F`), soft white text (`#EFEFEF`).
- Cycled in settings with a single tap.

---

## 5. User Journeys

### Journey: First Launch

1. User installs Fold. No sign-up, no email, no permission prompts.
2. The splash animation plays — an orange dot traces a cursive loop across the screen.
3. Onboarding: intro screen with ASCII art and "INITIALIZE" link.
4. User enters their name and date of birth.
5. Onboarding completes. User lands on the home screen.
6. The home screen shows the empty state: ASCII art card, "MEMORY_BANK : EMPTY", "> tap to begin _".

### Journey: Creating a Memory

1. User taps the orange Add button at the bottom of the home screen.
2. The compose screen slides in from the right.
3. User writes text in their chosen font (default JetBrains Mono Medium, 21pt).
4. User taps the image icon to attach a photo from their library.
5. The photo appears as a draggable sticker on the canvas. User positions it.
6. User taps the mic icon. A vinyl record overlay appears with a vignette. User records a voice note.
7. User taps the music icon. Searches for a song. Previews it. Selects it. The song downloads and attaches as a vinyl record sticker.
8. User taps the location icon. The app reverse-geocodes their coordinates to a city name and attaches it.
9. User taps "SAVE". The memory is written to SQLite. The compose screen dismisses.
10. The home screen refreshes and the new memory card appears in the carousel.

### Journey: Viewing a Memory

1. User double-taps a memory card on the home screen.
2. The detail slideshow opens.
3. If the memory has text, a text slide appears first — centered, themed font, scrollable.
4. User swipes to the next slide — a video. It auto-plays.
5. User swipes to an audio slide. A vinyl record spins. User can pan to scrub through the track.
6. User taps the share icon. A bottom sheet appears with two options.
7. User selects "Share Card as Image". The memory card is captured as a styled image with the Fold logo. The system share sheet opens.
8. User shares to Photos, Messages, or any other app.

### Journey: Browsing the Archive

1. User taps the profile button (top-right, with orange dot).
2. The profile screen opens, showing the calendar.
3. User navigates to a past month. Dates with memories are marked with dots.
4. User taps a date. The archive carousel opens, showing memories from that day.
5. User scrolls through the cards. Each snaps to center.
6. User double-taps a card to view the detail slideshow.

### Journey: Securing the App

1. User opens Settings.
2. Taps "BIOMETRIC LOCK" to enable.
3. Biometric authentication prompt appears. User authenticates.
4. The setting is enabled. From now on, the app locks on launch and when returning from background.
5. User also enables "PRIVACY SCREEN". Screenshots are now prevented. The app switcher shows a blank screen.
6. User backgrounds the app. The biometric gate appears with ASCII cat art.
7. User returns to the app. Face ID prompts. Authentication succeeds. "ACCESS GRANTED" appears briefly. The app unlocks.

---

## 6. Competitive Landscape

| App | Cloud | Privacy | Design | Multimedia | Price |
|---|---|---|---|---|---|
| **Fold** | None | Absolute | Industrial / TE-inspired | Canvas with draggable media | Private (free) |
| Day One | Yes (optional) | Server-based | Clean, conventional | Linear attachments | Subscription |
| Apple Notes | iCloud | Server-based | System default | Linear attachments | Free |
| Notion | Yes | Server-based | Clean, block-based | Linear attachments | Freemium |
| Instagram | Yes | Server-based | Social, image-first | Photos/video only | Free (ad-supported) |
| Bear | Yes (iCloud) | Server-based | Elegant, markdown | None | Subscription |
| Stoic | Yes | Server-based | Modern, colorful | None | Subscription |

Fold is the only app in this space that is **truly offline-first with no server**. Every competitor either syncs to a cloud server by default or offers it as a paid feature. Fold's privacy is architectural, not a setting.

---

## 7. Business Model

Fold is a private project. All rights reserved. There is no current monetization.

Potential future models that preserve the privacy contract:

- **One-time purchase** — Pay once, own forever. No subscription.
- **Tip jar** — Optional in-app purchase for users who want to support development.
- **Open source** — Release the code and accept sponsorships.

Models that are incompatible with Fold's values:

- Subscription with cloud sync (requires a server).
- Advertising (requires tracking).
- Selling aggregated/anonymized data (still a breach of trust).

---

## 8. Product Principles

These principles guide every product decision:

1. **Privacy is architectural, not a setting.** The absence of a server is the feature. You cannot toggle it on or off because it does not exist.

2. **The tool should feel like hardware.** Every interaction should have physical, mechanical feedback — haptics, spring physics, rubber-band resistance. The app should feel like a precision instrument.

3. **Content over chrome.** The UI should get out of the way. No toolbars while writing. No clutter on the home screen. The memory is the focus.

4. **Every pixel is intentional.** No decoration without purpose. The grain texture exists because flat is boring. The stripes exist because they signal industrial hardware. The monospace font exists because it feels technical.

5. **Offline is not a limitation.** It is the design. The app should work perfectly on a plane, in a tunnel, in a region with no connectivity. Offline is not a degraded mode — it is the only mode.

6. **No dark patterns.** No streaks. No reminders. No notifications begging for attention. No engagement metrics. The user opens Fold because they want to, not because the app nagged them.

7. **Memories are multimedia.** A memory is not just text. It is text, photos, videos, audio, and music arranged on a canvas. The arrangement is part of the memory.

8. **Permanence.** The user's data should survive app updates, device changes (via export), and the eventual death of the app itself (via JSON export). The data is stored in a standard SQLite database with a documented schema.

---

## 9. Success Metrics

Because Fold does not have a server, traditional product analytics are limited. The PostHog integration tracks:

- **App opens** — How often users return.
- **Screen views** — Which screens are used most.
- **Memory created** — With content type (text, image, video, audio, music) and media count breakdown.
- **Audio played** — Whether users engage with audio memories.
- **User age category** — Derived from date of birth, for understanding the audience.
- **Device region, language, timezone** — For understanding the global distribution.
- **Uncaught exceptions** — For stability monitoring.

Metrics that are deliberately **not** tracked:

- Time spent in app (Fold does not want to maximize engagement).
- Streaks or frequency (Fold does not want to create guilt).
- Content of memories (Fold has no way to see this, and never will).
- Retention cohorts tied to behavior (the app does not behaviorally profile users).

---

## 10. Future Considerations

### Potential Features

- **Search** — Full-text search across all memories. Currently the only way to find a memory is by date.
- **Tags or collections** — Group memories by theme, not just date.
- **Multi-device transfer** — Encrypted peer-to-peer transfer between devices (not cloud sync).
- **Richer export** — Export as a styled PDF book, not just JSON.
- **Widgets** — A "memory from this day" home screen widget.
- **Apple Watch** — Quick voice note capture from the wrist.

### Non-Goals

- Cloud sync. Ever.
- Social features. Ever.
- AI-powered analysis of memories.
- Collaboration or shared journals.
- Web app (the app is mobile-native by design).

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **Memory** | A single composition — text + media elements + metadata. |
| **Composition** | The internal name for a memory. Stored as a row in the `compositions` table. |
| **Media element** | An attached photo, video, audio recording, or music track within a memory. |
| **Canvas** | The layout mode where text and media stickers coexist on a draggable surface. |
| **Card** | The visual representation of a memory in the carousel. |
| **Slide** | A single page in the memory detail slideshow (text or media). |
| **Sticker** | A draggable, pinchable media element on the canvas. |
| **TP-7** | Teenage Engineering's TP-7 field recorder. The inspiration for the vinyl record component. |
| **TE Orange** | The signature accent color (`#F27A1A` light / `#FF4B00` dark). |
| **On this day** | The home screen's default query — memories created on the same month-day in any year. |
