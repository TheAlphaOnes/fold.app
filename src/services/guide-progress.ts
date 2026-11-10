/**
 * Marks a field-guide mission done from wherever it's actually performed in
 * the app (the composer, stamps, a memory). The guide only ever reads this
 * progress; it never ticks a step for a "next" tap.
 */

import { useSettingsStore, type GuideProgress } from '@/hooks/use-settings';

export function markGuideDone(mission: keyof GuideProgress): void {
  void useSettingsStore.getState().completeGuideStep(mission);
}
