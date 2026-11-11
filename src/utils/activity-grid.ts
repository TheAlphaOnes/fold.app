/**
 * The year heatmap's maths: week columns, month starts, shade levels and the
 * rounded-square path. Shared by the Activity card and the achievement share
 * card, so both draw the same grid.
 */

export interface DayCell {
  date: string;
  count: number;
  inYear: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface Panel {
  weeks: DayCell[][];
  monthStarts: { label: string; month: number; week: number }[];
}

export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const CELL_GAP = 1.5;
/** Accent opacity for 1, 2, 3 and 4+ memories in a day. */
export const LEVELS = [0.42, 0.62, 0.82, 1];
/** Empty days: lived, then still to come. */
export const EMPTY_OPACITY = 0.22;
export const FUTURE_OPACITY = 0.09;

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Week columns for months [firstMonth, lastMonth] of a year, Sunday-aligned. */
export function buildPanel(
  year: number,
  firstMonth: number,
  lastMonth: number,
  countMap: Record<string, number>,
  todayKey: string,
): Panel {
  const first = new Date(year, firstMonth, 1);
  const last = new Date(year, lastMonth + 1, 0);
  const start = new Date(year, firstMonth, 1 - first.getDay());
  const end = new Date(year, lastMonth, last.getDate() + (6 - last.getDay()));

  const weeks: DayCell[][] = [];
  let cursor = new Date(start);
  let week = 0;
  while (cursor <= end) {
    const key = formatDate(cursor);
    const inPanel = cursor >= first && cursor <= last;
    (weeks[week] ??= []).push({
      date: key,
      count: countMap[key] ?? 0,
      inYear: inPanel,
      isToday: key === todayKey,
      isFuture: key > todayKey,
    });
    if (cursor.getDay() === 6) week += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }

  const monthStarts = [];
  for (let m = firstMonth; m <= lastMonth; m++) {
    const offset = Math.round((new Date(year, m, 1).getTime() - start.getTime()) / 86400000);
    monthStarts.push({
      label: MONTHS[m],
      month: m,
      week: Math.floor(offset / 7),
    });
  }
  return { weeks, monthStarts };
}

export function levelFor(count: number): number {
  return LEVELS[Math.min(count, LEVELS.length) - 1];
}

/** SVG path data for a square with corners rounded by r, at (x, y). */
export function roundedSquare(x: number, y: number, size: number, r: number): string {
  const e = size - 2 * r;
  return (
    `M${x + r} ${y}h${e}a${r} ${r} 0 0 1 ${r} ${r}v${e}a${r} ${r} 0 0 1 ${-r} ${r}` +
    `h${-e}a${r} ${r} 0 0 1 ${-r} ${-r}v${-e}a${r} ${r} 0 0 1 ${r} ${-r}z`
  );
}

/** One path per shade, so the whole year is a handful of native shapes. */
export function shadePaths(panel: Panel, pitch: number, cell: number): Map<string, { lit: boolean; opacity: number; d: string }> {
  const shades = new Map<string, { lit: boolean; opacity: number; d: string }>();
  panel.weeks.forEach((days, week) => {
    days.forEach((day, weekday) => {
      if (!day.inYear) return;
      const lit = day.count > 0;
      const opacity = lit ? levelFor(day.count) : day.isFuture ? FUTURE_OPACITY : EMPTY_OPACITY;
      const key = `${lit}:${opacity}`;
      const shade = shades.get(key) ?? { lit, opacity, d: '' };
      shade.d += roundedSquare(week * pitch, weekday * pitch, cell, Math.min(1.5, cell * 0.28));
      shades.set(key, shade);
    });
  });
  return shades;
}
