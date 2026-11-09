# Plan: Fold becomes media-first, story-style, with templates

Status: **approved with owner answers (2026-11-09)**, branch `dev`.
Research behind it: `research/01-stories-editors.md` (how Instagram / WhatsApp
editors work) and `research/02-codebase.md` (what we have).

---

## 0. The change in one paragraph

A memory stops being "a card with text and draggable stickers on the
timeline" and becomes **a finished 9:16 canvas, edge to edge**, designed
once in the composer, like an Instagram story or WhatsApp status. How it
looks is decided by a **template**: **Story** (default: full-bleed media +
text on top), **Grid** collages (2, 3, 4, 6 photos in creative layouts),
**Stickers** (today's free-form canvas, now with sticker shapes) and
**Text** (today's writing screen, on a colour). The timeline only *shows*
memories; to change one you **Edit**, which reopens the same composer. One
composer for everything.

## 1. Principles (the owner's rules for this work)

1. **Build on habits people already have.** If Instagram Stories or WhatsApp
   Status does it a certain way, we do it that way unless there's a strong
   reason. The test: a new user can make a memory without the Field Guide.
2. **Media first, text second.** Text is a layer on top of media (or the
   Text template), never the main event of the screen.
3. **Edge to edge.** No stripes or padding around media; the memory *is*
   the canvas.
4. **One composer.** A single, high-quality screen for every template,
   including editing. No second compose screen.
5. **Nothing old breaks.** Every existing memory keeps looking the way it
   did (as a Stickers or Text template) and becomes editable in the new
   composer.
6. Fold's own look stays: mono type, ink palette, grain, quiet motion,
   staggered entrances.

## 2. Decisions (with my recommendation; ✅ = proceed unless you object)

| # | Decision | Recommendation |
|---|---|---|
| D1 | Canvas shape | ✅ **Fixed 9:16** for every template (export = 1080×1920, shares straight to IG/WhatsApp stories). |
| D2 | Home feed | ⏳ Owner unsure. Each card *is* the canvas (no padding around media), rounded corners kept, snap-scroll stays. **Shape decided by eye in P1**: the renderer is size-independent, so P1 shows the same memories as today's card shape (≈1:1.62, canvas fitted) and as 9:16, side by side. |
| D3 | Memory screen | ✅ **Full-screen canvas**, story-viewer style: video plays, audio plays, top bar as today (close, edit, story, share, save, delete). The slide pager goes away. |
| D4 | Dragging in the timeline | ✅ **Removed.** Everything moves in the composer only. |
| D5 | Default template | ✅ Chosen from what you add: 1 photo/video → **Story**; 2–6 photos → the matching **Grid**; nothing → **Text**. Switchable at any time in the composer. |
| D6 | Composer entry | ✅ Owner: **no separate pick step**. Tap the key → one creative composer that opens ready to go: the stripes canvas with a blinking cursor (write right away), a recent-photos strip to add media in one tap, the template switcher and tools, all blended into one calm screen. Hold (voice) and swipe-up (camera) stay as shortcuts. |
| D7 | Existing memories | ✅ Migrate in place: text-only → **Text**, 1 media + text → **Story**, multi-media → **Stickers** (positions converted to normalised coordinates). |
| D8 | Draw tool | ⏳ Later (not v1). |
| D11 | Diagonal stripes | ✅ Owner: **keep, they're iconic**. Default background of Text and Stickers templates and of the empty composer canvas; available as a background option everywhere. |
| D9 | Video in grids | ✅ Allowed (muted, loops in its cell; first video's audio plays in the viewer). |
| D10 | Max media | ✅ Keep 12 overall; grids cap at their cell count. |

## 3. Concepts

- **Canvas**: a 9:16 coordinate space. All positions/sizes are **normalised
  (0–1)** of canvas width/height, so a memory looks identical on every
  phone and at any render size (feed card, full screen, 1080×1920 export).
- **Template**: decides the canvas's *base* (background media, grid cells,
  colour) and which tools make sense. Has an id and a version.
- **Layers**: what sits on top of the base: **text layers**, **stickers**
  (photo stickers, GIFs, music, location, date/time). Every template can
  have layers; position, scale, rotation and stacking order are stored per
  layer.
- **Media list**: `mediaElements` stays the flat list of every file a
  memory owns (for the story wheel, profile, calendar, sharing originals,
  trash cleanup). The layout refers to media by id.

## 4. Data model v2

### 4.1 Schema (additive, existing migration style)

```sql
ALTER TABLE compositions ADD COLUMN template TEXT;        -- 'story' | 'text' | 'stickers' | 'grid:<layout>'
ALTER TABLE compositions ADD COLUMN layout TEXT;          -- JSON CanvasDoc
ALTER TABLE compositions ADD COLUMN layout_version INTEGER;
```
(Some old dev DBs already have a `template` column; the migration treats
"duplicate column" as fine, like the others.)

### 4.2 Types (`src/types/canvas.ts`)

```ts
type TemplateId = 'story' | 'text' | 'stickers' | `grid:${GridLayoutId}`;

interface CanvasDoc {
  version: 1;
  background: Background;          // colour / gradient / media fill
  cells?: CellFill[];              // grid templates only
  layers: Layer[];                 // painted in array order
}

type Background =
  | { kind: 'color'; color: string }
  | { kind: 'gradient'; stops: string[]; angle: number }
  | { kind: 'media'; mediaId: string; crop: Crop };   // story base

interface Crop { x: number; y: number; scale: number }  // pan/zoom inside a frame, normalised

interface CellFill { cellId: string; mediaId?: string; crop: Crop; mirrored?: boolean }

type Layer = TextLayer | MediaSticker | MusicSticker | LocationSticker | DateSticker;

interface LayerBase { id: string; x: number; y: number; scale: number; rotation: number }  // centre point, normalised

interface TextLayer extends LayerBase {
  kind: 'text'; text: string;
  font: string; color: string;
  align: 'left' | 'center' | 'right';
  style: 'plain' | 'highlight' | 'outline';   // IG-style background block
  highlightColor?: string;
  size: number;                                // base size in canvas units
}

interface MediaSticker extends LayerBase { kind: 'media'; mediaId: string; shape: StickerShape }
type StickerShape = 'rounded' | 'square' | 'circle' | 'polaroid' | 'stamp' | 'tape';
interface MusicSticker extends LayerBase { kind: 'music'; mediaId: string; style: 'disc' | 'card' }
interface LocationSticker extends LayerBase { kind: 'location' }
interface DateSticker extends LayerBase { kind: 'date'; style: 'stamp' | 'mono' | 'handwritten' }
```

`textContent` is kept and filled from the text layers (joined) so search,
analytics, notifications previews and the story viewer keep working.

### 4.3 Migration of existing memories (one-off, at startup, idempotent)

| Old memory | New template | How |
|---|---|---|
| Text only | `text` | background = theme colour; one centred text layer with the old font/size/ink |
| 1 image/video (± text) | `story` | background = media (cover); text → one text layer near the bottom safe zone |
| 1 audio (voice/music) | `story` | background = colour; music/voice → disc sticker centred |
| 2+ media | `stickers` | each media → `MediaSticker` (shape `rounded`), pixel x/y converted to normalised using the card size of the device that made it (`width − 42` × card height); text → a text layer |

Runs in batches in the background, written per row; new code reads
`layout` and falls back to a computed doc if it's still null. Never
destructive: old columns stay.

## 5. Templates

All 9:16. Diagrams are rough; cells are rectangles in normalised units.

### 5.1 Story (default)
```
┌─────────┐   one photo/video fills the canvas (pinch/pan to frame it)
│         │   text layers + stickers on top
│  PHOTO  │   safe zones: top 12%, bottom 16% kept clear by default
│  "text" │
└─────────┘
```

### 5.2 Text (today's compose, kept)
Owner: **looks like today's text memory card**: the animated diagonal
stripes background, our fonts, size and ink palette, the writing feel of the
current compose screen. No gradients.

### 5.3 Stickers (today's canvas)
Background: the **diagonal stripes** (default) or a colour. Photos as
stickers placed freely, with **shapes**: rounded, square, circle, polaroid
(white frame, caption space), **stamp** (perforated postage-stamp edge,
owner confirmed), tape (washi-tape corners).

### 5.4 Grids (collages)
Shared behaviours (from Instagram Layout): tap an empty cell to fill it;
pinch/pan inside a cell to crop; **hold and drag to swap** cells; mirror;
replace; **gap** setting (none · thin · thick) and gap colour; text layers
and stickers on top.

| id | name | cells | sketch |
|---|---|---|---|
| `grid:duo-stack` | Halves | 2 | top / bottom |
| `grid:duo-side` | Split | 2 | left / right |
| `grid:trio-strips` | Strips | 3 | three horizontal bands (owner's example) |
| `grid:trio-columns` | Columns | 3 | three vertical bands |
| `grid:hero` | Hero | 3 | one big (top ⅔) + two small below |
| `grid:quad` | Quad | 4 | 2×2 |
| `grid:film` | Film | 4 | four frames down a black film strip with sprocket holes and a date stamp |
| `grid:six` | Six | 6 | 2×3 |
| `grid:diary` | Diary | 1–2 + text | photo(s) top ~60%, a ruled "page" below for text in our fonts |
| `grid:polaroid` | Polaroid | 1 | tilted polaroid on a colour, handwritten caption under the photo |

Each layout is data (`src/templates/grids.ts`): an array of cells
`{ id, x, y, w, h }` plus optional decor (film holes, ruled lines). Adding a
layout = adding an entry.

## 6. The composer (one screen, `src/app/compose.tsx` rebuilt)

### 6.1 Flow (one screen, no steps)
Owner: a single creative composition screen where everything blends in and
nothing feels like a mode change.
- **Opens ready**: the stripes canvas with a blinking cursor (Text template),
  so typing starts immediately, exactly like today's compose.
- **Recent photos strip** along the bottom (plus camera and full-gallery
  buttons at its start): tap a photo and the canvas becomes a Story with it;
  tap more and it moves to the matching Grid (D5). Everything animates in
  place; the screen never changes.
- **Template switcher** sits above the strip; tools (Aa, stickers, music,
  location, more) sit top right.
- **Done**: story chip · Save, bottom right.
- Shortcuts still skip ahead: swipe-up opens the camera and lands here with
  the photo; the share sheet lands here with its photos; hold records voice.

### 6.2 Layout of the design state (IG-style)
```
┌──────────────────────────────┐
│ ✕                 Aa ☺ ♪ ⌖ ⋯ │  ← close · text · stickers · music · location · more
│                              │
│        9:16 CANVAS           │  ← media/grid/colour + layers; pinch, drag, rotate
│                              │
│ [Story][Grid▾][Stickers][Text]│  ← template switcher (grids open a layout strip)
│ ⊕ story chip          [Save] │
└──────────────────────────────┘
```
- **Aa (text)**: tap → full-screen text entry over a dimmed canvas; font
  strip above the keyboard (our fonts), colour row (ink palette),
  highlight toggle, alignment toggle, size slider on the left edge. Done →
  layer placed; pinch/rotate/drag; tap to edit again.
- **☺ stickers**: one sheet with tabs: Photos (adds a photo sticker), GIF,
  Date, Location, Music (existing pickers move in here).
- **Drag to trash**: while dragging any layer, a trash target rises at the
  bottom centre; drop to delete (replaces the small x buttons).
- **Snap guides**: centre lines appear and the layer snaps when crossing the
  vertical/horizontal centre or a safe-zone edge.
- **Background media**: pinch/pan to frame (Story); per-cell crop (Grid).
- **Voice**: mic in "more" → `RecordingOverlay` (pause/discard/save) → a
  voice disc sticker.
- **Undo** for the last change (shake-free, a small ↶ appears after edits).

### 6.3 Editing
`/compose?editId=…` loads the memory's `CanvasDoc` and opens straight in
Design. Hold menu → Edit and memory screen → Edit both land here.

### 6.4 Architecture (keep files small)
```
src/canvas/
  types.ts                 CanvasDoc, layers (4.2)
  geometry.ts              normalise/denormalise, safe zones, snapping
  render/CanvasView.tsx    read-only renderer (any template, any size)
  render/layers/*.tsx      TextLayerView, MediaStickerView, MusicStickerView…
  render/backgrounds.tsx   colour / gradient / media fill
  edit/CanvasEditor.tsx    interactive version (gestures, selection, trash)
  edit/useLayerGestures.ts pan + pinch + rotate (Gesture.Simultaneous) with saved base values
  edit/useCanvasDoc.ts     editor state + undo (zustand slice)
src/templates/
  registry.ts              template ids → base renderer + defaults + tools
  grids.ts                 grid layout data
  migrate.ts               old Composition → CanvasDoc (4.3)
src/app/compose.tsx        orchestration only: pick → design → save
src/components/compose/*   toolbar, template switcher, text editor sheet, sticker sheet
```
`MemoryCard` and `DraggableSticker` are retired once nothing uses them.

## 7. Showing memories

- **Home feed** (D2): `CarouselItem` renders `CanvasView` at card size.
  Double tap opens, hold opens the hold menu (unchanged). No dragging.
  Audio autoplay rules move over unchanged (only the focused card plays).
- **Memory screen** (D3): full-screen `CanvasView`; video plays with sound,
  music/voice stickers play; top bar unchanged; share tray "Canvas" exports
  1080×1920 via view-shot of an offscreen `CanvasView`.
- **Everything else** reads `mediaElements` as today (story wheel, profile,
  calendar, backdrop) → no change needed, except the **cover** of a memory
  = its background media / first cell (helper `coverOf(memory)`).

## 8. Everything else that must change

- **Field Guide**: CANVAS chapter (drag/pinch on the timeline) is replaced
  by a COMPOSER chapter: add text (Aa), move/resize a layer, switch to a
  grid. Missions and progress counts updated; existing progress migrated.
- **Onboarding basics**: tap → the composer (opens ready to write); copy unchanged.
- **FAQ**: rewrite the canvas section.
- **Share extension**: N shared photos → composer with D5's template.
- **Analytics**: `memory_created` gets `template`; new events for template
  switch, text layer added, sticker added.
- **Website**: new screenshots/visuals of the composer and templates.
- **Profile snapshot / caches**: unaffected (they read media lists).

## 9. Phases (each = PRs on `dev` → reviewed → merged to `master`)

| Phase | Ships | Done when |
|---|---|---|
| **P0 Foundations** | `src/canvas` types, geometry, read-only `CanvasView` for all templates, template registry + grid data, migration (dry-run mode), unit tests for geometry and migration | Every existing memory converts to a `CanvasDoc` that renders the same as today in a dev screen |
| **P1 Display** | Feed, memory screen, export use `CanvasView`; dragging removed; migration runs for real | All screens show canvases edge to edge; no visual regressions on the test journal; share exports 1080×1920 |
| **P2 Composer shell + Story + Text** | Pick state, design state, template switcher, Story background framing, Text template (ported compose), save/edit | Make and edit Story and Text memories end to end, from every entry point |
| **P3 Text tool** | IG-parity text: font strip, colour, highlight, align, size, pinch/rotate, snap, trash | Text layers feel like Instagram's |
| **P4 Grids** | 10 layouts, cell fill/crop/swap/mirror/replace, gaps | Owner signs off on the layouts |
| **P5 Stickers** | Stickers template + shapes; sticker sheet (photo, GIF, music, location, date) on every template | Today's canvas memories are fully editable |
| **P6 Teach & polish** | Field Guide chapter, onboarding, FAQ, analytics, website visuals, performance pass | New user makes a grid memory without the guide |

## 10. Testing

- Unit: geometry (normalise/denormalise, snapping), migration on fixtures
  of every old memory shape, grid layout data validity.
- Visual: a dev-only gallery screen rendering every template × light/dark ×
  3 sizes (feed card, full screen, export); screenshot-compared on the
  simulator each phase.
- Device: small Android (360dp), large iPhone, an Android tablet (now that
  it rotates).
- Performance: feed scroll with 50+ canvases (renderers memoised,
  `expo-image` downscaling, video only in the focused card).

## 11. Risks

| Risk | Mitigation |
|---|---|
| Migration misplaces old stickers | Dry-run in P0 with side-by-side renders; old columns kept; migration is idempotent and re-runnable |
| Gesture conflicts (layer vs background vs feed scroll) | Editor is its own screen; layers capture first, background only when no layer is hit; feed has no drag at all |
| Text editing on Android keyboard quirks | Text entry is a dedicated full-screen sheet, not inline on the canvas |
| Scope creep | Draw, filters, effects explicitly out of v1 |
| Big-bang release | Phases merge behind a feature flag (`settings.canvasV2`) until P2 is complete; P1+P2 ship together |

## 12. Owner answers (2026-11-09)

1. Feed card shape: unsure → decide by eye in P1 (D2).
2. Composer: one creative composition screen, everything blended, no
   separate pick step (D6, §6.1).
3. Text template: like today's text memory card (stripes, ink, fonts) (§5.2).
4. Grids: yes, as in §5.4 (incl. the 4-media grid).
5. Sticker shapes: the set in §5.3, stamp included.
6. Stripes: keep, they're iconic (D11).
