/**
 * Groups Recently Deleted into sections by when each memory was deleted,
 * newest first, and deals each section into rows for a fixed-column grid.
 * Pure, so it's tested.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TrashSection<T> {
  /** "TODAY", "YESTERDAY", "3 DAYS AGO" … */
  title: string;
  rows: T[][];
}

function dayLabel(days: number): string {
  if (days <= 0) return 'TODAY';
  if (days === 1) return 'YESTERDAY';
  return `${days} DAYS AGO`;
}

export function trashSections<T extends { deletedAt?: number | null }>(items: T[], now: number, columns: number): TrashSection<T>[] {
  const byDay = new Map<number, T[]>();
  for (const item of items) {
    const days = Math.max(0, Math.floor((now - (item.deletedAt ?? now)) / DAY_MS));
    const list = byDay.get(days);
    if (list) list.push(item);
    else byDay.set(days, [item]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([days, list]) => {
      const rows: T[][] = [];
      for (let i = 0; i < list.length; i += columns) rows.push(list.slice(i, i + columns));
      return { title: dayLabel(days), rows };
    });
}
