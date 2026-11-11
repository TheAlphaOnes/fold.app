/**
 * The catch-all — where a deep link lands when no route matches it. The
 * iOS share extension opens the app at `fold://dataUrl=…#media`, which is
 * a handoff, not a page: the files are received by ShareIntakeHost in the
 * root layout, which is always mounted. So this route draws nothing and
 * walks the app home.
 */

import { useEffect } from 'react';
import { View } from 'react-native';

import { navigate } from '@/utils/navigation';

export default function CatchAllRoute() {
  useEffect(() => {
    navigate.replace('/');
  }, []);
  return <View />;
}
