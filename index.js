/**
 * Fold — Root entry point
 *
 * This file exists so Metro can resolve `./index` when Expo Go requests
 * `/index.bundle`. It simply re-exports the expo-router entry point.
 *
 * Without this, pnpm's symlinked node_modules can cause Metro to fail
 * resolving `expo-router/entry` via the package.json `main` field.
 */

import 'expo-router/entry';
