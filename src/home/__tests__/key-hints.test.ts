import { describe, expect, it } from 'vitest';
import { nextHint, unlearnedGestures } from '@/home/key-hints';

const none = { write: false, voice: false, capture: false };

describe('key hints', () => {
  it('teaches only gestures not yet used or done in the guide', () => {
    expect(unlearnedGestures({ tap: true, hold: false, swipe: false }, none)).toEqual(['hold', 'swipe']);
    expect(unlearnedGestures({ tap: false, hold: false, swipe: false }, { write: true, voice: true, capture: true })).toEqual([]);
  });
  it('goes round the remaining hints', () => {
    expect(nextHint(['tap', 'hold', 'swipe'], null)).toBe('tap');
    expect(nextHint(['tap', 'hold', 'swipe'], 'swipe')).toBe('tap');
    expect(nextHint(['hold', 'swipe'], 'tap')).toBe('hold');
    expect(nextHint([], 'tap')).toBeNull();
  });
});
