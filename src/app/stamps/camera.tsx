/**
 * Route for the stamp camera. The screen uses a native module, so it's only
 * loaded when the installed app has it; otherwise a short note explains why.
 */

import React from 'react';

import { NeedsUpdate, hasNativeModule } from '@/components/stamps/needs-update';

// Required lazily: importing the screen loads its native module at once, which crashes an older build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Screen: React.ComponentType | null = hasNativeModule('ExpoCamera') ? require('@/components/stamps/stamp-camera-screen').default : null;

export default function Route() {
  return Screen ? <Screen /> : <NeedsUpdate feature="The stamp camera" />;
}
