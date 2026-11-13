import type { Line } from '@/doodles/kit';
import type { Ink } from '@/doodles/palette';

/** One stroke of a library doodle, in the unit box (see `kit.ts`). */
export interface LibraryStroke {
  ink: Ink;
  points: Line;
}

/** One day's doodle in the year's collection. */
export interface LibraryDoodle {
  /** What it is, lowercase: "paper crane". Unique across the year. */
  name: string;
  /** Drawn in order: the draw-in traces them one after another. */
  strokes: LibraryStroke[];
}

/**
 * Writes a doodle as groups of lines by ink, in drawing order:
 *
 *   doodle('tulip', ['green', stem, leaf], ['red', ...petals])
 */
export function doodle(name: string, ...groups: [Ink, ...(Line | Line[])[]][]): LibraryDoodle {
  const strokes: LibraryStroke[] = [];
  for (const [ink, ...lines] of groups) {
    for (const l of lines) {
      if (l.length === 0) continue;
      if (typeof l[0] === 'number') strokes.push({ ink, points: l as Line });
      else for (const sub of l as Line[]) strokes.push({ ink, points: sub });
    }
  }
  return { name, strokes };
}
