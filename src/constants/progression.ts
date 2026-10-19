/**
 * Progression — the daily goal and the reward moments built on it.
 * Kept as data so later phases (missions, ranks, unlocks) extend one table.
 */

/** Memories a day that meet the goal. One is the default: the first win is easy. */
export const DAILY_GOAL_OPTIONS = [1, 3, 5] as const;
export type DailyGoal = (typeof DAILY_GOAL_OPTIONS)[number];
export const DEFAULT_DAILY_GOAL: DailyGoal = 1;

export function isDailyGoal(value: number): value is DailyGoal {
  return (DAILY_GOAL_OPTIONS as readonly number[]).includes(value);
}

export function nextDailyGoal(current: DailyGoal): DailyGoal {
  const index = DAILY_GOAL_OPTIONS.indexOf(current);
  return DAILY_GOAL_OPTIONS[(index + 1) % DAILY_GOAL_OPTIONS.length];
}

/** A moment queued for the reward overlay, played in order on the home screen. */
export type Reward = {
  id: string;
  kind: 'daily-goal';
  goal: DailyGoal;
  /** Continuum length including today. */
  streak: number;
};
