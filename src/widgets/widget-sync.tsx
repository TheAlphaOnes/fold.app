/**
 * WidgetSync renders nothing. It keeps every registered widget surface
 * (see `surfaces.ts`) in step with the journal.
 *
 * Each surface is synced on mount, whenever the journal changes, whenever
 * the app returns to the foreground and at every midnight while the app is
 * open, so a memory kept, edited or deleted reaches the home screen within
 * moments. Photos go through one copier per sync, which then sweeps copies
 * nothing used. On Android, a tap on a widget is a broadcast the app
 * answers while it lives; it's routed to the surface that owns the widget.
 *
 * With no surfaces registered it does nothing at all.
 */

import { useEffect } from 'react';
import { AppState, Linking, Platform, type AppStateStatus } from 'react-native';
import { requireOptionalNativeModule, type EventSubscription } from 'expo';
import { addUserInteractionListener, widgetsDirectory } from 'expo-widgets';

import { useJournalStore } from '@/hooks/use-journal';
import { trackError } from '@/services/analytics';
import { endOfDay } from '@/widgets/model';
import { createPhotoCopier } from '@/widgets/photos';
import { WIDGET_SURFACES, type WidgetSurface } from '@/widgets/surfaces';

/** Builds without expo-widgets' native side can't update widgets, and loading a widget module would throw. */
const hasNativeWidgets = requireOptionalNativeModule('ExpoWidgets') !== null;

/** Android tap targets are named `__expo_widgets_target_<index>`, buttons numbered in tree order. */
const TARGET = /^__expo_widgets_target_(\d+)/;

export function WidgetSync({ surfaces = WIDGET_SURFACES }: { surfaces?: readonly WidgetSurface[] }) {
  useEffect(() => {
    if (!hasNativeWidgets || !widgetsDirectory || surfaces.length === 0) return undefined;
    const directory = widgetsDirectory;
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    let inFlight = false;
    let queued = false;

    const sync = async (): Promise<void> => {
      if (inFlight) {
        queued = true;
        return;
      }
      inFlight = true;
      try {
        const { copy, sweep } = createPhotoCopier(directory);
        const context = { now: new Date(), copy };
        // One surface failing never keeps the others stale.
        const results = await Promise.allSettled(surfaces.map((surface) => surface.sync(context, platform)));
        results.forEach((result, i) => {
          if (result.status === 'rejected') trackError(result.reason, `widget_sync_${surfaces[i].name}`);
        });
        await sweep();
      } finally {
        inFlight = false;
        if (queued) {
          queued = false;
          void sync();
        }
      }
    };

    void sync();

    // The journal store refreshes after every add, edit and delete.
    const unsubscribeJournal = useJournalStore.subscribe(() => void sync());
    const appState = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void sync();
    });

    // Midnight turns every widget's day, while the app is open too.
    let midnight: ReturnType<typeof setTimeout>;
    const scheduleMidnight = () => {
      midnight = setTimeout(() => {
        void sync();
        scheduleMidnight();
      }, endOfDay(new Date()).getTime() - Date.now() + 1000);
    };
    scheduleMidnight();

    let interaction: EventSubscription | undefined;
    if (platform === 'android') {
      interaction = addUserInteractionListener((event) => {
        const surface = surfaces.find((s) => s.name === event.source);
        if (!surface) return;
        const match = TARGET.exec(event.target);
        Linking.openURL(surface.tapUrl(match ? Number(match[1]) : -1)).catch((error) => trackError(error, 'widget_deep_link'));
      });
    }

    return () => {
      unsubscribeJournal();
      appState.remove();
      clearTimeout(midnight);
      interaction?.remove();
    };
  }, [surfaces]);

  return null;
}
