# Research: the codebase as it is today (Nov 2026)

What the template / story-composer change touches, and what it can reuse.

---

## 1. Data model

`src/types/journal.ts`, table `compositions` (`src/db/schema.ts`).

```ts
interface Composition {
  id; textContent; createdAt;
  mediaElements: MediaElement[];      // JSON column media_elements
  fontFamily; fontSize; textColor?;   // one text block per memory
  location?; storyIds; deletedAt?;
}
interface MediaElement {
  id; uri; type: 'image' | 'video' | 'audio';
  x_pos; y_pos;                        // PIXELS, relative to the card on the device that made it
  width?; height?; scale?; zIndex?;
  isGif?; metadata?: { title; artist; artwork };   // music
}
```

Findings:
- **Positions are device pixels**, not normalised. A memory made on one
  phone size lands in a different place on another. A template system must
  use normalised (0–1) coordinates.
- **One text block** per memory, positioned by the card's layout (not by the
  user). No text layers.
- No notion of layout/template in code. (A stray `template` column exists in
  some old simulator DBs but no code reads or writes it; migration must
  tolerate it.)
- Columns are added with `ALTER TABLE … ADD COLUMN` in try/catch, the
  existing migration style.
- `app_cache` table exists for derived snapshots (profile, progression,
  thumbnails).

## 2. How a memory is drawn: `MemoryCard` (693 lines)

`src/components/memory-card.tsx`, used by the home feed (`CarouselItem`),
the Field Guide (sample canvas, receipts), the share-as-card export, the
hold menu's offscreen capture, and onboarding.

Three layouts, decided by content, not by the user:
1. **Text only**: big text over animated diagonal stripes.
2. **Single media**: hero image/video thumbnail *inset* in the card (with
   padding around it) + text below; audio → a spinning vinyl
   (`SingleAudioCard` with autoplay rules).
3. **Multi media**: text in the background + every media as a
   `DraggableSticker` (660 lines): drag, pinch, bring-to-front, saved back
   to the DB from the timeline (`onUpdatePositions`).

Card size on home: `height = min(width × 1.618, height × 0.78)`, width =
screen − 42 (21 gutter each side). Rounded corners, border, stripes
background. → This is the "not edge to edge" the owner wants gone.

## 3. Composing: `src/app/compose.tsx` (1334 lines)

One big screen:
- Toolbar: ink colour, size, font chooser, Save pill.
- Date/time/location readout, then a horizontal **attach row**: camera,
  gallery (multi-select), music, GIF, video, record audio, location.
- A large **TextInput** (the writing area).
- **Previews** of attached media with a small x to remove.
- Bottom: story chip (`ComposeBottomBar`), `MusicPicker`, `StoryPicker`,
  `GifPicker`, `RecordingOverlay` (now with pause/discard/save via
  `useVoiceTake`).
- Edit mode: `/compose?editId=…` reloads the memory.
- Entry points: home key tap, quick photo (`pending-camera-media` →
  compose), share extension (`expo-share-intent`), onboarding basics, Field
  Guide, hold menu → Edit, memory screen → Edit.
- `MAX_MEDIA_ELEMENTS = 12` (`src/constants/media.ts`).

What's worth keeping (owner: "the current composition screen is very good"):
the writing feel (fonts, ink palette, size), the attach flows (camera,
gallery, music search with artwork download, GIF, video, voice, location),
the story chip, edit mode, the save path (`addComposition` /
`updateComposition`, the sparkle moment).

## 4. Viewing a memory: `src/app/memory/[id].tsx` (739 lines)

A horizontal pager of **slides**: one text slide + one slide per media.
Top bar: close, edit, story, share, save-to-photos, delete. Bottom: story /
location badges, slide beads. Share tray: "Canvas" (captured card) or
"Original". With a canvas model this becomes a full-screen story viewer
(the canvas itself, edge to edge), with media playback.

## 5. Other consumers of `mediaElements`

These read the flat media list and need to keep working (the list stays the
source of truth for "what media a memory has"):
- Story wheel and story viewer (`src/app/stories/[id].tsx`,
  `story-viewer.tsx`): items per media; songs on the wheel.
- Profile: story-board tiles (`utils/story-tiles.ts`), from-your-past wall,
  calendar covers (`getDayCoversForMonth` parses `media_elements` in SQL
  results), activity counts.
- Home backdrop (`AmbientBackdrop`), time machine, trash, hold menu (save
  first photo/video), share-as-card capture.
- Analytics `memoryShape()` (counts of media types, text length).
- Field Guide: `canvas-stage.tsx` teaches **drag and pinch on the timeline
  card** (chapter CANVAS: missions drag, pinch); `trigger-stage`,
  `memory-stage` (double-tap open, hold menu).
- Onboarding basics: tap key → compose.
- FAQ (`src/app/faq.tsx`) explains drag/pinch on the canvas.

## 6. Reusable building blocks already in the app

- Gestures: `react-native-gesture-handler` + Reanimated 4 (+ worklets).
  `DraggableSticker` already does pan + pinch + bring-to-front.
- `react-native-view-shot` for exporting a view as PNG (share as card).
- `expo-image` (memory-disk cache, downscaling), `expo-video`,
  `expo-video-thumbnails` (with the new persistent thumbnail index),
  `expo-audio` (`useVoiceTake`), `expo-image-picker` (multi-select),
  `react-native-svg`.
- Bottom sheets in one style: `ShareTray`, `MemoryActionsTray`,
  `StoryPicker`, `CreateStoryTray` (floating card, 34pt corners, spring in).
- Moments (`useMoments`: sparkle on new memory, streak ticks), share bird.
- Design system: JetBrains Mono / Bitcount, ink palette, grain, stripes,
  `RoundButton`, motion helpers (`riseIn`, `fadeIn`, `EASE_OUT`).
- No Skia installed. Not needed: View-based rendering + view-shot covers
  export.

## 7. Risks found

- `DraggableSticker` and `MemoryCard` are large and tangled with playback
  and autoplay rules; the new renderer should be built fresh and small,
  reusing pieces (audio card, video thumb) rather than growing these files.
- Pixel positions in existing memories: legacy memories must keep rendering
  as they do today (Stickers template, converted to normalised coordinates
  at migration time using the card size they were made against).
- Many entry points into compose: every one needs to land in the new
  composer correctly (share intent with N photos → a sensible template).
- Field Guide's CANVAS chapter teaches gestures that will no longer exist
  in the feed.
