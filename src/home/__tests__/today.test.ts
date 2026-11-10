import { describe, expect, it } from 'vitest';
import { dayLine } from '@/home/today';

describe('dayLine', () => {
  it('names the time of day', () => {
    expect(dayLine(new Date(2026, 0, 1, 8))).toBe('first light');
    expect(dayLine(new Date(2026, 0, 1, 13))).toBe('the middle of it');
    expect(dayLine(new Date(2026, 0, 1, 22))).toBe('before it ends');
  });
});
