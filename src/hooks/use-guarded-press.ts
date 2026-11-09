/**
 * useGuardedPress — wraps a press handler so repeat taps are dropped
 * (see createPressGuard): a double tap runs it once, and an async handler
 * (save, share) can't start again until it has finished.
 */

import { useCallback, useState } from 'react';

import { PRESS_GUARD_MS, createPressGuard } from '@/utils/press-guard';

export function useGuardedPress<A extends unknown[]>(handler: ((...args: A) => unknown) | undefined, ms: number = PRESS_GUARD_MS) {
  // One guard per control, kept for its lifetime.
  const [run] = useState(() => createPressGuard(ms));
  return useCallback(
    (...args: A) => {
      if (handler) run(() => handler(...args));
    },
    [handler, run],
  );
}
