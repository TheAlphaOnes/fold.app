/**
 * Route for the map. The screen uses a native module, so it's only
 * loaded when the installed app has it; otherwise a short note explains why.
 */

import React from 'react';

import { NeedsUpdate } from '@/components/stamps/needs-update';
import { MAPS_AVAILABLE } from '@/components/stamps/stamp-map-view';

// Required lazily: importing the screen loads its native module at once, which crashes an older build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Screen: React.ComponentType | null = MAPS_AVAILABLE ? require('@/components/stamps/stamp-map-screen').default : null;

export default function Route() {
  return Screen ? <Screen /> : <NeedsUpdate feature="your map" />;
}
