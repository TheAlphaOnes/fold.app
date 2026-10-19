/**
 * useCountUp — eases a displayed integer from `from` to `to` once, after a
 * delay. Text cannot be driven from the UI thread, so this steps React state
 * per frame; it is meant for one short count, not continuous animation.
 */

import { useEffect, useRef, useState } from 'react';
import { curve } from '@/constants/motion';

interface CountUpOptions {
  delay: number;
  duration: number;
  /** When false the value jumps straight to `to` (reduced motion, nothing to count). */
  animate: boolean;
  onDone?: () => void;
}

export function useCountUp(from: number, to: number, { delay, duration, animate, onDone }: CountUpOptions): number {
  const [value, setValue] = useState(animate ? from : to);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!animate || from === to) {
      setValue(to);
      onDoneRef.current?.();
      return;
    }
    setValue(from);
    let frame = 0;
    let start: number | null = null;
    const timer = setTimeout(() => {
      const step = (now: number) => {
        start ??= now;
        const progress = Math.min(1, (now - start) / duration);
        setValue(Math.round(from + (to - from) * curve.out(progress)));
        if (progress < 1) frame = requestAnimationFrame(step);
        else onDoneRef.current?.();
      };
      frame = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [from, to, delay, duration, animate]);

  return value;
}
