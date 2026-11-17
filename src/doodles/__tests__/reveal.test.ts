import { describe, expect, it } from 'vitest';

import { revealForSave } from '@/doodles/reveal';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const entry = (id: number, createdAt: number) => ({ id, createdAt });

describe('revealForSave', () => {
  const now = new Date(2026, 10, 17, 21);

  it('plays for the first memory of the day', () => {
    const spine = [entry(7, at(2026, 11, 17, 20)), entry(6, at(2026, 11, 16, 9))];
    expect(revealForSave({ justAddedId: 7, spine, totalMemories: 2, revealDay: '', firstSeen: true, now })).toEqual({
      first: false,
    });
  });

  it('marks the very first memory ever', () => {
    const spine = [entry(1, at(2026, 11, 17, 20))];
    expect(revealForSave({ justAddedId: 1, spine, totalMemories: 1, revealDay: '', firstSeen: false, now })).toEqual({
      first: true,
    });
  });

  it('never plays twice in a day', () => {
    const spine = [entry(7, at(2026, 11, 17, 20))];
    expect(
      revealForSave({ justAddedId: 7, spine, totalMemories: 2, revealDay: '2026-11-17', firstSeen: true, now }),
    ).toBeNull();
  });

  it('stays quiet for a second memory the same day', () => {
    const spine = [entry(8, at(2026, 11, 17, 21)), entry(7, at(2026, 11, 17, 9))];
    expect(revealForSave({ justAddedId: 8, spine, totalMemories: 3, revealDay: '', firstSeen: true, now })).toBeNull();
  });

  it('stays quiet for a backdated memory', () => {
    const spine = [entry(7, at(2026, 11, 10, 20))];
    expect(revealForSave({ justAddedId: 7, spine, totalMemories: 2, revealDay: '', firstSeen: true, now })).toBeNull();
  });

  it('stays quiet when nothing was just saved', () => {
    const spine = [entry(7, at(2026, 11, 17, 20))];
    expect(revealForSave({ justAddedId: null, spine, totalMemories: 2, revealDay: '', firstSeen: true, now })).toBeNull();
  });

  it('stays quiet when the saved memory is not in the spine yet', () => {
    expect(
      revealForSave({ justAddedId: 9, spine: [], totalMemories: 2, revealDay: '', firstSeen: true, now }),
    ).toBeNull();
  });

  it('does not call a later first-of-day the first ever', () => {
    // Yearly mode only holds this date's memories, so the spine can be short
    // even when the journal is not: the total count is what decides.
    const spine = [entry(9, at(2026, 11, 17, 8))];
    expect(revealForSave({ justAddedId: 9, spine, totalMemories: 2, revealDay: '', firstSeen: false, now })).toEqual({
      first: false,
    });
  });
});
