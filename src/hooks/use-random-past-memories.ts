import { useCallback } from 'react';
import { useProfileDataStore } from '@/hooks/use-profile-data';

/**
 * A random sample of past memories from the profile cache: shown at once,
 * redrawn when the journal changes or on reshuffle(). The previous sample
 * stays on screen until the next one is ready, so a reshuffle never flashes.
 */
export function useRandomPastMemories() {
  const memories = useProfileDataStore((state) => state.pastMemories);
  const sampleId = useProfileDataStore((state) => state.pastSampleId);
  const reshufflePast = useProfileDataStore((state) => state.reshufflePast);
  const reshuffle = useCallback(() => void reshufflePast(), [reshufflePast]);

  return { memories: memories ?? [], loaded: memories !== null, sampleId, reshuffle };
}
