/**
 * StampWidgetSync — renders nothing. Keeps the "Today's Stamp" home screen
 * widget current with the journal: the progression store already refreshes
 * on launch, on return to the foreground, and right after a memory is
 * saved, so simply subscribing to it updates the widget at exactly those
 * moments.
 *
 * Each push writes one timeline: today's snapshot now, plus the midnight
 * entry that resets the stamp — the heartbeat of the cycle, delivered even
 * if the app never opens again today.
 */

import { useEffect } from 'react';
import { Platform, TurboModuleRegistry } from 'react-native';

import { useProgressionStore } from '@/hooks/use-progression';
import { buildStampSnapshot, nextMidnight, snapshotAfterMidnight } from '@/widgets/stamp-snapshot';

/**
 * A build without expo-widgets' native side (like the current dev client)
 * cannot update the widget, and importing the widget file would throw while
 * requiring the missing module — so it is only pulled in when present.
 */
const widget: typeof import('@/widgets/todays-stamp').default | null =
  TurboModuleRegistry.get('ExpoWidgets') != null
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/widgets/todays-stamp').default
    : null;

export function StampWidgetSync() {
  useEffect(() => {
    if (!widget) return undefined;

    let lastPush = '';
    const push = () => {
      const { activeDays, memoryCount, loaded } = useProgressionStore.getState();
      if (!loaded) return;

      const now = new Date();
      const snapshot = buildStampSnapshot({ activeDays, memoryCount, now });
      const key = JSON.stringify(snapshot);
      if (key === lastPush) return;
      lastPush = key;

      if (Platform.OS === 'ios') {
        // One timeline does both jobs: the day as it stands, and the
        // midnight entry that empties the stamp for tomorrow.
        widget.updateTimeline([
          { date: now, props: snapshot },
          { date: nextMidnight(now), props: snapshotAfterMidnight(snapshot, now) },
        ]);
      } else {
        widget.updateSnapshot(snapshot);
      }
    };

    push();
    return useProgressionStore.subscribe(push);
  }, []);

  return null;
}
