/**
 * The hold menu's state: which memory it's open for. Any card opens it with
 * open(); the one MemoryActionsHost at the root renders the menu, so it looks
 * and behaves the same everywhere in the app.
 */

import { create } from 'zustand';
import type { Composition } from '@/types/journal';

interface OpenOptions {
  /** Card height as drawn where it was held, for the shared image. */
  cardHeight: number;
  /** Called after the card is shared (the Field Guide listens for this). */
  onShared?: () => void;
}

interface MemoryActionsState {
  memory: Composition | null;
  options: OpenOptions | null;
  open: (memory: Composition, options: OpenOptions) => void;
  close: () => void;
}

export const useMemoryActions = create<MemoryActionsState>((set) => ({
  memory: null,
  options: null,
  open: (memory, options) => set({ memory, options }),
  close: () => set({ memory: null }),
}));
