import { useEffect, useMemo } from 'react';
import { useSettingsStore } from './use-settings';
import { useJournalStore } from './use-journal';
import { GUIDE_MISSION_COUNT } from '@/constants/guide';

/**
 * Field-guide mission progress for surfaces outside the guide (the home
 * edge-tab ring). Also credits missions the user has completed naturally —
 * e.g. writing a text memory from the home screen completes "write".
 */
export function useGuideProgress() {
  const { settings, completeGuideStep } = useSettingsStore();
  const compositions = useJournalStore((state) => state.compositions);

  const rawProgress = settings.guideProgress;
  const resetAt = settings.guideResetAt;

  // Auto-sync naturally completed actions based on journal data. Only memories
  // made after the last guide restart count, so "restart field guide" is not
  // immediately undone by older history.
  useEffect(() => {
    if (!compositions || compositions.length === 0) return;

    let hasText = false;
    let hasAudio = false;
    let hasMedia = false;

    for (const c of compositions) {
      if (c.createdAt < resetAt) continue;
      if (!hasText && c.textContent && c.textContent.trim().length > 0) {
        hasText = true;
      }
      if (c.mediaElements && c.mediaElements.length > 0) {
        for (const m of c.mediaElements) {
          if (m.type === 'audio') hasAudio = true;
          if (m.type === 'image' || m.type === 'video') hasMedia = true;
        }
      }
      if (hasText && hasAudio && hasMedia) break;
    }

    if (hasText && !rawProgress.write) {
      completeGuideStep('write');
    }
    if (hasAudio && !rawProgress.voice) {
      completeGuideStep('voice');
    }
    if (hasMedia && !rawProgress.capture) {
      completeGuideStep('capture');
    }
  }, [compositions, rawProgress, resetAt, completeGuideStep]);

  const completedCount = useMemo(() => {
    return Object.values(rawProgress).filter(Boolean).length;
  }, [rawProgress]);

  return {
    progress: rawProgress,
    completedCount,
    totalCount: GUIDE_MISSION_COUNT,
    isAllCompleted: completedCount >= GUIDE_MISSION_COUNT,
  };
}
