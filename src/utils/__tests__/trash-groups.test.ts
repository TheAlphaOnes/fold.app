import { describe, expect, it } from 'vitest';
import { trashSections } from '@/utils/trash-groups';

const DAY = 24 * 60 * 60 * 1000;
const now = 100 * DAY;

describe('trashSections', () => {
  it('groups by day deleted, newest first, in rows of the column count', () => {
    const items = [
      { id: 1, deletedAt: now - 2 * DAY },
      { id: 2, deletedAt: now - 1000 },
      { id: 3, deletedAt: now - 2 * DAY - 5 },
      { id: 4, deletedAt: now - 2 * DAY - 9 },
      { id: 5, deletedAt: now - 2 * DAY - 9 },
      { id: 6, deletedAt: now - DAY },
    ];
    const sections = trashSections(items, now, 3);
    expect(sections.map((s) => s.title)).toEqual(['TODAY', 'YESTERDAY', '2 DAYS AGO']);
    expect(sections[2].rows.map((r) => r.map((i) => i.id))).toEqual([[1, 3, 4], [5]]);
  });

  it('is empty for no items', () => {
    expect(trashSections([], now, 3)).toEqual([]);
  });
});
