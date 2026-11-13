/**
 * WidgetSync — renders nothing. Keeps the three widgets fed from the
 * journal: On This Day, Today (home and lock screen) and the Contact Sheet.
 *
 * It runs on mount, whenever the journal changes and whenever the app comes
 * back to the foreground, so a memory kept, edited or deleted reaches the
 * home screen within moments. Photos are resized small and copied into the
 * shared widgets directory (widgets can't read the app's sandbox), named
 * after their source so later syncs reuse the copy; copies no widget uses
 * any more are swept.
 *
 * What each widget shows, and when it changes, is decided by the pure
 * builders in `model.ts`; this file only gathers and copies. iOS gets
 * timelines (picks rotate, the day line turns, midnight turns the page);
 * Android has none, so each sync pushes the current snapshot.
 */

import { useEffect, useRef } from 'react';
import { AppState, Linking, Platform, type AppStateStatus } from 'react-native';
import { requireOptionalNativeModule, type EventSubscription } from 'expo';
import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { addUserInteractionListener, widgetsDirectory } from 'expo-widgets';

import { useJournalStore } from '@/hooks/use-journal';
import {
  getCompositionsOnDate,
  getDatesWithMemories,
  getDayCountsForYear,
  getDayCoversForMonth,
  getOnThisDayCompositions,
  getRandomCompositionsBefore,
  resolveDocumentUri,
} from '@/db/journal-repository';
import { trackError } from '@/services/analytics';
import { addDays, startOfDay, toDayKey } from '@/utils/format-date';
import { computeStreak } from '@/utils/streak';
import {
  buildOnThisDayTimeline,
  buildSheetTimeline,
  buildTodayTimeline,
  endOfDay,
  isShowable,
  photoOf,
  sheetMonths,
  wordsOf,
  type DayCover,
  type OnThisDayProps,
  type SheetProps,
  type TodayProps,
  type WidgetMemory,
} from '@/widgets/model';
import type { Composition } from '@/types/journal';

/** How many earlier memories On This Day can fall back on. */
const FORGOTTEN_LIMIT = 24;
/** Photos are copied small: a widget never needs more, and copies stay cheap. */
const WIDGET_PHOTO_WIDTH = 600;
/** Thumbnails for the contact sheet's frames. */
const FRAME_PHOTO_WIDTH = 240;

/**
 * A build without expo-widgets' native side can't update widgets, and
 * importing the widget files would throw while requiring the missing
 * module, so they're only pulled in when it is present.
 */
const widgetsNative = requireOptionalNativeModule('ExpoWidgets');
/* eslint-disable @typescript-eslint/no-require-imports */
const onThisDayWidget: typeof import('@/widgets/on-this-day').default | null = widgetsNative ? require('@/widgets/on-this-day').default : null;
const todayWidget: typeof import('@/widgets/today').default | null = widgetsNative ? require('@/widgets/today').default : null;
const sheetWidget: typeof import('@/widgets/contact-sheet').default | null = widgetsNative ? require('@/widgets/contact-sheet').default : null;
/* eslint-enable @typescript-eslint/no-require-imports */

/** A stable file name for a photo's widget copy, from its source and size. */
function copyNameFor(source: string, width: number): string {
  let hash = 5381;
  const key = `${source}@${width}`;
  for (let i = 0; i < key.length; i++) hash = (hash * 33 + key.charCodeAt(i)) | 0;
  return `w${(hash >>> 0).toString(36)}.jpg`;
}

/** Copies photos into the widgets directory once each, remembering every copy this sync uses. */
function createCopier(directory: string) {
  const used = new Set<string>();
  const base = directory.replace(/\/+$/, '');
  const copy = async (source: string, width: number = WIDGET_PHOTO_WIDTH): Promise<string> => {
    const dest = `${base}/${copyNameFor(source, width)}`;
    try {
      const existing = await FileSystem.getInfoAsync(dest);
      if (!existing.exists) {
        const rendered = await ImageManipulator.manipulate(resolveDocumentUri(source)).resize({ width }).renderAsync();
        const saved = await rendered.saveAsync({ compress: 0.86, format: SaveFormat.JPEG });
        await FileSystem.moveAsync({ from: saved.uri, to: dest });
      }
      used.add(dest);
      return dest;
    } catch (error) {
      trackError(error, 'widget_photo_copy');
      return '';
    }
  };
  /** Removes copies no widget uses any more. */
  const sweep = async () => {
    const keep = new Set([...used].map((uri) => uri.split('/').pop() ?? ''));
    try {
      const entries = await FileSystem.readDirectoryAsync(base);
      const stale = entries.filter((name) => /^w[a-z0-9]+\.jpg$/.test(name) && !keep.has(name));
      await Promise.all(stale.map((name) => FileSystem.deleteAsync(`${base}/${name}`, { idempotent: true })));
    } catch (error) {
      trackError(error, 'widget_sweep');
    }
  };
  return { copy, sweep };
}

/** Reduces a memory to what a widget draws, copying its photo. */
async function toWidgetMemory(memory: Composition, copy: (source: string) => Promise<string>): Promise<WidgetMemory> {
  const photo = photoOf(memory);
  return {
    id: memory.id,
    createdAt: memory.createdAt,
    uri: photo ? await copy(photo.uri) : '',
    words: wordsOf(memory),
    place: memory.location?.name?.trim() ?? '',
  };
}

/**
 * On This Day's candidates: today's and tomorrow's anniversaries, and a
 * sample of everything before today. The model prefers memories older than
 * a fortnight, but a young journal still gets its earlier days.
 */
async function gatherPast(now: Date): Promise<Composition[]> {
  const tomorrow = addDays(now, 1);
  const [todays, tomorrows, forgotten] = await Promise.all([
    getOnThisDayCompositions(now.getMonth() + 1, now.getDate()),
    getOnThisDayCompositions(tomorrow.getMonth() + 1, tomorrow.getDate()),
    getRandomCompositionsBefore(startOfDay(now).getTime(), FORGOTTEN_LIMIT),
  ]);
  const thisYear = now.getFullYear();
  const anniversaries = [...todays, ...tomorrows].filter((m) => new Date(m.createdAt).getFullYear() < thisYear);
  const seen = new Set<number>();
  return [...anniversaries, ...forgotten].filter((m) => isShowable(m) && !seen.has(m.id) && seen.add(m.id));
}

/** The contact sheet's covers: each day's newest photo (copied small) and how many memories it holds. */
async function gatherCovers(now: Date, copy: (source: string, width: number) => Promise<string>): Promise<Record<string, DayCover>> {
  const months = sheetMonths(now);
  const years = [...new Set(months.map((m) => Number(m.slice(0, 4))))];
  const [coverMaps, countMaps] = await Promise.all([
    Promise.all(months.map((m) => getDayCoversForMonth(m))),
    Promise.all(years.map((y) => getDayCountsForYear(y))),
  ]);
  const counts = Object.assign({}, ...countMaps) as Record<string, number>;
  const photos = Object.assign({}, ...coverMaps) as Record<string, { uri: string; type: 'image' | 'video' }>;
  const covers: Record<string, DayCover> = {};
  for (const [key, count] of Object.entries(counts)) {
    if (!months.includes(key.slice(0, 7))) continue;
    const photo = photos[key];
    // Videos can't render in a widget; the day still counts as kept.
    covers[key] = { uri: photo?.type === 'image' ? await copy(photo.uri, FRAME_PHOTO_WIDTH) : '', count };
  }
  return covers;
}

export function WidgetSync() {
  const lastOnThisDay = useRef<OnThisDayProps | null>(null);
  const lastToday = useRef<TodayProps | null>(null);
  const lastSheet = useRef<SheetProps | null>(null);

  useEffect(() => {
    if (!onThisDayWidget || !todayWidget || !sheetWidget || !widgetsDirectory) return undefined;
    const directory = widgetsDirectory;

    let inFlight = false;
    let queued = false;

    const sync = async (): Promise<void> => {
      if (inFlight) {
        queued = true;
        return;
      }
      inFlight = true;
      try {
        const now = new Date();
        const { copy, sweep } = createCopier(directory);

        const [past, todays, activeDays, covers] = await Promise.all([
          gatherPast(now),
          getCompositionsOnDate(toDayKey(now)),
          getDatesWithMemories(),
          gatherCovers(now, copy),
        ]);

        const pastMemories: WidgetMemory[] = [];
        for (const memory of past) pastMemories.push(await toWidgetMemory(memory, copy));

        const showableToday = todays.filter(isShowable);
        const newest = showableToday[showableToday.length - 1];
        const todayMemory = newest
          ? { ...(await toWidgetMemory(newest, copy)), count: todays.length }
          : todays.length > 0
            ? { id: todays[todays.length - 1].id, createdAt: 0, uri: '', words: '', place: '', count: todays.length }
            : null;
        const streak = computeStreak(new Set(activeDays), now);

        const onThisDay = buildOnThisDayTimeline(pastMemories, now);
        const today = buildTodayTimeline(now, todayMemory, { current: streak.current, best: streak.longest });
        const sheet = buildSheetTimeline(now, covers);

        if (Platform.OS === 'ios') {
          onThisDayWidget.updateTimeline(onThisDay);
          todayWidget.updateTimeline(today);
          sheetWidget.updateTimeline(sheet);
        } else {
          onThisDayWidget.updateSnapshot(onThisDay[0].props);
          todayWidget.updateSnapshot(today[0].props);
          sheetWidget.updateSnapshot(sheet[0].props);
        }
        lastOnThisDay.current = onThisDay[0].props;
        lastToday.current = today[0].props;
        lastSheet.current = sheet[0].props;

        await sweep();
      } catch (error) {
        trackError(error, 'widget_sync');
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
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') void sync();
    };
    const appState = AppState.addEventListener('change', onAppState);
    // The page turns at midnight while the app is open, too.
    const untilMidnight = endOfDay(new Date()).getTime() - Date.now() + 1000;
    const midnight = setTimeout(() => void sync(), untilMidnight);

    // Android: a tap is a broadcast the app answers while it lives. Each
    // Button gets a target in tree order, so the index names the tapped one.
    let interaction: EventSubscription | undefined;
    if (Platform.OS === 'android') {
      const open = (url: string) => Linking.openURL(url).catch((error) => trackError(error, 'widget_deep_link'));
      interaction = addUserInteractionListener((event) => {
        const match = /^__expo_widgets_target_(\d+)/.exec(event.target);
        const index = match ? Number(match[1]) : -1;
        if (event.source === 'OnThisDay') {
          const p = lastOnThisDay.current;
          void open(p && !p.empty ? `fold://memory/${p.id}` : 'fold://');
        } else if (event.source === 'Today') {
          const p = lastToday.current;
          void open(p?.kept ? `fold://memory/${p.id}` : 'fold://');
        } else if (event.source === 'ContactSheet') {
          const day = lastSheet.current?.week[index];
          void open(day && !day.isFuture ? `fold://time-machine?day=${day.key}` : 'fold://time-machine');
        }
      });
    }

    return () => {
      unsubscribeJournal();
      appState.remove();
      clearTimeout(midnight);
      interaction?.remove();
    };
  }, []);

  return null;
}
