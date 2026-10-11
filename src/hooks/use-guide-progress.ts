import { useEffect, useMemo } from 'react';
import { useSettingsStore, type GuideProgress } from './use-settings';
import { useJournalStore } from './use-journal';

export interface GuideMission {
  id: keyof GuideProgress;
  title: string;
  subtitle: string;
  actionHint: string;
  isCompleted: boolean;
}

export function useGuideProgress() {
  const { settings, completeGuideStep } = useSettingsStore();
  const compositions = useJournalStore((state) => state.compositions);

  const rawProgress = settings.guideProgress;

  // Auto-sync naturally completed actions based on journal data
  useEffect(() => {
    if (!compositions || compositions.length === 0) return;

    let hasText = false;
    let hasAudio = false;
    let hasMedia = false;

    for (const c of compositions) {
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
  }, [compositions, rawProgress, completeGuideStep]);

  const missions: GuideMission[] = useMemo(() => [
    {
      id: 'write',
      title: 'TAP TO WRITE',
      subtitle: 'Compose your first thought, moment, or memory.',
      actionHint: 'Tap orange + button',
      isCompleted: rawProgress.write,
    },
    {
      id: 'voice',
      title: 'HOLD TO RECORD',
      subtitle: 'Press and hold to start high-fidelity TP-7 voice capture.',
      actionHint: 'Long press orange + button',
      isCompleted: rawProgress.voice,
    },
    {
      id: 'capture',
      title: 'SWIPE TO CAPTURE',
      subtitle: 'Swipe up orange trigger past the notch for instant photo capture.',
      actionHint: 'Swipe up from orange + button',
      isCompleted: rawProgress.capture,
    },
    {
      id: 'inspect',
      title: 'DOUBLE TAP TO OPEN',
      subtitle: 'Quick double-tap on any memory card to view full details.',
      actionHint: 'Double tap memory card',
      isCompleted: rawProgress.inspect,
    },
    {
      id: 'share',
      title: 'HOLD CARD TO SHARE',
      subtitle: 'Long press a memory to generate a print-ready export card.',
      actionHint: 'Long press memory card',
      isCompleted: rawProgress.share,
    },
    {
      id: 'stickers',
      title: 'STICKER CANVAS',
      subtitle: 'Hold to lift, drag to place, and pinch to resize stickers.',
      actionHint: 'Hold & pinch sticker',
      isCompleted: rawProgress.stickers,
    },
    {
      id: 'stories',
      title: 'STORY CHAPTERS',
      subtitle: 'Tag memories with [📖] Book icon to curate permanent story archives.',
      actionHint: 'Tag a story chapter',
      isCompleted: rawProgress.stories,
    },
  ], [rawProgress]);

  const completedCount = useMemo(() => {
    return Object.values(rawProgress).filter(Boolean).length;
  }, [rawProgress]);

  const totalCount = 7;
  const isAllCompleted = completedCount === totalCount;

  return {
    progress: rawProgress,
    missions,
    completedCount,
    totalCount,
    isAllCompleted,
    completeStep: completeGuideStep,
  };
}
