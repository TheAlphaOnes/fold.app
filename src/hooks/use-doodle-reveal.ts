/**
 * useDoodleReveal — watches the journal for the first memory kept on a day
 * and raises the doodle reveal once that day. The decision is pure (see
 * `doodles/reveal.ts`); this hook only gathers the journal and the settings,
 * and the reveal itself is drawn by DoodleReveal.
 */

import { useEffect } from 'react';
import { useIsFocused } from 'expo-router';
import { create } from 'zustand';

import { revealForSave, type RevealDecision } from '@/doodles/reveal';
import { useJournalStore } from '@/hooks/use-journal';
import { useSettingsStore } from '@/hooks/use-settings';
import { haptic } from '@/services/haptics';
import { toDayKey } from '@/utils/format-date';

interface DoodleRevealState {
  reveal: RevealDecision | null;
  show: (reveal: RevealDecision) => void;
  dismiss: () => void;
}

export const useDoodleRevealStore = create<DoodleRevealState>((set) => ({
  reveal: null,
  show: (reveal) => set({ reveal }),
  dismiss: () => set({ reveal: null }),
}));

export function useDoodleReveal(): void {
  const focused = useIsFocused();
  const justAddedId = useJournalStore((state) => state.justAddedId);
  const spine = useJournalStore((state) => state.timelineSpine);
  const totalMemories = useJournalStore((state) => state.totalMemories);
  const revealDay = useSettingsStore((state) => state.settings.doodleRevealDay);
  const firstSeen = useSettingsStore((state) => state.settings.firstDoodleSeen);

  useEffect(() => {
    // Home only: the reveal waits for the composer to close, then plays on
    // the screen underneath.
    if (!focused) return;
    const now = new Date();
    const decision = revealForSave({ justAddedId, spine, totalMemories, revealDay, firstSeen, now });
    if (!decision) return;

    useDoodleRevealStore.getState().show(decision);
    haptic.success();
    const { updateSetting } = useSettingsStore.getState();
    // Marked at once, so a re-render or a second save never replays it.
    void updateSetting('doodleRevealDay', toDayKey(now));
    if (decision.first) void updateSetting('firstDoodleSeen', true);
  }, [focused, justAddedId, spine, totalMemories, revealDay, firstSeen]);
}
