import type { Story } from '@/types/journal';

export type StorySort = 'recent' | 'oldest' | 'alpha' | 'size';

export const STORY_SORTS: readonly { id: StorySort; label: string }[] = [
  { id: 'recent', label: 'RECENT' },
  { id: 'oldest', label: 'OLDEST' },
  { id: 'alpha', label: 'A–Z' },
  { id: 'size', label: 'MOST MEMORIES' },
];

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "12 MEMORIES", "1 MEMORY", "EMPTY". */
export function memoryCountLabel(story: Story): string {
  const count = story.memoryCount ?? 0;
  if (count === 0) return 'EMPTY';
  return count === 1 ? '1 MEMORY' : `${count} MEMORIES`;
}

/** The span a story covers: "OCT 2026", "MAR – OCT 2026", "NOV 2025 – OCT 2026". */
export function storySpanLabel(story: Story): string | null {
  if (!story.firstMemoryAt || !story.lastMemoryAt) return null;
  const first = new Date(story.firstMemoryAt);
  const last = new Date(story.lastMemoryAt);
  const sameYear = first.getFullYear() === last.getFullYear();
  if (sameYear && first.getMonth() === last.getMonth()) {
    return `${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
  }
  if (sameYear) return `${MONTHS[first.getMonth()]} – ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
  return `${MONTHS[first.getMonth()]} ${first.getFullYear()} – ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
}

/** The newest moment a story was touched: its last memory or its own edit. */
function activityOf(story: Story): number {
  return Math.max(story.updatedAt, story.lastMemoryAt ?? 0);
}

export function sortStories(stories: Story[], sort: StorySort): Story[] {
  const sorted = [...stories];
  switch (sort) {
    case 'recent':
      return sorted.sort((a, b) => activityOf(b) - activityOf(a));
    case 'oldest':
      return sorted.sort((a, b) => (a.firstMemoryAt ?? a.createdAt) - (b.firstMemoryAt ?? b.createdAt));
    case 'alpha':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'size':
      return sorted.sort((a, b) => (b.memoryCount ?? 0) - (a.memoryCount ?? 0) || activityOf(b) - activityOf(a));
  }
}

export function searchStories(stories: Story[], query: string): Story[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return stories;
  return stories.filter((story) => story.title.toLowerCase().includes(needle));
}
