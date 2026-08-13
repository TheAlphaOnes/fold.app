<div align="center">
  <img src="assets/fold-logo.png" alt="Fold Logo" width="200" />
</div>

# Fold

Most journals force your memories into rigid lines of text and perfectly aligned grids. But human memory doesn't work that way. Memories are messy, visual, and chaotic. 

Fold is a digital canvas that respects how you actually remember things. Instead of typing into a box, you drop photos, videos, and voice notes onto a free-form surface. You can drag them around, stack them, and arrange them exactly how the moment felt. It is a space designed to capture the raw, unfiltered reality of your days.

We built Fold with a singular vision: to give you back ownership of your personal space. There are no algorithms, no social feeds, and no mandatory cloud syncs. Your canvas lives entirely on your device, locked behind your own biometrics. It is a tool built for you, and only you.

---

## Technical Architecture (Hackathon Details)

While the product experience is designed to be as invisible and fluid as possible, the underlying architecture is built for high performance and strict privacy.

- **Framework:** Built with React Native and Expo (using Expo Router for file-based navigation).
- **Direct DOM Bypass:** To achieve 60fps when dragging media around the canvas, Fold completely bypasses React's render cycle during gestures, utilizing Reanimated's shared values and worklets running directly on the UI thread.
- **Local-First Database:** The entire application runs offline. Data is persisted using `expo-sqlite`, ensuring absolute privacy and zero latency.
- **Media Handling:** Camera captures are saved instantly to the device's persistent application directory. We leverage native media rendering (`expo-image`, `expo-video`, `expo-audio`) to handle heavy assets without blocking the main JavaScript thread.
- **Security:** Sensitive actions, including raw JSON data exports and device memory wiping, are protected by `expo-local-authentication`, tying directly into the native secure enclave (Face ID / Touch ID).

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the app:**
   ```bash
   npm start
   ```

3. **Open on your device:**
   Download the Expo Go app on your phone and scan the QR code, or press `i` to launch the iOS simulator.

*(Note: Hardware features like the camera swipe gesture and biometric authentication require a physical device or a properly configured simulator to test fully).*
