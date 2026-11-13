import { describe, expect, it } from 'vitest';

import { almanacMonth, almanacYear } from '@/doodles/almanac';
import { DOODLES } from '@/doodles/library';

describe('almanac', () => {
  const today = new Date(2026, 10, 14);
  const counts = { '2026-11-03': 2, '2026-11-14': 1, '2026-10-31': 1, '2026-11-20': 1 };

  it('earns a date its doodle when a memory was kept', () => {
    const nov = almanacMonth(2026, 10, counts, today);
    expect(nov.days).toHaveLength(30);
    expect(nov.days[2]).toMatchObject({ key: '2026-11-03', kept: true, isFuture: false });
    expect(nov.days[13]).toMatchObject({ isToday: true, kept: true });
    expect(nov.days[19].isFuture).toBe(true);
    expect(nov.kept).toBe(3);
  });

  it("maps every date to the library's own slot", () => {
    const nov = almanacMonth(2026, 10, counts, today);
    expect(DOODLES[nov.days[12].slot].name).toBe('little deer');
    const feb = almanacMonth(2026, 1, {}, today);
    expect(feb.days).toHaveLength(28);
    expect(almanacMonth(2026, 2, {}, today).days[0].slot).toBe(60);
  });

  it('lays out the year in twelve months', () => {
    const year = almanacYear(2026, counts, today);
    expect(year.map((m) => m.days.length).reduce((a, b) => a + b, 0)).toBe(365);
    expect(year[9].kept).toBe(1);
  });
});
