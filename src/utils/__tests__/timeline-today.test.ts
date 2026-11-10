import { describe, expect, it } from 'vitest';
import { buildTimelineRows, keptToday } from '@/utils/timeline';

describe("today's page", () => {
  const now = new Date(2026, 10, 10, 15);
  const spine = [
    { id: 2, createdAt: new Date(2026, 10, 9, 20).getTime() },
    { id: 1, createdAt: new Date(2026, 10, 8, 9).getTime() },
  ];
  it('knows whether something was kept today', () => {
    expect(keptToday(spine, now)).toBe(false);
    expect(keptToday([{ id: 3, createdAt: new Date(2026, 10, 10, 8).getTime() }, ...spine], now)).toBe(true);
    expect(keptToday([], now)).toBe(false);
  });
  it('leads with today and keeps memory offsets aligned with the spine', () => {
    const r = buildTimelineRows(spine, 'infinite', 100, 40, true);
    expect(r.items[0].type).toBe('today');
    expect(r.todayOffset).toBe(0);
    expect(r.offsets).toHaveLength(2);
    expect(r.offsets[0]).toBe(100);
    expect(r.snapOffsets[0]).toBe(0);
  });
});
