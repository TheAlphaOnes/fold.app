/**
 * Debouncing for taps and navigation, shared across the app.
 *
 * createPressGuard: one control's guard. A tap runs; repeats are dropped
 * until `ms` after it finished (for an async action, after its promise
 * settles), so a double tap never saves twice or opens two sheets.
 *
 * createKeyedGuard: drops the *same* action (same key) repeated within
 * `ms`, while different actions pass. Navigation uses it, so a double tap
 * can't push a screen twice but "save, then go back" still works.
 */

export const PRESS_GUARD_MS = 400;
export const NAV_GUARD_MS = 500;

export function createPressGuard(ms: number = PRESS_GUARD_MS) {
  let busy = false;
  const release = () => {
    setTimeout(() => {
      busy = false;
    }, ms);
  };
  return function run<T>(action: () => T): T | undefined {
    if (busy) return undefined;
    busy = true;
    try {
      const result = action();
      if (result instanceof Promise) result.then(release, release);
      else release();
      return result;
    } catch (error) {
      release();
      throw error;
    }
  };
}

export function createKeyedGuard(ms: number = NAV_GUARD_MS, now: () => number = Date.now) {
  const last = new Map<string, number>();
  return function once(key: string, action: () => void): boolean {
    const t = now();
    const previous = last.get(key);
    if (previous !== undefined && t - previous < ms) return false;
    last.set(key, t);
    action();
    return true;
  };
}
