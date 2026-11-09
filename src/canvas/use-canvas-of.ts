/**
 * A memory's canvas for display. Saved layouts come straight from the
 * memory; older memories are converted against the card size their pixel
 * positions were made for (this phone's feed card), so they look as before.
 */

import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import type { CanvasDoc } from '@/canvas/types';
import { canvasOf, type LegacyCard } from '@/templates/legacy';
import type { Composition } from '@/types/journal';

/** The feed card size before templates (21pt gutters, golden-ratio height capped at 78%). */
export function legacyCardFor(width: number, height: number): LegacyCard {
  return { width: width - 42, height: Math.min(width * 1.618, height * 0.78) };
}

export function useCanvasOf(memory: Composition | null | undefined): CanvasDoc | null {
  const { width, height } = useWindowDimensions();
  return useMemo(
    () => (memory ? canvasOf(memory, legacyCardFor(width, height)) : null),
    // Recompute when the memory's content changes, not on every new object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memory?.id, memory?.layout, memory?.mediaElements, memory?.textContent, memory?.fontFamily, memory?.fontSize, memory?.textColor, width, height],
  );
}
