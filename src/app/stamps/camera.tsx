/**
 * The stamp camera now lives on the stamps page itself (StampStudio); this
 * route sends there, or explains when the app has no camera module yet.
 */

import React from 'react';
import { Redirect } from 'expo-router';

import { NeedsUpdate, hasNativeModule } from '@/components/stamps/needs-update';

export default function Route() {
  return hasNativeModule('ExpoCamera') ? <Redirect href="/stamps" /> : <NeedsUpdate feature="the stamp camera" />;
}
