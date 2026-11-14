/**
 * Song recommendations — simple, explainable, and tested.
 *
 *   taste    the artists you pick and heart most (recent picks weigh more)
 *   mood     what's on the canvas (its words, its place) and the time of
 *            day, turned into a search that fits the memory
 *   chart    what's most played in your country right now
 *
 * The three lists take turns so none crowds the others out, duplicates
 * (the same song on another album too) and songs you've already used are
 * dropped, and no artist gets more than two places. A seed reshuffles each
 * list, so every opening of the picker is a little different.
 */

import type { MusicPick, MusicTrack } from '@/hooks/use-music-store';

/** What the memory being composed says about itself. */
export interface CanvasContext {
  /** Every word on the canvas, joined. */
  text: string;
  /** Where it was kept, if known. */
  place?: string;
  /** When it's being kept; now, if omitted. */
  at?: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Artists to draw from, strongest first. Each pick counts 1, halving every
 * 30 days; a hearted song counts 2. Cut to `limit`.
 */
export function tasteArtists(picks: readonly MusicPick[], saved: readonly MusicTrack[], now: number, limit = 3): string[] {
  const score = new Map<string, { name: string; value: number }>();
  const add = (name: string, value: number) => {
    const key = name.trim().toLowerCase();
    if (!key) return;
    const entry = score.get(key) ?? { name: name.trim(), value: 0 };
    entry.value += value;
    score.set(key, entry);
  };
  for (const p of picks) add(p.artistName, 0.5 ** ((now - p.pickedAt) / (30 * DAY_MS)));
  for (const s of saved) add(s.artistName, 2);
  return [...score.values()].sort((a, b) => b.value - a.value).slice(0, limit).map((e) => e.name);
}

/** Words on a canvas that set a mood, and the search each one leads to. */
const MOODS: readonly { words: readonly string[]; term: string }[] = [
  { words: ['rain', 'rainy', 'storm', 'monsoon', 'drizzle'], term: 'rainy day acoustic' },
  { words: ['beach', 'sea', 'ocean', 'waves', 'sand', 'goa'], term: 'summer beach' },
  { words: ['birthday', 'bday', 'cake', 'party', 'celebrate'], term: 'party hits' },
  { words: ['love', 'date', 'crush', 'us', 'anniversary', 'valentine'], term: 'love songs' },
  { words: ['drive', 'road', 'trip', 'highway', 'travel', 'flight'], term: 'road trip' },
  { words: ['coffee', 'cafe', 'chai', 'tea', 'study', 'reading'], term: 'coffee shop acoustic' },
  { words: ['gym', 'run', 'workout', 'match', 'game'], term: 'workout' },
  { words: ['sad', 'miss', 'cry', 'alone', 'lonely', 'tired'], term: 'sad songs' },
  { words: ['friends', 'gang', 'squad', 'together'], term: 'feel good friends' },
  { words: ['snow', 'winter', 'cold', 'christmas', 'cozy', 'cosy'], term: 'cozy winter' },
  { words: ['diwali', 'holi', 'wedding', 'shaadi', 'festival'], term: 'bollywood celebration' },
  { words: ['sunset', 'evening', 'sky'], term: 'sunset chill' },
  { words: ['night', 'midnight', 'stars', 'moon'], term: 'late night' },
];

/** The time of day's own search, when the canvas says nothing. */
export function momentTerm(at: Date): string {
  const h = at.getHours();
  if (h < 5) return 'late night lofi';
  if (h < 11) return 'morning acoustic';
  if (h < 17) return 'feel good pop';
  if (h < 21) return 'evening chill';
  return 'late night';
}

/**
 * The mood search for a memory: the first mood its words (or place) name,
 * else the time of day's.
 */
export function moodTerm(context: CanvasContext): string {
  const words = new Set(`${context.text} ${context.place ?? ''}`.toLowerCase().match(/[a-z]+/g) ?? []);
  const mood = MOODS.find((m) => m.words.some((w) => words.has(w)));
  return mood?.term ?? momentTerm(context.at ?? new Date());
}

/** A song's identity across albums and remasters: title without brackets, plus artist. */
export function songKey(track: Pick<MusicTrack, 'trackName' | 'artistName'>): string {
  const title = track.trackName.toLowerCase().replace(/\s*[([].*?[)\]]\s*/g, ' ').replace(/\s+-\s+.*$/, '').trim();
  return `${title}|${track.artistName.toLowerCase().trim()}`;
}

/** A small seeded shuffle (mulberry32), so a mix is reproducible in tests. */
function shuffled<T>(items: readonly T[], seed: number): T[] {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The mix: sources take turns (each shuffled by `seed`), skipping songs
 * already used or already in the mix, at most `perArtist` per artist.
 */
export function mixRecommendations(
  sources: readonly (readonly MusicTrack[])[],
  used: ReadonlySet<number>,
  seed: number,
  limit = 30,
  perArtist = 2,
): MusicTrack[] {
  const queues = sources.map((s, i) => shuffled(s, seed + i * 7919));
  const seen = new Set<string>();
  const byArtist = new Map<string, number>();
  const out: MusicTrack[] = [];
  let progressed = true;
  while (out.length < limit && progressed) {
    progressed = false;
    for (const queue of queues) {
      while (queue.length > 0) {
        const track = queue.shift() as MusicTrack;
        const key = songKey(track);
        const artist = track.artistName.toLowerCase().trim();
        if (used.has(track.trackId) || seen.has(key) || (byArtist.get(artist) ?? 0) >= perArtist) continue;
        seen.add(key);
        byArtist.set(artist, (byArtist.get(artist) ?? 0) + 1);
        out.push(track);
        progressed = true;
        break;
      }
      if (out.length >= limit) break;
    }
  }
  return out;
}
