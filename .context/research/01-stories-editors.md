# Research: how story editors work (Instagram Stories, WhatsApp Status, Snapchat)

Goal: Fold's new composer should feel like something people already know.
Most of our users make an Instagram story or a WhatsApp status every day; if
our composer behaves the same way, onboarding mostly disappears.

Sources are third-party how-to guides and app reviews (Instagram publishes
almost no official UX docs). Treat exact pixel numbers as working rules and
verify on device.

---

## 1. The canvas

- **Fixed 9:16, edge to edge.** A story is 1080×1920. Media fills the whole
  screen; there is no "card with a background around the photo".
- **Safe zones.** Common working rule: keep important content ~250px clear at
  the top (progress bars, profile row) and ~250–340px at the bottom (reply
  bar). Meta's ad guidance in percentages: ~14% top, ~35% bottom, ~6% sides.
  For Fold there is no reply bar, but our own overlays (date, chips, buttons)
  occupy the same bands, so the same rule applies.
- **One composition = one canvas.** You design it once, post it, and it's
  fixed. Nobody drags things around after posting; to change it you edit.
  → Fold: remove in-timeline dragging; Edit opens the composer.

## 2. The editor's anatomy (Instagram)

- **Top bar:** close (left), then tools on the right: text (Aa), stickers,
  music, effects, draw, more (…).
- **Media fills the screen behind the tools.** Single photo = background,
  pinch/pan to reposition and zoom it.
- **Bottom:** share targets ("Your story", "Close friends") / Next.
- **Swipe left/right on the canvas** cycles colour filters (IG); not needed
  for Fold v1.

## 3. Text tool (the most used tool)

- Tap **Aa** (or tap the canvas) → full-screen text entry over a dimmed
  canvas, keyboard up, cursor centred.
- **Font row** above the keyboard: a horizontal strip of preset styles, each
  previewed in its own font. Each font has its own personality; options are
  basically size, colour, alignment, highlight.
- **Highlight / background**: a button toggles a block colour behind the
  text that trims to the text length (rounded rectangles per line). Some
  fonts style it differently (e.g. a typewriter style gets a highlight
  marker look).
- **Alignment** button cycles left / centre / right.
- **Colour**: a row of swatches; long-press/scroll for a full picker.
- **Size**: vertical slider on the left edge while typing; after placing,
  **pinch to resize, two-finger rotate, drag to move**.
- **Snapping**: guide lines appear when the text crosses the vertical or
  horizontal centre; the item gently snaps.
- **Tap a placed text** to edit it again.

## 4. Deleting items

- **Drag to trash**: while dragging any text/sticker, a trash target appears
  at the bottom centre; dropping it there deletes. Snapchat does the same
  (hold a sticker → trash icon appears at the bottom). This is the universal
  pattern; Fold's current small "x" buttons on previews should go.

## 5. Multiple photos — "Layout" (collage)

Instagram Stories has a **Layout** mode (grid icon in the camera's left
toolbar):

- Default 2×2 grid; switchable to 2, 3, 4 or 6 cells (most sources say max 6
  in Stories; the old standalone "Layout from Instagram" app did up to 9).
- Fill cells by shooting or picking from the gallery, one cell at a time.
- Inside a cell: **pinch to zoom / pan to crop**.
- **Hold and drag to swap** two photos between cells.
- **Mirror / flip / replace** a single cell's photo.
- Drag grid lines to resize cells (standalone Layout app).
- Optional **borders** (gaps) between cells; the original had none for a
  seamless look, borders were added later.

The alternative people use for free-form collages: add each photo as a
**photo sticker** and arrange by hand (more freedom, more fiddly). → This is
Fold's current canvas; it survives as the "Stickers" template.

## 6. Text-only stories

- Instagram **Create mode** ("Aa" in the camera): text on a full-screen
  gradient; a colour circle cycles through gradient presets with each tap.
- **WhatsApp text status**: type on a solid colour; one button cycles the
  font, another the background colour.
- → Fold's current compose (big type, fonts, ink palette) maps to this
  directly: it becomes the **Text** template, with a background colour or
  gradient added.

## 7. WhatsApp Status editor (photo/video)

- Crop & rotate, draw (colour + line size), emoji/stickers, text, music,
  blur/pixelate (iOS). Simple, few tools, everything over the full-bleed
  media.

## 8. Patterns worth stealing (and ones to skip)

| Pattern | Use in Fold? |
|---|---|
| Full-bleed 9:16 canvas | **Yes**: the core of the change |
| Text tool: font strip, highlight, align, colour, pinch/rotate | **Yes**: same gestures, our fonts |
| Drag-to-trash | **Yes**: replaces the small x buttons |
| Centre snap guides | **Yes** |
| Layout grids, cell crop, drag-to-swap, borders | **Yes**: Grid templates |
| Photo stickers, free placement | **Yes**: Stickers template (today's canvas) |
| Create mode (text on colour) | **Yes**: Text template |
| Music sticker | **Yes**: we already pick music |
| Location / time stickers | **Yes**: journaling-specific, we already have both |
| Filters, AR effects, boomerang | No (scope) |
| Draw tool | Later (nice for journaling, not v1) |
| Audience targets ("Close friends") | No: everything is private |

## Sources

- Collage/Layout in Stories: [socialbu](https://socialbu.com/blog/collage-on-instagram-story), [creator-hero](https://creator-hero.com/blog/how-to-make-collage-instagram-story), [skedsocial](https://skedsocial.com/blog/instagram-collage.md), [adweek: Layout mode](https://adweek.com/digital/instagram-heres-how-to-use-layout-mode-in-stories/), [outfy](https://www.outfy.com/blog/how-to-put-multiple-pictures-on-instagram-story/), [thepreviewapp](https://thepreviewapp.com/instagram-story-collage)
- Layout from Instagram app: [TechCrunch](https://techcrunch.com/2015/03/23/instagram-layout/amp/), [Engadget](https://www.engadget.com/2015-03-23-instagram-layout.html), [TIME](https://time.com/3754187/instagram-layout-app/), [App Store](https://apps.apple.com/au/app/id967351793?l=en-au), [APKMirror 1.2.5 notes](https://www.apkmirror.com/?p=68669), [iDropNews review](https://www.idropnews.com/apps/app-review-layout-instagram/2382/)
- Safe zones: [socialsizes.io](https://socialsizes.io/instagram-stories-size/), [inro.social](https://www.inro.social/blog/instagram-story-size), [firstpier](https://www.firstpier.com/resources/instagram-ad-safe-zones), [adkit](https://adkit.so/tools/safe-zones/instagram), [postfa.st](https://postfa.st/blog/instagram-story-size)
- Text tool: [guidingtech text tips](https://www.guidingtech.com/instagram-story-text-tips-tricks/), [guidingtech guide](https://www.guidingtech.com/instagram-stories-guide)
- Create mode / backgrounds: [maketecheasier](https://maketecheasier.com/change-background-instagram-story), [skedsocial](https://skedsocial.com/blog/instagram-story-background.md), [minter.io gradients](https://minter.io/blog/how-to-use-colour-gradients-for-instagram-stories/)
- WhatsApp Status: [WhatsApp FAQ](https://whatsapp.com/faq/en/android/26000031), [VentureBeat](https://venturebeat.com/ai/whatsapp-adds-colorful-text-status-updates-just-like-facebook), [guidingtech](https://www.guidingtech.com/whatsapp-status-tips-tricks)
- Drag-to-trash / snapping: [itgeared: Snapchat stickers](https://www.itgeared.com/how-to-delete-stickers-on-snapchat), [Easel snap alignment](https://easel.com/features/snap-alignment), [alignment-guide patent](https://patents.google.com/patent/US8347238)
- Gestures in RN: [Gesture Handler: composition](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/gesture-composition), [Reanimated: handling gestures](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/handling-gestures)
