# Fold

**Fold** is a minimalist, local-first journal and memory canvas built with React Native and Expo. Heavily inspired by the brutalist, highly tactile industrial design of Teenage Engineering, Fold rejects generic UI patterns in favor of a raw, physical, and highly aesthetic user experience.

## Features

- **The Memory Canvas:** Memories aren't just text. Drop photos, videos, and audio recordings onto a free-form canvas. Drag them around like physical stickers and place them exactly where you want them.
- **Physical Interactions:** UI elements feel like physical hardware. The primary "Add" button features a heavy, spring-loaded drag-up gesture that instantly launches your device's camera.
- **TE-Inspired Aesthetics:** A stark, high-contrast visual identity featuring monospace typography, dot-matrix heat maps, diagonal caution stripes, and a utilitarian layout. 
- **Local-First & Offline:** Your memories belong to you. Everything is stored locally on your device via SQLite. Zero cloud sync by default.
- **Biometric Security:** Sensitive operations (like wiping memory or exporting raw JSON data) are protected by native biometric gates (Face ID / Touch ID).

## Tech Stack

- **Framework:** [Expo](https://expo.dev) & [React Native](https://reactnative.dev)
- **Routing:** Expo Router (File-based routing)
- **Database:** `expo-sqlite` (Local data persistence)
- **Gestures & Animation:** `react-native-gesture-handler` & `react-native-reanimated`
- **Media:** `expo-image`, `expo-video`, `expo-audio`, `expo-image-picker`
- **Security:** `expo-local-authentication`
- **Styling:** Native StyleSheet with a custom brutalist design system

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

*(Note: Certain hardware features like the camera swipe gesture and biometric authentication require a physical device or a properly configured simulator to test fully).*

## Architecture Highlights

- **Direct DOM Bypass:** For high-performance 60fps dragging, stickers bypass React's render cycle using Reanimated's shared values and worklets.
- **Media Optimization:** Videos and images use native caching and performant rendering (via `expo-image` and `expo-video`). Camera captures are moved from temporary storage to persistent device directories to prevent data loss.
- **UI Render Guarding:** Large lists are protected with `React.memo` and `useCallback` to prevent virtual DOM thrashing during high-speed scrolling.
