/**
 * When the doodle reveal plays: the first memory kept on a given day, once
 * that day, and a bigger version for the very first memory ever.
 *
 * Pure, so it's tested: the hook only gathers the journal and the settings.
 */

import { toDayKey } from '@/utils/format-date';
import type { TimelineSpineEntry } from '@/utils/timeline';

export interface RevealInput {
  /** The memory just saved, if any. */
  justAddedId: number | null;
  /** The journal's newest-first spine for the current mode. */
  spine: readonly TimelineSpineEntry[];
  /** Live memories in the whole journal, across every year and mode. */
  totalMemories: number;
  /** The day key of the last reveal ('' before the first). */
  revealDay: string;
  /** The first-ever reveal has played. */
  firstSeen: boolean;
  now: Date;
}

export interface RevealDecision {
  /** The very first memory ever: the reveal explains the almanac. */
  first: boolean;
}

/**
 * The reveal for the memory just saved, or null when it shouldn't play:
 * nothing was just saved, it was backdated, today's reveal already played,
 * or it isn't today's first memory.
 */
export function revealForSave({ justAddedId, spine, totalMemories, revealDay, firstSeen, now }: RevealInput): RevealDecision | null {
  if (justAddedId === null) return null;
  const added = spine.find((entry) => entry.id === justAddedId);
  if (!added) return null;

  const dayKey = toDayKey(now);
  if (toDayKey(new Date(added.createdAt)) !== dayKey) return null;
  if (revealDay === dayKey) return null;

  const keptToday = spine.filter((entry) => toDayKey(new Date(entry.createdAt)) === dayKey).length;
  if (keptToday !== 1) return null;

  return { first: !firstSeen && totalMemories === 1 };
}
