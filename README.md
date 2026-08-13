# FOLD

> A private, offline-first memory engine. No cloud. No tracking. Everything on-device.

---

## What is Fold?

Fold is a personal memory journal for iOS and Android, built with an uncompromising commitment to privacy. Every note, photo, audio recording, and thought you capture stays entirely on your device — never uploaded, never analyzed, never monetized.

It's designed for people who want a place to keep the fragments of their life without giving them to a corporation.

---

## Features

- **Write** — Compose entries in 14 different typefaces, from system mono to handwriting fonts. The writing surface is minimal and distraction-free.
- **Capture** — Attach photos and videos from your library, or shoot directly from the camera into a memory.
- **Record Audio** — Voice notes attach directly to a memory, visualized by a vinyl record animation.
- **Gallery** — Browse your archive in a clean card layout. Every memory is renderable as a shareable image.
- **Export & Share** — Share any memory as a flat image, with the Fold mark stamped on it. Square corners, platform-agnostic.
- **Biometric Lock** — Protect your journal behind Face ID or fingerprint. All or nothing.
- **Dark & Light Mode** — A considered theme system that adapts to your system preference.
- **Grain Texture** — Every surface has a subtle film grain. Because flat is boring.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) (SDK 57) + Expo Router |
| Language | TypeScript |
| State | Zustand |
| Storage | expo-sqlite (on-device) |
| Animation | React Native Reanimated 4 |
| Gestures | React Native Gesture Handler |
| UI | Lucide icons, expo-image, expo-video |
| Audio | expo-audio |
| Fonts | JetBrains Mono + 13 Google Fonts via expo-google-fonts |
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
git clone https://github.com/your-username/fold.git
cd fold
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

### Development Build

For the full feature set, run a development build:

```bash
npx expo run:ios
# or
npx expo run:android
```

---

## Project Structure

```
src/
├── app/                    # Expo Router file-based routes
│   ├── _layout.tsx         # Root layout, theme, auth gate
│   ├── index.tsx           # Home / gallery
│   ├── compose.tsx         # Write / compose screen
│   ├── archive.tsx         # Archive view
│   ├── camera.tsx          # Camera capture
│   ├── profile.tsx         # User profile
│   ├── settings.tsx        # App settings
│   ├── memory/[id].tsx     # Individual memory view
│   └── onboarding/         # Onboarding flow
├── components/             # Reusable UI components
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

## Design Philosophy

Fold's aesthetic is inspired by Teenage Engineering's industrial hardware design — utilitarian, honest, minimal. Every pixel should feel intentional. The monospace typeface, the grain texture, the flat color palette — all of it is deliberate.

The UI is built to get out of your way and let you write.

---

## License

Private. All rights reserved.
