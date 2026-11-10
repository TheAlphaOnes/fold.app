/**
 * Route for the in-app camera. The screen uses the camera module, so it's
 * only loaded when the installed app has it; otherwise a short note.
 */

import React from 'react';

import { NeedsUpdate, hasNativeModule } from '@/components/stamps/needs-update';

// Required lazily: importing the screen loads the camera module at once, which crashes an older build.
const Screen: React.ComponentType | null = hasNativeModule('ExpoCamera')
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/components/capture/capture-camera').default
  : null;

export default function Route() {
  return Screen ? <Screen /> : <NeedsUpdate feature="the camera" />;
}
