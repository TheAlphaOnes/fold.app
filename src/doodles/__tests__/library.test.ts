import { describe, expect, it } from 'vitest';

import { DOODLES, MONTH_DAYS, MONTH_STARTS, doodleForDate, serialOf, slotOf } from '@/doodles/library';
import { INKS } from '@/doodles/palette';

describe('the year', () => {
  it('has a slot for every date of a leap year', () => {
    expect(MONTH_DAYS.reduce((a, b) => a + b, 0)).toBe(366);
    expect(MONTH_STARTS[1]).toBe(31);
    expect(MONTH_STARTS[11]).toBe(335);
  });

  it('keeps a date on the same slot every year, with 29 February its own', () => {
    expect(slotOf(new Date(2026, 0, 1))).toBe(0);
    expect(slotOf(new Date(2028, 1, 29))).toBe(59);
    expect(slotOf(new Date(2026, 2, 1))).toBe(60);
    expect(slotOf(new Date(2028, 2, 1))).toBe(60);
    expect(slotOf(new Date(2026, 11, 31))).toBe(365);
    expect(doodleForDate(new Date(2030, 0, 1))?.name).toBe('paper crane');
  });

  it('numbers doodles from No. 001', () => {
    expect(serialOf(0)).toBe('No. 001');
    expect(serialOf(365)).toBe('No. 366');
  });
});

describe('every doodle drawn so far', () => {
  it('fills whole months, in order', () => {
    expect(MONTH_STARTS).toContain(DOODLES.length === 366 ? 0 : DOODLES.length);
  });

  it('has a unique name and a unique drawing', () => {
    const names = DOODLES.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
    const drawings = DOODLES.map((d) => JSON.stringify(d.strokes));
    expect(new Set(drawings).size).toBe(drawings.length);
  });

  it.each(DOODLES.map((d) => [d.name, d] as const))('%s stays simple, inside its box, in known inks', (_, d) => {
    expect(d.strokes.length).toBeGreaterThanOrEqual(1);
    expect(d.strokes.length).toBeLessThanOrEqual(24);
    expect(d.name).toBe(d.name.toLowerCase());
    for (const s of d.strokes) {
      expect(s.ink in INKS).toBe(true);
      expect(s.points.length % 2).toBe(0);
      expect(s.points.length).toBeGreaterThanOrEqual(2);
      for (const v of s.points) expect(Math.abs(v)).toBeLessThanOrEqual(0.5);
    }
  });
});
