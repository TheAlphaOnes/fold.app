/**
 * useScrambleText — when the text changes, each character flickers through
 * random glyphs and settles on its letter, left to right, every one at its
 * own moment (a split-flap board, not a fade). Monospaced, so nothing
 * shifts while it runs. Instant under Reduce Motion.
 */

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const FRAME_MS = 34;
/** When character i settles: a lead-in, a step per character, and a little jitter. */
const LEAD_MS = 60;
const STEP_MS = 24;
const JITTER_MS = 70;

export function useScrambleText(target: string): string {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    if (reduced || from.current === target) {
      from.current = target;
      return;
    }
    const length = Math.max(from.current.length, target.length);
    const padded = target.padEnd(length, ' ');
    const settle = Array.from({ length }, (_, i) => LEAD_MS + i * STEP_MS + Math.random() * JITTER_MS);
    const start = Date.now();
    const timer = setInterval(() => {
      const t = Date.now() - start;
      let done = true;
      let out = '';
      for (let i = 0; i < length; i++) {
        const ch = padded[i];
        if (t >= settle[i] || ch === ' ') out += ch;
        else {
          done = false;
          out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }
      setShown(done ? target : out);
      if (done) clearInterval(timer);
    }, FRAME_MS);
    from.current = target;
    return () => clearInterval(timer);
  }, [target, reduced]);

  return reduced ? target : shown;
}
