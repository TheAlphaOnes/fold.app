/**
 * Widget surfaces: the registry of home and lock screen widgets the app
 * keeps fed. Empty for now; `WidgetSync` does nothing until a widget is
 * registered here.
 *
 * Adding a widget:
 *   1. Write the component in `src/widgets/<name>.tsx` (and `<name>.android.tsx`)
 *      with `createWidget<Props>('<Name>', …)`. It runs in an isolated
 *      runtime: no hooks, no imports beyond Expo UI, nothing at module scope.
 *   2. Declare it in app.json, under the `expo-widgets` plugin's `widgets`,
 *      with its families (iOS) and cell size (Android).
 *   3. Register it below with `defineSurface`: how to load it, how to build
 *      its timeline from the journal, and where an Android tap lands.
 *   4. Rebuild natively (`npx expo prebuild`, then a native build); widget
 *      declarations only reach the system through the native project.
 *
 * Keep the deciding logic (which memory, when it changes) in pure builders
 * next to `model.ts`, with tests; the surface only wires them up.
 */

import type { Widget } from 'expo-widgets';

import type { CopyPhoto } from '@/widgets/photos';

/** What a surface gets to build its timeline with. */
export interface SyncContext {
  now: Date;
  /** Copies a journal photo for widgets and returns its URI. */
  copy: CopyPhoto;
}

/** One timeline entry: the props a widget shows from `date` on. */
export interface TimelineEntry<P extends object> {
  date: Date;
  props: P;
}

/** A registered widget, as `WidgetSync` drives it. */
export interface WidgetSurface {
  /** The widget's name, exactly as in app.json and `createWidget`. */
  name: string;
  /** Builds the timeline and pushes it: the full timeline on iOS, its first entry on Android. */
  sync: (context: SyncContext, platform: 'ios' | 'android') => Promise<void>;
  /** Android only: the deep link for a tap on the widget's `index`th button (tree order). */
  tapUrl: (index: number) => string;
}

/** How to define a surface for a widget with props `P`. */
export interface SurfaceDefinition<P extends object> {
  name: string;
  /** Loads the widget module. Only called when the native widgets module exists. */
  load: () => Widget<P>;
  /** The timeline from now on; at least one entry, the first one current. */
  build: (context: SyncContext) => Promise<TimelineEntry<P>[]>;
  /** Android tap target, given the props on show. Defaults to opening the app. */
  tapUrl?: (props: P, index: number) => string;
}

/** Wraps a widget definition into a surface, remembering what it last showed for Android taps. */
export function defineSurface<P extends object>(definition: SurfaceDefinition<P>): WidgetSurface {
  let widget: Widget<P> | null = null;
  let shown: P | null = null;
  return {
    name: definition.name,
    sync: async (context, platform) => {
      const timeline = await definition.build(context);
      if (timeline.length === 0) return;
      widget ??= definition.load();
      if (platform === 'ios') widget.updateTimeline(timeline);
      else widget.updateSnapshot(timeline[0].props);
      shown = timeline[0].props;
    },
    tapUrl: (index) => (shown && definition.tapUrl ? definition.tapUrl(shown, index) : 'fold://'),
  };
}

/** Every widget the app keeps fed. None yet. */
export const WIDGET_SURFACES: readonly WidgetSurface[] = [];
