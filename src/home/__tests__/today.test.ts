import { describe, expect, it } from 'vitest';
import { dayLine, FREE_SHOTS, shotsFor, skyFor } from '@/home/today';

describe('dayLine', () => {
  it('names the time of day', () => {
    expect(dayLine(new Date(2026, 0, 1, 8))).toBe('first light');
    expect(dayLine(new Date(2026, 0, 1, 13))).toBe('the middle of it');
    expect(dayLine(new Date(2026, 0, 1, 22))).toBe('before it ends');
  });
});



describe('shotsFor', () => {
  it('takes one per grid cell, one for canvas, several for free templates', () => {
    expect(shotsFor('grid:duo-stack')).toEqual({ max: 2, fixed: true });
    expect(shotsFor('story')).toEqual({ max: 1, fixed: true });
    expect(shotsFor('slideshow')).toEqual({ max: FREE_SHOTS, fixed: false });
  });
});

describe('skyFor', () => {
  const at = (h: number) => new Date(2026, 10, 12, h, 30);
  it('follows the same hours as the day line', () => {
    expect(skyFor(at(3)).dark).toBe(true);
    expect(skyFor(at(7)).dark).toBe(false);
    expect(skyFor(at(13)).top).toBe('#9CCBEA');
    expect(skyFor(at(18)).top).toBe('#FF5A12');
    expect(skyFor(at(22)).dark).toBe(true);
  });
});
