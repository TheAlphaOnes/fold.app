/**
 * useAudioFocus — one sound at a time, across the whole app.
 *
 * Every player that can make sound (timeline cards, canvas stickers, the
 * full-screen memory, the music picker's preview) calls `claim()` right
 * before it plays. Whoever held focus is paused first. Without this, a
 * card on the home timeline kept playing under a memory opened on top of
 * it, and the two played together.
 */

import { useCallback, useEffect, useRef } from 'react';

interface FocusOwner {
  token: object;
  pause: () => void;
}

let current: FocusOwner | null = null;

/** `pause` must stop this player's sound; it is called when another player claims focus. */
export function useAudioFocus(pause: () => void): () => void {
  // A stable identity per component instance.
  const tokenRef = useRef<object>({});
  const pauseRef = useRef(pause);
  pauseRef.current = pause;

  useEffect(() => {
    const token = tokenRef.current;
    return () => {
      if (current?.token === token) current = null;
    };
  }, []);

  return useCallback(() => {
    const token = tokenRef.current;
    if (current && current.token !== token) {
      try {
        current.pause();
      } catch (error) {
        // The previous player may already have been released by its screen.
        console.warn('Failed to pause the previous player', error);
      }
    }
    current = { token, pause: () => pauseRef.current() };
  }, []);
}
