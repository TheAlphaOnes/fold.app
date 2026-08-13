<div align="center">
  <img src="assets/fold-logo.png" alt="Fold Logo" width="120" />
  <h1>Fold</h1>
  <p><strong>A spatial journal for messy, beautiful minds.</strong></p>
</div>

---

## 📌 Vision

Most journals force your memories into rigid lines of text and perfectly aligned grids. But human memory doesn't work that way. Memories are visual, chaotic, and spatial. 

**Fold is a digital canvas that respects how you actually remember things.** 
Instead of typing into a box, you drop photos, videos, and voice notes onto a free-form surface. You can drag them around, stack them, and arrange them exactly how the moment felt. It is a space designed to capture the raw, unfiltered reality of your days.

We built Fold with a singular vision: to give you back ownership of your personal space. There are no algorithms, no social feeds, and no mandatory cloud syncs. Your canvas lives entirely on your device, locked behind your own biometrics.

---

## 🚀 Features

- **Spatial Canvas**: Drag, drop, and place text, images, videos, and audio freely.
- **Local-First Architecture**: Your data never leaves your device unless you export it.
- **Biometric Security**: Secure your memories behind Face ID or Touch ID.
- **Universal Capture**: Swipe up directly from the home screen to instantly capture a photo or video.
- **Rich Insights**: Visualize your journaling habits with GitHub-style heatmaps and volume charts.
- **Zero-Latency Interactions**: 60FPS gesture interactions using native UI thread worklets.

---

## 🛠️ Tech Stack

Fold is built for high performance and strict privacy:

- **Framework**: [Expo](https://expo.dev) & React Native
- **Navigation**: Expo Router (File-based routing)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Database**: `expo-sqlite` (Local, on-device persistence)
- **Animations**: `react-native-reanimated` (Direct UI thread manipulation)
- **Gestures**: `react-native-gesture-handler`

---

## 🏃 Getting Started

### Prerequisites
- Node.js (v18 or newer)
- `npm` or `pnpm`
- iOS Simulator or an physical device with [Expo Go](https://expo.dev/client).

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TheAlphaOnes/fold.app.git
   cd fold.app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   *(Or `pnpm install` if you prefer).*

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Launch the App**
   - Press `i` to open in the iOS simulator.
   - Or scan the QR code with the Expo Go app on your physical device.

> **Note**: Hardware features like the camera swipe gesture and biometric authentication require a physical device or a properly configured simulator to test fully.

---

## 🔒 Privacy & Security

Fold operates on a strict **local-first** principle.
- No analytics trackers.
- No background data harvesting.
- Raw JSON exports available at any time.
- Single-tap "Erase Everything" function.

All sensitive actions tie directly into the native secure enclave (Face ID / Touch ID) via `expo-local-authentication`.

---

<div align="center">
  <i>Built with care for those who want to remember.</i>
</div>
