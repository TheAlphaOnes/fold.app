/**
 * Route for the stamps page. With the camera module installed it's the
 * stamp studio (camera on top, collection drawer below); without it, the
 * collection alone.
 */

import React from 'react';

import { hasNativeModule } from '@/components/stamps/needs-update';

// Required lazily: importing the studio loads the camera module at once, which crashes an older build.
const Screen: React.ComponentType = hasNativeModule('ExpoCamera')
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/components/stamps/stamp-studio').default
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/components/stamps/stamp-collection-screen').default;

export default function Route() {
  return <Screen />;
}
