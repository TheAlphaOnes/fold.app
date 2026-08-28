<div align="center">
  <img src="assets/logo.svg" width="120" height="120" alt="Fold Logo" />
</div>

# FOLD

> A private, offline-first memory engine. No cloud. No tracking. Everything on-device.

---

## What is Fold?

Fold is a personal memory journal for iOS and Android, built with an uncompromising commitment to privacy. Every note, photo, audio recording, and thought you capture stays entirely on your device — never uploaded, never analyzed, never monetized.

It's designed for people who want a place to keep the fragments of their life without giving them to a corporation. 

The aesthetic is heavily inspired by brutalist terminal interfaces and industrial hardware (like Teenage Engineering) — utilitarian, honest, and minimal.

---

## Features

- **Write** — Compose entries in multiple distinct typefaces. The writing surface is minimal and distraction-free.
- **Capture** — Attach photos and videos from your library, or shoot directly from the camera into a memory.
- **Record Audio** — Voice notes attach directly to a memory, visualized by a vinyl record animation.
- **Gallery & Story Board** — Browse your archive in a clean card layout. Select memories to view them as a seamless story.
- **Streak Tracking** — Build the habit of writing daily with a built-in streak tracker and heat map. Ranks evolve as your streak grows (Ignited, Burning, Inferno, etc.).
- **Biometric Lock** — Protect your journal behind Face ID or fingerprint. All or nothing.
- **Export & Share** — Share any memory as a flat image, with the Fold mark stamped on it. Square corners, platform-agnostic.
- **Brutalist UI** — A highly considered theme system featuring terminal-style success glitches, dot-matrix typography (`BitcountGridDouble`), and a subtle film grain on every surface.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) (SDK 57) + Expo Router |
| Language | TypeScript |
| State | Zustand |
| Database | expo-sqlite + **Drizzle ORM** |
| Animation | React Native Reanimated 4 |
| Gestures | React Native Gesture Handler |
| UI | Lucide icons, expo-image, expo-video |
| Audio | expo-audio |
| Fonts | JetBrains Mono, Bitcount Grid Double, + Google Fonts |
| Sharing | react-native-view-shot + expo-sharing |
| Auth | expo-local-authentication (biometrics) |
| Package Manager | pnpm |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Expo CLI (`npx expo`)
- For iOS: Xcode + iOS Simulator or physical device
- For Android: Android Studio or physical device

### Install

```bash
git clone https://github.com/TheAlphaOnes/fold.app.git
cd fold.app
pnpm install
```

### Run

```bash
# Start the dev server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android
pnpm android
```

> **Note:** Some features (biometrics, camera, audio recording) require a physical device or a development build. They will not work in Expo Go.

### Development Build (Native Features)

For the full feature set (biometrics, camera, audio recording), you must run a native dev build — **not** Expo Go.

```bash
pnpm expo run:ios
# or
pnpm expo run:android
```

---

### ⚠️ iOS Build Fix — expo-sqlite Header Conflict

> **This is required.** Without it, the iOS build fails with 67+ Swift compilation errors like `cannot find 'exsqlite3_bind_text' in scope`.

**Root Cause:** `expo-sqlite` ships a custom `sqlite3.h` that uses `#ifndef SQLITE3_H` as its include guard. This conflicts with Apple's system SQLite header (which is already included internally by iOS frameworks), causing the custom header to be silently skipped. The fix renames the guard and corrects the modulemap path.

**The fix is already in `Podfile` as a `post_install` hook.** After running `pnpm expo run:ios` for the first time, if you ever regenerate Pods (`pod install`), you must re-apply it:

```bash
cd ios && pod install && cd ..
pnpm expo run:ios
```

The hook in `Podfile` automatically:
1. Renames the `sqlite3.h` header guard from `SQLITE3_H` → `EXSQLITE3_H` to prevent the system SQLite collision.
2. Patches `ExpoSQLite.debug.xcconfig` and `ExpoSQLite.release.xcconfig` to set the correct `MODULEMAP_FILE` path pointing to `${PODS_ROOT}/Target Support Files/ExpoSQLite/ExpoSQLite.modulemap`.

**You do not need to do anything manually** — just don't delete the `post_install` block from `Podfile`.

---

## Project Structure

```
src/
├── app/                    # Expo Router file-based routes
│   ├── _layout.tsx         # Root layout, theme, auth gate
│   ├── index.tsx           # Home / gallery
│   ├── compose.tsx         # Write / compose screen
│   ├── camera.tsx          # Camera capture
│   ├── profile.tsx         # User profile, Streak Card, Heat Map
│   ├── stories/            # Multi-select Story Board viewing
│   ├── memory/[id].tsx     # Individual memory view
│   └── onboarding/         # Setup flow with haptic terminal interactions
├── components/             # Reusable UI components (StreakCard, ActivityGrid, etc.)
├── db/                     # Drizzle ORM schema, client, and repositories
├── hooks/                  # Zustand stores + custom hooks
├── types/                  # Shared TypeScript types
└── utils/                  # Pure utility functions
```

---

## Privacy

Fold is built on a simple contract with the user:

- **No accounts.** No sign-in, no email, no server.
- **No network requests.** The app makes zero outbound connections. There is no backend.
- **No analytics.** No tracking SDKs, no crash reporting that sends data off-device.
- **No ads.** Ever.

Your memories belong to you. Fold has no way to access them even if it wanted to.

---

## License

Private. All rights reserved.
