import type { TemplateId } from '@/canvas/types';
import { GRID_LAYOUTS } from '@/templates/grids';
import { gridIdOf, isGrid } from '@/templates/registry';

/** Today's page: a soft line for the time of day, in the app's lowercase voice. Pure, so it's tested. */
export function dayLine(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'the quiet hours';
  if (h < 11) return 'first light';
  if (h < 16) return 'the middle of it';
  if (h < 20) return 'golden hour, almost';
  return 'before it ends';
}


/** Most photos a free (not fixed) template takes from today's camera. */
export const FREE_SHOTS = 6;

/**
 * How many photos a template takes from today's camera.
 *   grids: exactly one per cell; the composer opens when the last is taken
 *   canvas, text: one, which opens at once
 *   stickers, slideshow, arrangements: up to FREE_SHOTS, finished with Done
 */
export function shotsFor(template: TemplateId): { max: number; fixed: boolean } {
  if (isGrid(template)) {
    const layout = GRID_LAYOUTS.find((g) => g.id === gridIdOf(template));
    return { max: layout?.cells.length ?? 1, fixed: true };
  }
  if (template === 'story' || template === 'text') return { max: 1, fixed: true };
  return { max: FREE_SHOTS, fixed: false };
}

/** Today's sky: a top and bottom colour for the time of day, and whether ink on it reads light. */
export interface Sky {
  top: string;
  bottom: string;
  /** Text and controls sit in white on this sky. */
  dark: boolean;
}

/** The sky behind today's page, following the same hours as `dayLine`. Pure, so it's tested. */
export function skyFor(now = new Date()): Sky {
  const h = now.getHours();
  if (h < 5) return { top: '#070B1F', bottom: '#1E2350', dark: true };
  if (h < 11) return { top: '#F9D9B8', bottom: '#F4EDE2', dark: false };
  if (h < 16) return { top: '#9CCBEA', bottom: '#EAF4F9', dark: false };
  if (h < 20) return { top: '#FF5A12', bottom: '#FFB66B', dark: false };
  return { top: '#120B24', bottom: '#3A1F4F', dark: true };
}
