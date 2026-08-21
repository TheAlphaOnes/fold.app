# Fold — Engagement & Retention Plan (Research-Backed)

## Summary

Three mechanisms drive Fold's long-term retention, each grounded in behavioral research rather than generic journaling-app patterns:

1. **Craft Investment** (IKEA effect, endowment effect) — The act of composing a memory builds psychological ownership through effort. The compose screen is where retention is won, not through meta-features but through deepening the craft experience. Stories (grouping memories) are a higher-order act of craft.

2. **Involuntary Rediscovery** (Proust effect, reminiscence bump) — Sensory cues trigger autobiographical memory retrieval. The home screen becomes a surface for serendipitous rediscovery, not a passive carousel. This is the primary daily return driver — the user opens Fold because they're curious what might surface today.

3. **Peripheral Connection** (calm technology) — A minimal relay server enables Fold-to-Fold story sharing. No feed, no notifications, no social graph — just the ability to send a story to someone who also has Fold. The server is a post office, not a database.

A cross-cutting principle — **The Tactile Instrument** — applies Teenage Engineering's design philosophy to every interaction: the app feels like hardware because every action has a physical response.

## Research Foundation

The prior plan proposed standard journaling-app features: Story Board, tactile rewards, daily return widget, offline social, habit formation. These are the patterns every journaling app uses. They don't account for Fold's specific constraints (no server, no accounts, no streaks, no notifications) or its specific assets (TE aesthetic, multimedia canvas, audio/music integration, on-device SQLite). The research below identifies the specific psychological mechanisms that drive engagement with a memory journal, and maps each to Fold's existing architecture.

### 1. The IKEA Effect — Effort Creates Attachment

Norton, Mochon & Ariely ("The IKEA Effect: When Labor Leads to Love," Journal of Consumer Psychology, 2012) demonstrated that people value things more when they put effort into creating them, even when the output is objectively mediocre. This extends to digital products: user contributions boost engagement through psychological ownership (Fritze et al., 2019; NN/G endowment effect research). Elsden et al. ("Understanding Smart Journaling Practices," CHI 2016) found that curation is central to smart journal value — people want to craft meaningful records, not just dump data.

**Implication**: The compose screen — where the user arranges media, chooses fonts, places stickers — is the primary engagement mechanism. The more the user invests in crafting a memory, the more they value it. The existing canvas/sticker system is the right foundation but is under-leveraged. The reward is the craft itself, not a celebration of it.

### 2. The Proust Effect — Sensory Cues Trigger Involuntary Memory

Chu & Downes (2002, "Proust nose best") showed that sensory cues — especially odors, music, and sounds — trigger involuntary autobiographical memory retrieval. Multimodal research (Frontiers in Psychology, 2015) demonstrates that visual, auditory, and olfactory cues contribute differently to recollection. Cued recall is more effective than free recall and improves psychological well-being (reminiscence therapy research, PMC). The reminiscence bump (systematic review, PMC 2018) shows that cues are critical in guiding recall, and memories from certain life periods (ages 15-30) are recalled more vividly.

**Implication**: The home screen should not be a passive carousel. It should be a surface for serendipitous rediscovery. Fold already attaches music, audio, photos, and location to memories — these are sensory cues. The "on this day" mechanic is the right instinct but is under-powered. It should use cue-based retrieval, not just date matching. No notifications — the daily return driver is the anticipation of rediscovery.

### 3. Calm Technology — Peripheral Presence

Amber Case's principles of calm technology (2015): technology should require the smallest possible amount of attention, communicate through the periphery, and default to a usable state. The tea kettle model: quiet until ready, then sings. Slow technology research (Redström) and the slow software movement reinforce this — 53% of American adults want to reduce screen time; the desire for "convenience of digital without annoyance of being always connected" is widespread (TechCrunch, 2026).

**Implication**: Fold should exist in the periphery. No notifications begging for attention. No streaks creating guilt. The app surfaces to center only when there's something meaningful — a memory worth rediscovering, a story someone sent you. This aligns with the user's directive: "real, safe, friendly."

### 4. The Tactile Instrument — TE Design Philosophy

Jesper Kouthoofd (SFMOMA, 2024): "A product can be entertaining and be a tool." The TP-7: "the way you can touch and physically interact with the audio really makes it stand out." TE products borrow from history, combining the best parts of decades of tools into new creative workflow systems. Haptic research confirms: touch has high resolution of human sensation; tactile feedback enhances presence, engagement, and perceived quality (ACM CHI; Frontiers in Neuroergonomics, 2023).

**Implication**: Every interaction should have a physical, mechanical response. But these are functional confirmations, not gamified celebrations. This is the "real, safe, friendly" directive applied to interaction design.

## User Decisions (answered)

1. **Social architecture → Minimal server.** A relay server that does one thing: delivers story bundles between Fold users. No feed, no profile, no friends list, no notifications. The sender creates a story, shares it to a Fold ID, and the recipient discovers it on their next open. The server stores bundles only until delivery — it is a post office, not a database.

2. **Engagement philosophy → Real, safe, friendly.** No streaks, no badges, no loss-aversion, no FOMO. The reward is the craft itself and the surprise of rediscovery. Haptics confirm actions, not celebrate them. This aligns with calm technology principles and the TE design philosophy.

3. **Daily return driver → Involuntary rediscovery (recommended, user deferred).** The user opens Fold because they're curious what might surface today. The home screen selects one memory using cue-based retrieval (sensory cues, temporal proximity, reminiscence bump weighting). No notification prompts the return — the anticipation of serendipity is the driver. This is the Proust effect applied to product design.

## Current state (verified)

- **Data model** (`src/db/schema.ts`): two SQLite tables — `compositions` (id, text_content, media_elements JSON, created_at, font_family, font_size, location) and `user_settings` (key-value). No stories, no tags, no social graph, no rewards.
- **Store** (`src/hooks/use-journal.ts`): Zustand store with CRUD + `getOnThisDayCompositions` (month/day match across years). This is the only existing daily-return mechanic — passive, surfaces only when the user opens the app.
- **Home** (`src/app/index.tsx`): inverted vertical carousel of memory cards, Fibonacci spacing, "on this day" query, floating add button, quick-record overlay, profile button (top-right).
- **Compose** (`src/app/compose.tsx`): full-page editor — text, photos, camera, audio, music, location, font picker. Single-memory scope; no grouping.
- **Memory detail** (`src/app/memory/[id].tsx`): paginated slideshow of text/media slides, share-as-image and share-raw-file via system share sheet (`expo-sharing`).
- **Profile** (`src/app/profile.tsx`): activity grid, volume chart, momentum chart, recent assets, TE calendar. Local-only reflection stats — a foundation for gentle engagement.
- **Settings** (`src/hooks/use-settings.tsx`): Zustand store, persisted to `user_settings` table via `settings-repository.ts`. Key-value pattern — easy to extend.
- **Sharing infra**: `expo-sharing`, `expo-share-intent`, `react-native-view-shot` all already installed. Share intent handler exists in `index.tsx`.
- **Haptics**: `expo-haptics` installed but not centrally managed — ad-hoc usage only.
- **No backend exists.** No server, no API, no auth. Only outbound calls: iTunes Search API (music) and PostHog (analytics, force-opted-in).
- **Widget support**: Expo SDK 57 supports iOS home-screen widgets via `expo-widgets` (iOS only, requires dev builds — the app already uses dev builds for share intents). Android has no widget support in SDK 57.

---

## Mechanism 1 — Craft Investment (IKEA Effect)

Stories are the higher-order act of craft. A single memory is a note; a story is a composition. The effort of selecting, ordering, and titling a group of memories deepens psychological ownership — the user values the story more because they built it. This is the IKEA effect applied to memory curation (Norton et al., 2012; Elsden et al., CHI 2016: "curation is central to smart journal value").

The data model, repository, and store below are unchanged from the prior plan — the implementation was sound. What changes is the framing: stories are not a "feature" bolted on; they are the craft investment loop made tangible.

### Data model

New tables in `src/db/schema.ts` (added via `CREATE TABLE IF NOT EXISTS` in the existing `initSchema` function — no migration needed for new tables):

```sql
CREATE TABLE IF NOT EXISTS stories (
  id              INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  title           TEXT NOT NULL,
  cover_media_uri TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS story_compositions (
  story_id        INTEGER NOT NULL,
  composition_id  INTEGER NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (story_id, composition_id),
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY (composition_id) REFERENCES compositions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_story_compositions_story_id
  ON story_compositions (story_id, sort_order);
```

The `compositions` table is untouched — existing memories are unaffected. A memory can belong to multiple stories (join table, not a column).

### Types — `src/types/story.ts`

```ts
export interface Story {
  id: number;
  title: string;
  coverMediaUri?: string;
  createdAt: number;
  updatedAt: number;
  memoryCount?: number;        // populated on read
  firstMemoryDate?: number;    // for sorting/display
  origin: 'created' | 'received';  // 'created' = user made it; 'received' = sent to them
  senderId?: string;               // for received stories: sender's Fold ID
  senderName?: string;             // for received stories: sender's display name
}

export interface StoryWithMemories extends Story {
  memories: Composition[];     // ordered by sort_order
}
```

### Repository — `src/db/story-repository.ts`

Follows the existing `journal-repository.ts` pattern (raw SQL via `getDatabase()`, `rowToStory` mapper). Functions:
- `getAllStories()` — returns stories with `memoryCount` and `firstMemoryDate`, ordered by `updated_at DESC`.
- `getStoryById(id)` — returns `StoryWithMemories` (joins `story_compositions` + `compositions`, orders by `sort_order`, reuses `rowToComposition` from journal-repository for memory mapping).
- `createStory(title, coverMediaUri?)` — inserts story, returns it.
- `updateStory(id, title, coverMediaUri?)` — updates title/cover, bumps `updated_at`.
- `addMemoryToStory(storyId, compositionId, sortOrder?)` — inserts join row, bumps story `updated_at`.
- `removeMemoryFromStory(storyId, compositionId)` — deletes join row.
- `reorderMemories(storyId, orderedCompositionIds[])` — updates `sort_order` for each.
- `deleteStory(id)` — deletes story (join rows cascade).

### Store — `src/hooks/use-stories.ts`

New Zustand store, mirrors `useJournalStore` shape:
- State: `stories: Story[]`, `loading`, `error`, `activeStoryId`.
- Actions: `refresh()`, `createStory()`, `addMemory()`, `removeMemory()`, `reorderMemories()`, `deleteStory()`, `setActiveStoryId()`.

### Screens

- **`src/app/stories.tsx`** — Stories gallery. Horizontal scroll or grid of `StoryCard` components (cover image, title, memory count, date range). Empty state: "No stories yet. Group your memories into a story — a trip, a night, a season." Create button.
- **`src/app/story/[id].tsx`** — Story detail. Reuses the existing slideshow pattern from `memory/[id].tsx` but chains all memories in the story into one continuous slideshow. Top bar: story title (editable on tap), share button, add-memory button. Bottom: bead indicators showing position across the whole story.
- **`src/app/story/create.tsx`** — Story creation. Title input, optional cover photo selection, multi-select of existing memories (checkbox list with thumbnails). Save creates the story and join rows.

### Entry points

- **Profile screen** (`src/app/profile.tsx`): add a "Stories" section between "Portfolio" and "Time Machine" — a horizontal scroll of story cards, with a "New Story" card at the end. Tapping a card opens `/story/[id]`.
- **Memory detail** (`src/app/memory/[id].tsx`): add an "Add to Story" action in the share menu. Opens a story picker (bottom sheet listing existing stories + "New Story"). Adds the memory to the selected story.
- **Compose** (`src/app/compose.tsx`): accept an optional `storyId` query param. When present, the save action also calls `addMemoryToStory(storyId, newCompositionId)`. This enables "capture into a story" — open a story, tap add, compose, save, and it's auto-added.

### Fast capture flow

From story detail: tap "Add Memory" → navigates to `/compose?storyId=X` → user captures normally → on save, memory is auto-added to the story. This is the "fast to capture" path — no post-hoc grouping step needed.

### Animation (per AGENTS.md: break into segments at different rates)

`StoryCard` entrance: cover image fades in (400ms, delay 0ms) → title slides up (300ms, delay 150ms) → date/count fade in (250ms, delay 300ms). Story detail open: cover expands with spring (damping 18, stiffness 200) while beads stagger in from left (each 50ms apart).

---

## Cross-Cutting — The Tactile Instrument (TE Design Philosophy)

TE products feel like hardware because every action has a physical response. Kouthoofd (SFMOMA, 2024): "the way you can touch and physically interact with the audio really makes it stand out." Haptic research confirms touch has high resolution of human sensation and enhances perceived quality (ACM CHI; Frontiers in Neuroergonomics, 2023). But these are functional confirmations — the snap of a switch, the click of a button — not gamified celebrations. The prior plan's "save celebration" with particle bursts was a reward pattern dressed up as tactility. It is removed.

### Centralized haptics — `src/hooks/use-haptics.ts`

Single hook exposing named patterns so haptics are consistent and tunable. Every pattern maps to a physical metaphor, not an emotional one:
- `tap()` — `ImpactFeedbackStyle.Light` — the click of a button press.
- `select()` — `ImpactFeedbackStyle.Medium` — the snap of a toggle engaging.
- `save()` — `NotificationFeedbackType.Success` — the thunk of a tape recorder stopping. A single confirmation, not a fanfare.
- `recordStart()` / `recordStop()` — distinct patterns mirroring the TP-7's motor engaging and disengaging.
- `seek()` — `ImpactFeedbackStyle.Rigid` — the tactile resistance of scrubbing the vinyl record.

Replace all ad-hoc haptic calls across the app with this hook. No particle bursts. No celebration overlays. The save action confirms with a haptic and the card settles into place — that is the entire reward.

### Add button enrichment — `src/components/add-button.tsx`

The add button already has swipe-up and long-press handlers. Add:
- Haptic on press (`tap()`), stronger haptic on long-press start (`select()`).
- A subtle scale pulse (1.0 → 1.05 → 1.0, 200ms) on press-in, springing back on press-out — the feel of a physical button depressing.

### Profile stat count-up — `src/components/`

When the profile screen loads, the stat values (Today, Words, Audio) animate from 0 to their final value over 800ms with `Easing.out(Easing.cubic)`. Each stat starts at a slightly different delay (0ms, 100ms, 200ms) so they don't feel mechanical. This is quiet acknowledgment — the needle settling on a gauge — not gamification.

---

## Mechanism 2 — Involuntary Rediscovery (Proust Effect)

This is the primary daily return driver. The user opens Fold because they're curious what might surface today — not because a notification told them to.

The existing "on this day" query does date matching (month/day across years). The research says this is the right instinct but under-powered. Chu & Downes (2002) showed that sensory cues trigger involuntary autobiographical memory retrieval more effectively than temporal cues alone. Multimodal research (Frontiers in Psychology, 2015) demonstrates that visual, auditory, and olfactory cues contribute differently to recollection. The reminiscence bump (PMC systematic review, 2018) shows memories from ages 15-30 are recalled more vividly. Cued recall improves psychological well-being (reminiscence therapy research).

Fold already attaches music, audio, photos, and location to memories — these are sensory cues waiting to be leveraged. The home screen should use cue-based retrieval, not just date matching.

### Cue-based rediscovery query — `src/db/journal-repository.ts`

Replace the single `getOnThisDayCompositions` with a weighted retrieval function `getRediscoveryMemory()`:

```ts
interface RediscoveryCandidate {
  composition: Composition;
  cueType: 'temporal' | 'audio' | 'music' | 'image' | 'location';
  weight: number;  // higher = more likely to surface
}
```

**Scoring algorithm** (runs on app open, returns one memory):
1. **Temporal proximity** (weight 1.0): exact month/day match across years. ±3 day fallback at weight 0.5.
2. **Reminiscence bump** (weight multiplier 1.5): memories created when the user was 15-30 (derived from `user_settings.dob` + `composition.created_at`) get a multiplier.
3. **Sensory cue richness** (weight 0.3 per cue type): memories with audio (+0.3), music (+0.3), images (+0.3), location (+0.3) score higher — these are the cues that trigger involuntary recall.
4. **Recency penalty** (weight -0.2 per week): memories surfaced in the last 7 days are deprioritized so the user doesn't see the same memory repeatedly.
5. **Random tiebreak**: among equally-weighted candidates, pick randomly — serendipity, not determinism.

The top-scoring memory surfaces as the "featured" card on the home screen. The rest of the carousel remains as-is. The featured card gets a subtle visual distinction — a small "rediscovered" mark or a different entrance animation — so the user notices it's not just the most recent memory.

### Sensory cue reinforcement — `src/app/index.tsx`

When a rediscovered memory surfaces, play its sensory cues subtly:
- If the memory has music attached, the vinyl record on the card spins slowly (ambient, not autoplaying audio — the visual cue triggers the memory of the song).
- If the memory has audio, show the waveform faintly on the card.
- If the memory has location, show the city name in the metadata row.

This is the Proust effect in product design: the cue triggers the memory, not the date. The user sees a spinning vinyl record and remembers the song, the place, the moment — before they even tap to open it.

### Contextual empty state — `src/app/index.tsx`

When no memories exist near today (truly empty database or new user), the empty state shows a rotating prompt: "Today is a good day to start." / "What happened today?" / "Capture something." — cycling every 4 seconds with a crossfade (300ms). No guilt, no streak language.

### iOS home-screen widget — `widgets/OnThisDay.tsx`

The widget is a peripheral surface for rediscovery (calm technology principle: "move easily from periphery to center"). It shows the same rediscovery memory the home screen would show, refreshed daily.

Requires adding `expo-widgets` package and configuring the plugin in `app.json`:
```json
"plugins": [
  ["expo-widgets", { "ios": { "src": "./widgets/OnThisDay" } }]
]
```

Widget behavior:
- Shows the rediscovery memory (same scoring algorithm). If none, shows the Fold logo + "No memories yet."
- Displays: the memory's first image (or text excerpt), the date, and a small Fold mark.
- Refreshes daily via a timeline (expo-widgets `TimelineProvider`).
- Tapping deep-links into `/memory/[id]`.
- **iOS only.** Android users get the in-app rediscovery but no widget — documented limitation, no Android widget support in SDK 57.

### No daily nudge

The prior plan included an optional daily notification ("A memory from this day is waiting"). This is removed. It contradicts the calm technology principle and the user's "real, safe, friendly" directive. A notification is a push — it demands attention. Fold's daily return is a pull — the user opens the app because they want to see what surfaced today. The anticipation of serendipity is the driver, not a badge or a buzz.

---

## Mechanism 3 — Peripheral Connection (Calm Technology)

The user approved a minimal server. This is the biggest architectural shift from the prior plan, which assumed no server at all. The server does one thing: deliver story bundles between Fold users. It is a post office, not a database.

Amber Case's calm technology principles (2015) apply directly: "technology should require the smallest possible amount of attention" and "communicate through the periphery." A story arriving from someone is a peripheral event — the user discovers it on their next open, not via a push notification. The tea kettle model: quiet until ready, then sings.

### What the server is

A minimal relay server (Node.js, deployed as a standalone service separate from the Expo app). It exposes exactly two endpoints:

```
POST /deliver
  Body: { recipientPublicKey: string, ciphertext: string }
  - recipientPublicKey is the recipient's Fold ID (their public key)
  - ciphertext is the client-encrypted StoryBundle (server cannot decrypt)
  - Stores the ciphertext + recipientPublicKey, returns 200 + delivery ID
  - Entry expires after 30 days if not collected

POST /collect
  Body: { recipientPublicKey: string }
  - Returns all pending ciphertexts for this recipient
  - Deletes them from the server after delivery
  - Returns empty array if nothing pending
```

No accounts. No authentication beyond a Fold ID — a public key from an asymmetric keypair generated on first launch and stored in `user_settings`. The private key never leaves the device. No friends list, no profile, no feed. The sender needs to know the recipient's Fold ID (their public key, shared out-of-band: in person, via message). The sender encrypts the bundle with the recipient's public key; only the recipient's private key can decrypt it. The server sees only the public key and ciphertext — it cannot decrypt the bundle even if it wanted to.

### What the server is not

- Not a database. Bundles are deleted after delivery or 30-day expiry.
- Not a social network. No friends list, no feed, no profile, no discoverability.
- Not a sync server. Memories stay on-device. Only stories are sent, and only when the user explicitly shares one.
- Not an analytics endpoint. No tracking, no logging beyond delivery receipts.

### Story bundle format — `src/types/story.ts`

```ts
interface StoryBundle {
  storyId: number;
  title: string;
  createdAt: number;
  senderId: string;        // sender's Fold ID
  senderName?: string;     // optional, from user_settings
  memories: Composition[]; // full composition objects with media_elements
  mediaBase64: Record<string, string>;  // media URI → base64 for transport
}
```

The bundle is a self-contained JSON payload. Media files (images, audio, video) are base64-encoded for transport. The bundle is encrypted client-side using the recipient's public key (asymmetric encryption — e.g., libsodium sealed box or RSA-OAEP). Only the recipient's private key, which never leaves their device, can decrypt it. The server sees only the recipient's public key and the ciphertext.

### Client-side flow

**Sending** (from story detail `src/app/story/[id].tsx`):
1. User taps "Send Story" → enters recipient's Fold ID (their public key, shared out-of-band or via a future QR code).
2. Client assembles the `StoryBundle` from local SQLite (story + memories + media files → base64).
3. Client encrypts the bundle with the recipient's public key (asymmetric — sealed box pattern: sender doesn't need their own keypair to send).
4. Client POSTs the ciphertext + recipient's public key to `/deliver`.
5. Confirmation: "Story sent. They'll find it next time they open Fold." — no delivery receipt, no read receipt. The sender trusts it arrived. This is the calm technology principle: no anxiety-inducing status indicators.

**Receiving** (on app open, in `src/app/_layout.tsx`):
1. On app launch, after DB init, client POSTs to `/collect` with its own public key (Fold ID).
2. If bundles are returned, client decrypts each with its private key (stored locally, never transmitted).
3. Each received story is inserted into local SQLite as a story with `origin: 'received'` flag (new column on `stories` table).
4. A subtle indicator appears on the home screen — a small dot on the profile button, or a "1 new story" mark in the stories section. Not a notification. Not a badge. A peripheral signal the user notices on their own terms.
5. The user opens the story when they want to. No urgency.

### Data model addition

Add `origin` and `sender_id` columns to the `stories` table:

```sql
ALTER TABLE stories ADD COLUMN origin TEXT NOT NULL DEFAULT 'created';
-- 'created' = user made this story
-- 'received' = someone sent this story to this user
ALTER TABLE stories ADD COLUMN sender_id TEXT;
ALTER TABLE stories ADD COLUMN sender_name TEXT;
```

These columns are nullable for stories the user creates themselves. For received stories, they record who sent it.

### Server implementation — `server/`

A standalone relay service, deployed separately from the Expo app. Nitro is a good fit (lightweight, standalone, no Nuxt dependency) but Hono or Express would work equally well — the server is two endpoints and an ephemeral store, so the framework choice is not load-bearing.

```
server/
├─ api/
│  ├─ deliver.post.ts    # POST /deliver — store encrypted bundle
│  └─ collect.post.ts    # POST /collect — return + delete pending bundles
├─ utils/
│  └─ storage.ts         # ephemeral storage (in-memory map or Redis, not a database)
└─ nitro.config.ts       # or hono.ts / express entry point
```

The server uses in-memory storage or Redis with TTL — bundles expire automatically. No persistent database. No migrations. No schema. The server is stateless except for the ephemeral delivery queue.

This is a deliberate architectural choice: the server has no long-term memory. If it restarts, pending deliveries are lost — but since the sender doesn't know if delivery happened anyway (no read receipts), this is acceptable. The sender can resend. The calm technology principle: "technology should work even when it fails" — the failure mode is graceful (story doesn't arrive, sender resends), not catastrophic.

### PDF export (retained, secondary)

The PDF export from the prior plan is retained as a secondary sharing method for recipients who don't have Fold. It uses `expo-print` to render the story as a styled PDF, shared via `expo-sharing` → system share sheet. This is the "universal" path; the relay server is the "Fold-to-Fold" path. Both coexist in the story detail share menu:
- "Send to Fold User" → relay server flow.
- "Export as PDF" → universal PDF.

---

## How Retention Works (the three mechanisms, woven together)

The research identifies three psychological mechanisms that drive long-term engagement with a memory journal. Each maps to Fold's existing architecture and the user's three decisions:

1. **Craft Investment (IKEA effect)** — The user builds psychological ownership through effort. Composing a memory (arranging media, choosing fonts, placing stickers) is the primary investment. Grouping memories into stories is the higher-order act — more effort, more ownership. The user returns because they have invested, not because a streak demands it. (Norton et al., 2012; Elsden et al., CHI 2016.)

2. **Involuntary Rediscovery (Proust effect)** — The user opens Fold because they're curious what might surface today. Cue-based retrieval (sensory cues, temporal proximity, reminiscence bump weighting) surfaces a memory they didn't know they were looking for. The sensory cues on the card (spinning vinyl, waveform, location name) trigger involuntary recall before the user even taps. This is the daily return driver — pull, not push. No notification. (Chu & Downes, 2002; Frontiers in Psychology, 2015; PMC systematic review, 2018.)

3. **Peripheral Connection (calm technology)** — A story arrives from someone. The user discovers it on their next open, not via a push. The relay server is a post office — it holds the bundle until collected, then forgets. No feed, no friends list, no read receipts. The connection is real but peripheral. (Amber Case, 2015.)

Cross-cutting: **The Tactile Instrument** — every interaction has a physical response. Haptics confirm actions (the click of a button, the thunk of a save), not celebrate them. The app feels like hardware because it responds like hardware. (Kouthoofd, SFMOMA 2024; ACM CHI haptics research.)

No streaks. No badges. No loss-aversion. No FOMO. No notifications. The habit comes from the app being genuinely useful, feeling good to use, and offering the quiet surprise of rediscovery.

---

## Test Plan

### Mechanism 1 — Craft Investment (Stories)
- Create a story with no memories → appears in gallery with count 0.
- Create a story, add 3 memories → count shows 3, order preserved.
- Add the same memory to two stories → appears in both, deleting from one doesn't affect the other.
- Delete a story → join rows removed, memories remain intact.
- Delete a memory that's in a story → join row cascades, story count updates.
- Compose with `storyId` param → memory auto-added to story on save.
- Story detail slideshow chains all memories in `sort_order`.
- Reorder memories → slideshow reflects new order.

### Cross-Cutting — The Tactile Instrument
- Haptic patterns are distinct (tap vs select vs save vs recordStart vs seek).
- Save action fires `save()` haptic — no particle burst, no celebration overlay, no `save-celebration.tsx` component.
- Add button scales on press (1.0 → 1.05), springs back on release.
- Profile stats animate from 0 on load, staggered (0ms, 100ms, 200ms delays).
- All ad-hoc haptic calls replaced with the centralized hook.

### Mechanism 2 — Involuntary Rediscovery
- App open with exact on-this-day match → surfaces that memory as featured card.
- App open with no exact match but ±3 day matches → surfaces nearby memory at reduced weight.
- App open with no matches at all → contextual empty state cycles prompts every 4s.
- Memory with audio/music/image/location cues scores higher than text-only memory.
- Memory from user's reminiscence bump period (ages 15-30, derived from DOB) gets weight multiplier.
- Memory surfaced in last 7 days is deprioritized (recency penalty).
- Among equally-weighted candidates, selection is random (serendipity) — verify by running query multiple times and confirming different results.
- Featured card shows sensory cues: vinyl spins (music), waveform visible (audio), city name shown (location).
- Widget (iOS): shows the same rediscovery memory, refreshes daily, deep-links on tap.
- Widget (Android): gracefully absent, no crash.
- No notification is ever scheduled. Verify `expo-notifications` is not in dependencies.

### Mechanism 3 — Peripheral Connection (Relay Server)
- Send a story to a Fold ID → bundle encrypts client-side, POSTs to `/deliver`, returns 200.
- Recipient opens app → `/collect` returns the bundle, decrypts, inserts into SQLite with `origin='received'`.
- Subtle indicator appears on home screen (dot on profile button or "1 new story" mark).
- Recipient opens the received story → displays correctly with sender name.
- Bundle expires after 30 days if not collected → `/collect` returns empty.
- Server stores no plaintext — verify bundle is encrypted before upload, server sees only ciphertext.
- Server has no persistent database — restart clears pending deliveries (graceful failure).
- No read receipts, no delivery receipts — sender sees only "Story sent."
- PDF export still works → "Export as PDF" generates styled PDF, opens in share sheet.
- PDF includes cover page, all memories in order, correct fonts.
- Export story with video memory → video frame captured as image in PDF.

---

## Dependencies to add

- `expo-widgets` — iOS home-screen widget (Mechanism 2).
- `expo-print` — PDF generation for story export (Mechanism 3, secondary sharing path).
- `react-native-libsodium` or `expo-crypto` with WebCrypto — client-side asymmetric encryption of story bundles (Mechanism 3). Sealed box pattern: sender encrypts with recipient's public key, only recipient's private key (never leaves device) can decrypt. The server sees only ciphertext.

Removed from prior plan:
- `expo-notifications` — removed. No daily nudge. The daily return driver is involuntary rediscovery, not a notification.

All other dependencies (`expo-haptics`, `expo-sharing`, `react-native-view-shot`, `react-native-reanimated`, `expo-share-intent`) are already installed.

The relay server is a standalone Node.js service with in-memory or Redis storage — no new database dependency.

---

## Out of scope (documented future work)

- QR code sharing of Fold IDs (for easier recipient entry in Mechanism 3).
- `.foldstory` file format for offline Fold-to-Fold transfer (the relay server covers this; the file format is a fallback for no-connectivity scenarios).
- Streaks, badges, leaderboards, gamification — explicitly rejected per PRODUCT.md Principle #6 and the user's "real, safe, friendly" directive.
- Android home-screen widgets — not supported in Expo SDK 57.
- AI-powered story summaries or mood analysis — explicitly rejected per PRODUCT.md.
- Cloud sync — explicitly rejected, ever. The relay server delivers stories; it does not sync memories.
- Social feed, friends list, profile discovery — explicitly rejected. The relay server is a post office, not a social network.
- Read receipts, delivery receipts, typing indicators — explicitly rejected per calm technology principles.
