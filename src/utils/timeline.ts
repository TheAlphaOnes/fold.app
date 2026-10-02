export type TimelineFeedMode = 'yearly' | 'monthly' | 'infinite';

export interface TimelineSpineEntry {
  id: number;
  createdAt: number;
}

export type TimelineRow =
  | {
      type: 'memory';
      id: string;
      compositionId: number;
      createdAt: number;
      offset: number;
    }
  | {
      type: 'separator';
      id: string;
      date: Date;
      mode: TimelineFeedMode;
      offset: number;
    };

/**
 * Recurring feeds share a calendar slot.
 * Yearly: this month and day, every year.
 * Monthly: this day-of-month, every month.
 * Infinite: every recorded day, in order.
 */
export function timelineBlockKey(createdAt: number, mode: TimelineFeedMode): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return `invalid-${createdAt}`;
  if (mode === 'yearly') return String(date.getFullYear());
  if (mode === 'monthly') return `${date.getFullYear()}-${date.getMonth()}`;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Spine is newest-first. The inverted feed paints index 0 at the bottom,
 * so the present sits under older years, months, or days.
 * Separators are inserted at the boundary, labelled with the older block.
 */
export function buildTimelineRows(
  spineNewestFirst: TimelineSpineEntry[],
  mode: TimelineFeedMode,
  snapInterval: number,
  separatorHeight: number,
): { items: TimelineRow[]; offsets: number[] } {
  const items: TimelineRow[] = [];
  const offsets: number[] = [];
  let currentOffset = 0;
  let lastBlock: string | null = null;

  for (const entry of spineNewestFirst) {
    const block = timelineBlockKey(entry.createdAt, mode);
    if (lastBlock !== null && lastBlock !== block) {
      items.push({
        type: 'separator',
        id: `sep-${entry.id}-${block}`,
        date: new Date(entry.createdAt),
        mode,
        offset: currentOffset,
      });
      currentOffset += separatorHeight;
    }
    lastBlock = block;

    items.push({
      type: 'memory',
      id: `mem-${entry.id}`,
      compositionId: entry.id,
      createdAt: entry.createdAt,
      offset: currentOffset,
    });
    offsets.push(currentOffset);
    currentOffset += snapInterval;
  }

  return { items, offsets };
}

/** Closest memory index for a content offset. Offsets are ascending. */
export function memoryIndexNearOffset(offsets: number[], offsetY: number): number {
  if (offsets.length === 0) return 0;
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (offsets[mid] < offsetY) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(offsets[lo - 1] - offsetY) < Math.abs(offsets[lo] - offsetY)) {
    return lo - 1;
  }
  return lo;
}
