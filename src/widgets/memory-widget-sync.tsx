/**
 * MemoryWidgetSync — renders nothing. Keeps the three memory widgets fed:
 * the slideshow's photos, the wall's waterfall, and the ring's wheel.
 *
 * It runs on mount, whenever the journal changes, and whenever the app
 * returns to the foreground — so a memory folded, edited or deleted shows
 * up on the home screen within moments. Photos are resized small and
 * copied into the shared widgets directory (widgets cannot read the app's
 * sandbox), named after their source so later syncs reuse the copy.
 *
 * iOS gets timelines: the slideshow steps through its show and the ring
 * turns one photo per entry, WidgetKit cross-fading every change. Android
 * has no timelines, so each sync pushes one snapshot and the slideshow's
 * photo advances one step every time the app runs.
 */

import { useEffect, useRef } from 'react';
import { AppState, Linking, Platform, type AppStateStatus } from 'react-native';
import { requireOptionalNativeModule, type EventSubscription } from 'expo';
import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { addUserInteractionListener, widgetsDirectory } from 'expo-widgets';

import { useJournalStore } from '@/hooks/use-journal';
import { PAST_SAMPLE_SIZE } from '@/hooks/use-profile-data';
import { getRandomCompositionsBefore, resolveDocumentUri } from '@/db/journal-repository';
import { findRandomPastMemories } from '@/services/resurface.service';
import { trackError } from '@/services/analytics';
import {
  buildRingTimeline,
  buildRingTiles,
  buildSlideshowTimeline,
  buildWallTiles,
  captionFor,
  pictureOf,
  RING_TILE_COUNT,
  SLIDE_COUNT,
  WALL_COLUMN_WIDTH,
  WALL_TILE_COUNT,
  type MemorySlide,
  type RingTile,
  type SlideshowProps,
  type WallTile,
} from '@/widgets/slideshow';
import type { Composition, MediaElement } from '@/types/journal';

/** How many random memories feed the slideshow and the ring. */
const RANDOM_LIMIT = 30;

/** Photos are copied small: a widget never needs more, and copies stay cheap. */
const WIDGET_PHOTO_WIDTH = 600;

/** The waiting state a widget shows before the journal has anything for it. */
const EMPTY_SLIDE: SlideshowProps = { empty: true, id: 0, uri: '', caption: '', index: 0, total: 0 };

/**
 * A build without expo-widgets' native side cannot update the widgets, and
 * importing the widget files would throw while requiring the missing module —
 * so they are only pulled in when present. Expo modules live in the Expo
 * module registry, not React Native's TurboModule registry, hence the
 * optional require rather than a TurboModuleRegistry lookup.
 */
const widgetsNative = requireOptionalNativeModule('ExpoWidgets');
const slideshowWidget: typeof import('@/widgets/memories-slideshow').default | null = widgetsNative
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/widgets/memories-slideshow').default
  : null;
const wallWidget: typeof import('@/widgets/memory-wall').default | null = widgetsNative
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/widgets/memory-wall').default
  : null;
const ringWidget: typeof import('@/widgets/memory-ring').default | null = widgetsNative
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/widgets/memory-ring').default
  : null;

/** Widgets show still photos: videos cannot render inside a widget. */
function photosOnly(memories: Composition[]): Composition[] {
  return memories.map((memory) => ({
    ...memory,
    mediaElements: memory.mediaElements.filter(
      (media) => media.type === 'image' && !media.isGif && !media.isStamp,
    ),
  }));
}

/** A stable file name for a photo's widget copy, from its source URI. */
function copyNameFor(source: string): string {
  let hash = 5381;
  for (let i = 0; i < source.length; i++) hash = (hash * 33 + source.charCodeAt(i)) | 0;
  return `w${(hash >>> 0).toString(36)}.jpg`;
}

/**
 * One photo's widget copy: resized small and written into the shared
 * widgets directory, named after its source so later syncs reuse the
 * file instead of resizing again. Returns '' when the copy fails, and
 * the failure is recorded rather than swallowed.
 */
async function ensureWidgetCopy(source: string, directory: string): Promise<string> {
  const dest = `${directory.replace(/\/+$/, '')}/${copyNameFor(source)}`;
  try {
    const existing = await FileSystem.getInfoAsync(dest);
    if (existing.exists) return dest;
    const rendered = await ImageManipulator.manipulate(resolveDocumentUri(source))
      .resize({ width: WIDGET_PHOTO_WIDTH })
      .renderAsync();
    const saved = await rendered.saveAsync({ compress: 0.88, format: SaveFormat.JPEG });
    await FileSystem.moveAsync({ from: saved.uri, to: dest });
    return dest;
  } catch (error) {
    trackError(error, 'memory_widget_copy');
    return '';
  }
}

/** Copies whose photos no widget shows any more — safe to sweep. */
async function sweepOrphans(directory: string, keepUris: ReadonlySet<string>): Promise<void> {
  // The keep set holds full file:// paths; the directory lists bare names.
  const keep = new Set([...keepUris].map((uri) => uri.split('/').pop() ?? ''));
  try {
    const entries = await FileSystem.readDirectoryAsync(directory);
    const stale = entries.filter((name) => /^w[a-z0-9]+\.jpg$/.test(name) && !keep.has(name));
    await Promise.all(
      stale.map((name) => FileSystem.deleteAsync(`${directory.replace(/\/+$/, '')}/${name}`, { idempotent: true })),
    );
  } catch (error) {
    trackError(error, 'memory_widget_sweep');
  }
}

export function MemoryWidgetSync() {
  const lastSlides = useRef<MemorySlide[]>([]);
  const lastWall = useRef<WallTile[]>([]);
  const lastRing = useRef<RingTile[]>([]);
  /** Android's current slideshow photo, the one its snapshot shows. */
  const lastSlide = useRef<MemorySlide | null>(null);
  const androidSlide = useRef(0);

  useEffect(() => {
    if (!slideshowWidget || !wallWidget || !ringWidget || !widgetsDirectory) return undefined;

    let inFlight = false;
    let queued = false;

    const sync = async (): Promise<void> => {
      if (inFlight) {
        queued = true;
        return;
      }
      inFlight = true;
      try {
        // The wall draws from the profile's own sample — the same random
        // "from your past" pool the profile page deals its waterfall from —
        // while the slideshow and the ring take their own random draw,
        // today's memories included.
        const [past, random] = await Promise.all([
          findRandomPastMemories(PAST_SAMPLE_SIZE),
          getRandomCompositionsBefore(Date.now(), RANDOM_LIMIT),
        ]);
        const wallMemories = photosOnly(past);
        const randomPhotos = photosOnly(random);

        // First pass: record every photo the three surfaces ask for as the
        // builders run, copy them once, then build again with real URIs.
        const needed = new Set<string>();
        const record = (media: MediaElement): string => {
          needed.add(media.uri);
          // The source URI, so the slides built in this pass can be resolved
          // against the copied map in the second one.
          return media.uri;
        };

        const slides: MemorySlide[] = [];
        randomPhotos.forEach((memory) => {
          const picture = pictureOf(memory);
          if (slides.length >= SLIDE_COUNT || !picture) return;
          slides.push({ id: memory.id, uri: record(picture), caption: captionFor(memory) });
        });
        buildWallTiles(wallMemories, WALL_COLUMN_WIDTH, 2, WALL_TILE_COUNT, record);
        buildRingTiles(randomPhotos, RING_TILE_COUNT, record);

        const copied = new Map<string, string>();
        for (const source of needed) {
          const uri = await ensureWidgetCopy(source, widgetsDirectory);
          if (uri) copied.set(source, uri);
        }

        const resolve = (media: MediaElement): string => copied.get(media.uri) ?? '';
        const finalSlides = slides
          .map((slide) => ({ ...slide, uri: copied.get(slide.uri) ?? '' }))
          .filter((slide) => slide.uri !== '');
        const wallTiles = buildWallTiles(wallMemories, WALL_COLUMN_WIDTH, 2, WALL_TILE_COUNT, resolve);
        const ringTiles = buildRingTiles(randomPhotos, RING_TILE_COUNT, resolve).filter(
          (tile) => tile.uri !== '',
        );

        const now = new Date();
        if (Platform.OS === 'ios') {
          // Timelines do the moving: the show steps through its photos, the
          // ring turns one slot at a time, and WidgetKit cross-fades every
          // change. An empty journal leaves one quiet waiting entry.
          slideshowWidget.updateTimeline(
            finalSlides.length > 0
              ? buildSlideshowTimeline(finalSlides, now)
              : [{ date: now, props: EMPTY_SLIDE }],
          );
          ringWidget.updateTimeline(
            ringTiles.length > 0
              ? buildRingTimeline(ringTiles, now)
              : [{ date: now, props: { tiles: [], angle: 0 } }],
          );
        } else {
          // Android has no timelines: one snapshot per sync, and the show's
          // photo advances one step every time the app runs.
          androidSlide.current = finalSlides.length > 0
            ? (androidSlide.current + 1) % finalSlides.length
            : 0;
          const slide = finalSlides[androidSlide.current];
          lastSlide.current = slide ?? null;
          slideshowWidget.updateSnapshot(
            slide
              ? {
                  empty: false,
                  id: slide.id,
                  uri: slide.uri,
                  caption: slide.caption,
                  index: androidSlide.current + 1,
                  total: finalSlides.length,
                }
              : EMPTY_SLIDE,
          );
          ringWidget.updateSnapshot({ tiles: ringTiles, angle: 0 });
        }
        wallWidget.updateSnapshot({ tiles: wallTiles });

        lastSlides.current = finalSlides;
        lastWall.current = wallTiles;
        lastRing.current = ringTiles;

        await sweepOrphans(widgetsDirectory, new Set(copied.values()));
      } catch (error) {
        trackError(error, 'memory_widget_sync');
      } finally {
        inFlight = false;
        if (queued) {
          queued = false;
          void sync();
        }
      }
    };

    void sync();

    // The journal store refreshes after every add, edit and delete; its
    // notification is the widget's "something changed" signal.
    const unsubscribeJournal = useJournalStore.subscribe(() => {
      void sync();
    });
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') void sync();
    };
    const appState = AppState.addEventListener('change', onAppState);

    // On Android a tap is a broadcast the app answers while it lives: the
    // runtime assigns each button a target in tree order, so the index
    // names the tile the props hold, and the URL opens it.
    let interaction: EventSubscription | undefined;
    if (Platform.OS === 'android') {
      const open = (url: string) => {
        Linking.openURL(url).catch((error) => trackError(error, 'widget_deep_link'));
      };
      interaction = addUserInteractionListener((event) => {
        const match = /^__expo_widgets_target_(\d+)/.exec(event.target);
        const index = match ? Number(match[1]) : -1;
        if (event.source === 'MemoriesSlideshow') {
          if (index === 1) {
            open('fold://compose');
            return;
          }
          const slide = lastSlide.current;
          open(slide ? `fold://memory/${slide.id}` : 'fold://');
          return;
        }
        if (event.source === 'MemoryWall') {
          const tile = lastWall.current[index];
          open(tile ? `fold://memory/${tile.id}` : 'fold://');
          return;
        }
        if (event.source === 'MemoryRing') {
          const tile = lastRing.current[index];
          open(tile ? `fold://memory/${tile.id}` : 'fold://');
        }
      });
    }

    return () => {
      unsubscribeJournal();
      appState.remove();
      interaction?.remove();
    };
  }, []);

  return null;
}
