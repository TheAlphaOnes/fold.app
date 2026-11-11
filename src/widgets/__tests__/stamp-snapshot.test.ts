import { describe, expect, it } from 'vitest';
import { buildStampSnapshot, nextMidnight, snapshotAfterMidnight } from '@/widgets/stamp-snapshot';
import { toDayKey } from '@/utils/format-date';

/** Wednesday, 11 November 2026, early evening — fixed so labels stay stable. */
const NOW = new Date(2026, 10, 11, 19, 30);

/** Day keys for the given offsets from NOW. */
function daysBack(...offsets: number[]): Set<string> {
  return new Set(
    offsets.map((offset) => {
      const day = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - offset);
      return toDayKey(day);
    }),
  );
}

describe('buildStampSnapshot', () => {
  it('shows an open day with a waiting serial when the journal is empty', () => {
    const snapshot = buildStampSnapshot({ activeDays: new Set(), memoryCount: 0, now: NOW });
    expect(snapshot.todayClaimed).toBe(false);
    expect(snapshot.streak).toBe(0);
    expect(snapshot.serial).toBe('No. 001');
    expect(snapshot.title).toBe('today is open');
    expect(snapshot.sub).toBe('fold one memory to begin');
  });

  it('celebrates the day when today is claimed, with the memory just folded as the serial', () => {
    const snapshot = buildStampSnapshot({
      activeDays: daysBack(0, 1, 2),
      memoryCount: 42,
      now: NOW,
    });
    expect(snapshot.todayClaimed).toBe(true);
    expect(snapshot.streak).toBe(3);
    expect(snapshot.serial).toBe('No. 042');
    expect(snapshot.title).toBe('day 03 stamped');
    expect(snapshot.sub).toBe('the streak holds');
  });

  it('holds the streak at stake when today is still unclaimed', () => {
    const snapshot = buildStampSnapshot({ activeDays: daysBack(1, 2), memoryCount: 9, now: NOW });
    expect(snapshot.todayClaimed).toBe(false);
    expect(snapshot.streak).toBe(2);
    expect(snapshot.serial).toBe('No. 010');
    expect(snapshot.title).toBe('day 02 at stake');
    expect(snapshot.sub).toBe('fold one to keep it going');
  });

  it('builds the seven-day strip oldest-first, ending on today with weekday initials', () => {
    const snapshot = buildStampSnapshot({ activeDays: daysBack(1), memoryCount: 1, now: NOW });
    expect(snapshot.days).toHaveLength(7);
    // Nov 5 (Thu) through Nov 11 (Wed): T F S S M T W.
    expect(snapshot.days.map((day) => day.label)).toEqual(['T', 'F', 'S', 'S', 'M', 'T', 'W']);
    expect(snapshot.days[6].isToday).toBe(true);
    expect(snapshot.days[6].claimed).toBe(false);
    expect(snapshot.days[5].claimed).toBe(true);
    expect(snapshot.days.slice(0, 6).every((day) => !day.isToday)).toBe(true);
  });
});

describe('nextMidnight', () => {
  it('lands on the next local midnight, not this one', () => {
    const lateEvening = new Date(2026, 10, 11, 23, 59);
    const midnight = nextMidnight(lateEvening);
    expect(midnight).toEqual(new Date(2026, 10, 12, 0, 0, 0, 0));
    expect(nextMidnight(new Date(2026, 10, 12, 0, 0, 1))).toEqual(new Date(2026, 10, 13));
  });
});

describe('snapshotAfterMidnight', () => {
  it('resets a claimed day but carries the streak, now at stake', () => {
    const claimed = buildStampSnapshot({ activeDays: daysBack(0, 1, 2), memoryCount: 42, now: NOW });
    const morning = snapshotAfterMidnight(claimed, NOW);
    expect(morning.todayClaimed).toBe(false);
    expect(morning.streak).toBe(3);
    expect(morning.title).toBe('day 03 at stake');
    // The strip rolls: yesterday keeps its claim, the new today opens empty.
    expect(morning.days).toHaveLength(7);
    expect(morning.days[6]).toEqual({ claimed: false, isToday: true, label: 'T' }); // Thu, Nov 12
    expect(morning.days[5]).toEqual({ claimed: true, isToday: false, label: 'W' });
    expect(morning.serial).toBe('No. 042');
  });

  it('breaks an unclaimed streak at midnight', () => {
    const open = buildStampSnapshot({ activeDays: daysBack(1), memoryCount: 5, now: NOW });
    const morning = snapshotAfterMidnight(open, NOW);
    expect(morning.streak).toBe(0);
    expect(morning.title).toBe('today is open');
    expect(morning.sub).toBe('fold one memory to begin');
  });
});
