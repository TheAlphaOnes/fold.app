import { describe, expect, it } from 'vitest';
import { nextHint, unlearnedGestures } from '@/home/key-hints';

describe('key hints', () => {
  it('teaches only gestures not yet used on the key', () => {
    expect(unlearnedGestures({ tap: true, hold: false, swipe: false })).toEqual(['hold', 'swipe']);
    expect(unlearnedGestures({ tap: true, hold: true, swipe: true })).toEqual([]);
  });
  it('goes round the remaining hints', () => {
    expect(nextHint(['tap', 'hold', 'swipe'], null)).toBe('tap');
    expect(nextHint(['tap', 'hold', 'swipe'], 'swipe')).toBe('tap');
    expect(nextHint(['hold', 'swipe'], 'tap')).toBe('hold');
    expect(nextHint([], 'tap')).toBeNull();
  });
});
