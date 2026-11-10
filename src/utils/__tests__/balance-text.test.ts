import { describe, expect, it } from 'vitest';
import { balanceLines, monoCharsPerLine } from '@/utils/balance-text';

describe('balanceLines', () => {
  it('keeps short text on one line', () => {
    expect(balanceLines('almost here', 40)).toEqual(['almost here']);
  });
  it('evens out lines instead of stranding the last words', () => {
    const text = 'take a photo wherever you are and it becomes a stamp of that place, kept here and on your map';
    const lines = balanceLines(text, 44);
    expect(lines).toHaveLength(3);
    const lengths = lines.map((l) => l.length);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThanOrEqual(8);
    expect(lines.join(' ')).toBe(text);
  });
  it('never makes a line longer than allowed', () => {
    balanceLines('your map comes with the next app update', 20).forEach((l) => expect(l.length).toBeLessThanOrEqual(20));
  });
});

describe('monoCharsPerLine', () => {
  it('counts glyphs that fit', () => {
    expect(monoCharsPerLine(300, 12, 0)).toBe(41);
  });
});
