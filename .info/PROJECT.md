# Fold — Project Documentation

> A private, offline-first memory engine. No cloud. No tracking. Everything on-device.

---

## What is Fold?

Fold is a personal memory journal for iOS and Android. Every note, photo, audio recording, and thought stays entirely on the device — never uploaded, never analyzed, never monetized. It is designed for people who want a place to keep the fragments of their life without giving them to a corporation.

The app is built around a single contract with the user: **your memories belong to you**. No accounts, no server, no backend. The only outbound network requests are the iTunes Search API (for music preview downloads) and PostHog (anonymous, opt-out growth analytics).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 57 + Expo Router |
| Language | TypeScript (strict mode) |
| State | Zustand |
| Storage | expo-sqlite (on-device, WAL mode) |
| Animation | React Native Reanimated 4 |
| Gestures | React Native Gesture Handler |
| Camera | react-native-vision-camera v5 |
| UI | Lucide icons, expo-image, expo-video, react-native-svg |
| Audio | expo-audio |
| Fonts | JetBrains Mono + 13 Google Fonts via @expo-google-fonts |
| Sharing | react-native-view-shot + expo-sharing |
| Auth | expo-local-authentication (biometrics) |
| Analytics | PostHog (force opt-in, anonymous) |
| Package Manager | pnpm (hoisted node linker) |
| React Compiler | Enabled |

---

## Project Structure

```
src/
├── app/                        # Expo Router file-based routes
│   ├── _layout.tsx            # Root layout: DB init, theme, auth gate, splash
│   ├── index.tsx              # Home / gallery (inverted carousel)
│   ├── compose.tsx            # Write / compose screen
│   ├── archive.tsx            # Archive view (date-filtered carousel)
│   ├── camera.tsx             # Camera capture (photo + video)
│   ├── memory/[id].tsx        # Individual memory slideshow view
│   ├── profile.tsx            # User profile + calendar
│   ├── settings.tsx           # App settings
│   ├── privacy.tsx            # Privacy policy
│   ├── legal.tsx              # Legal terms
│   ├── feedback.tsx           # Feedback form
│   └── onboarding/            # Onboarding flow
│       ├── _layout.tsx
│       ├── index.tsx          # Intro screen
│       ├── name.tsx           # Name entry
│       └── dob.tsx            # Date of birth entry
├── components/                 # Reusable UI components
│   ├── memory-card.tsx        # The core memory card (3 layout modes)
│   ├── add-button.tsx         # Gesture-driven add button
│   ├── grain-background.tsx   # Film grain texture overlay
│   ├── vinyl-record.tsx       # TP-7 inspired spinning wheel
│   ├── draggable-sticker.tsx  # Pan/pinch draggable media
│   ├── splash-screen.tsx      # Animated splash (parametric dot)
│   ├── biometric-gate.tsx     # Face ID / fingerprint lock
│   ├── diagonal-stripes.tsx   # SVG hazard-stripe pattern
│   ├── double-diagonal-stripes.tsx
│   ├── empty-state.tsx        # ASCII art empty state
│   ├── logo.tsx               # Origami crane SVG
│   ├── themed-text.tsx        # Reusable text component
│   ├── themed-view.tsx
│   ├── action-link.tsx        # Animated CTA link
│   ├── top-bar.tsx            # Striped status bar
│   ├── music-picker.tsx       # iTunes search modal
│   ├── te-calendar.tsx        # Calendar date picker
│   ├── biometric-gate.tsx
│   ├── momentum-chart.tsx
│   ├── volume-chart.tsx
│   ├── activity-grid.tsx
│   ├── recent-assets.tsx
│   ├── clean-input.tsx
│   └── splash-screen.tsx
├── hooks/                      # Zustand stores + custom hooks
│   ├── use-journal.ts          # Compositions store (CRUD)
│   ├── use-settings.tsx       # Settings store (persisted)
│   ├── use-theme.tsx          # Theme provider + context
│   ├── use-color-scheme.ts    # System color scheme
│   ├── use-color-scheme.web.ts
│   ├── use-haptics.ts
│   └── use-video-thumbnail.ts
├── db/                         # Database layer
│   ├── client.ts              # Singleton SQLite connection
│   ├── schema.ts              # Table definitions + migrations
│   ├── journal-repository.ts  # Composition CRUD + URI re-anchoring
│   ├── settings-repository.ts # Key-value settings store
│   └── index.ts               # Barrel exports
├── types/                      # Shared TypeScript types
│   └── journal.ts             # MediaElement, Composition, LocationData
├── constants/
│   └── theme.ts               # Color tokens (light + dark)
└── utils/                      # Pure utility functions
    ├── format-date.ts         # Relative time + millis formatting
    └── pending-camera-media.ts # Module-level media passing
```

---

## Data Model

### Database Schema

Two tables in a single `fold.db` SQLite database (WAL journal mode):

**`compositions`**

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `text_content` | TEXT | The journal text |
| `media_elements` | TEXT | JSON string of `MediaElement[]` |
| `created_at` | INTEGER | Unix timestamp (ms) |
| `font_family` | TEXT | Default `JetBrainsMono-Regular` |
| `font_size` | INTEGER | Default 21 |
| `location_name` | TEXT | Optional city/neighborhood |
| `location_coords` | TEXT | Optional JSON of `LocationData` |

Indexed on `created_at DESC`.

**`user_settings`**

Simple key-value store: `key` (TEXT PK), `value` (TEXT).

### TypeScript Domain Types

```typescript
interface MediaElement {
  id: string;
  uri: string;
  type: 'image' | 'video' | 'audio';
  x_pos: number;
  y_pos: number;
  width?: number;
  height?: number;
  scale?: number;
  metadata?: { title: string; artist: string; artwork: string };
}

interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
}

interface Composition {
  id: number;
  textContent: string;
  mediaElements: MediaElement[];
  createdAt: number;
  fontFamily: string;
  fontSize: number;
  location?: LocationData;
}
```

### URI Re-anchoring

iOS changes the app sandbox container UUID on every fresh install/update. All absolute `file://` URIs stored in SQLite become invalid. The `resolveDocumentUri` function in `journal-repository.ts` extracts the filename after `/Documents/` and re-prefixes with the current `FileSystem.documentDirectory`.

---

## State Management

Two Zustand stores, no Redux, no Context for state:

### `useJournalStore`

- `compositions: Composition[]` — memories for the target date
- `loading: boolean`
- `targetDate: Date` — drives the "on this day" query
- `activeCompositionId: number | null` — which card is centered (for audio auto-play)
- `isAppVisible: boolean` — true after splash animation completes (guards audio)
- CRUD: `refresh`, `addComposition`, `updatePositions`, `removeComposition`, `removeAllCompositions`
- All mutations are optimistic (UI updates first, then DB writes)

### `useSettingsStore`

- `settings: UserSettings` — name, dob, theme, biometrics, privacy, etc.
- `loading: boolean`
- `loadSettings()` — reads all settings from SQLite on app start
- `updateSetting(key, value)` — optimistic update + SQLite persist

Settings are stored as strings in SQLite and coerced to booleans on load.

---

## Core User Flows

### 1. App Launch

1. `SplashScreen.preventAutoHideAsync()` blocks the native splash.
2. `_layout.tsx` initializes the database (`getDatabase()`), loads settings, and loads fonts (14 typefaces).
3. Once `dbReady && fontsLoaded && !settingsLoading`, the app is ready.
4. The native splash hides, revealing an identical RN splash component.
5. A parametric cursive-loop animation plays: an orange dot traces a dashed path over 2.5 seconds.
6. The splash fades out, `setAppVisible(true)` signals audio auto-play is safe.
7. Navigation gates: if `!hasOnboarded`, redirect to `/onboarding`; else redirect to `/`.

### 2. Onboarding

Three-screen flow: intro → name → date of birth. Sets `hasOnboarded = true` in SQLite. Uses `FadeInDown`, `FadeIn`, `FadeInUp` entrance animations with staggered delays.

### 3. Home (Gallery)

- Inverted vertical `FlatList` of memory cards.
- Mathematical snapping: `snapToOffsets` computed from card height + gap.
- Cards scale based on scroll position: `interpolate(scrollY, [0.92, 0.95, 1, 0.95, 0.92])`.
- Double-tap opens the detail slideshow.
- Bottom bar: date display + gesture-driven Add button.
- Top-right: profile button with orange notification dot.
- Share intent handler: receives shared media from other apps, copies to documents, navigates to compose.

### 4. Compose

- Full-page editor with toolbar (close, font picker, save).
- Date/time metadata row with attach buttons (image, camera, mic, music, location).
- Body text uses `expo-paste-input` for Gboard GIF/image paste support.
- Media elements are placed as draggable stickers on a canvas.
- Audio recording shows a vinyl record overlay with vignette.
- Music picker: searches iTunes API, downloads preview, attaches as media.
- Location: reverse-geocodes coordinates to a city name.

### 5. Memory Detail

- Paginated slideshow: splits content into text slides and media slides.
- Video slides auto-play when active, pause on press.
- Audio slides have a scrubbing vinyl record (pan gesture to seek).
- Share menu: "Share Card as Image" (captures the memory card via `react-native-view-shot`) or "Share Original File" (raw media or text).
- Bottom indicator beads show position (active = wide dash, inactive = small square).

### 6. Camera

- `react-native-vision-camera` v5 with photo and video output.
- Tap to capture photo, hold (300ms) to record video.
- Flash toggle, grid overlay, front/back camera switch.
- Focus tap with animated gold square.
- Recording indicator: rotating arc around the capture button.
- Captured media passed to compose via module-level `pending-camera-media` store (avoids URL encoding issues with `file://` URIs).

### 7. Settings

- Profile: name, date of birth.
- Appearance: theme cycling (light → dark → system).
- Security: biometric lock toggle, privacy screen toggle (both require biometric auth to change).
- Data: export all memories as JSON (requires biometric auth), wipe all device memory (requires biometric auth + confirmation).
- About: feedback, privacy policy, legal terms.
- ASCII art "SYS.CORE" mascot at the bottom.

---

## Privacy & Security

### Biometric Gate

- Optional Face ID / fingerprint lock on app launch and app foreground.
- Shows ASCII cat art while awaiting authentication.
- Falls back gracefully when hardware is unavailable (simulators).
- Re-authenticates on `AppState` transition from background to active.

### Privacy Screen

- When enabled, prevents screen capture via `expo-screen-capture`.
- Shows a blank "SYSTEM SECURED" screen in the app switcher.

### Data Ownership

- All data in local SQLite — no server, no sync.
- Export produces a JSON file of all compositions, shared via the system share sheet.
- Wipe deletes all compositions irreversibly.

---

## Build & Configuration

### Package Management

- **pnpm** with `node-linker=hoisted` (required for expo-sqlite iOS builds — CocoaPods needs physical folders, not symlinks).
- `.npmrc` contains `node-linker=hoisted`.

### Native Configuration

- `app.json` configures 11 Expo plugins including `expo-router`, `expo-splash-screen`, `expo-video`, `expo-audio`, `expo-image-picker`, `expo-media-library`, `expo-share-intent`, `expo-location`, `expo-localization`, and a custom `./plugins/withPasteInputFix` config plugin.
- New Architecture enabled (`newArchEnabled: true`).
- React Compiler enabled (`experiments.reactCompiler: true`).
- Typed routes enabled (`experiments.typedRoutes: true`).
- iOS Share Extension configured as an app extension via EAS Build.

### Custom Config Plugin

`plugins/withPasteInputFix.js` — patches `expo-paste-input`'s Kotlin source at prebuild time to remove the API 31+ guard on `ViewCompat.setOnReceiveContentListener`, enabling Gboard image/GIF pasting on Android < 12.

### Running

```bash
pnpm install
npx expo run:ios     # iOS simulator or device
npx expo run:android # Android emulator or device
```

---

## Analytics

PostHog is integrated for anonymous growth tracking:

- App opens and screen views are tracked automatically.
- `PostHogSync` component in `_layout.tsx` force-opts-in the user and registers device region, language, and timezone.
- Custom events: "Memory Created" (with content type, media breakdown, user age category), "Audio Played" (with context and auto-play flag).
- Uncaught exceptions are captured and sent to PostHog.

The README states "no analytics" but PostHog is present and force-opted-in. This is a discrepancy between documentation and implementation.
