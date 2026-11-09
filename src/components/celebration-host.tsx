/**
 * CelebrationHost — mounted once at the root. Whenever a memory is saved or
 * changed (useJournalStore.justAddedId), the screen dims and the sparkle
 * bursts over it, wherever the user is. Same dim as the share bird, so every
 * small moment in Fold looks alike.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CelebrationBurst } from '@/components/celebration-burst';
import { MOMENT_INK, MomentDim } from '@/components/moment-dim';
import { useJournalStore } from '@/hooks/use-journal';

/** The burst waits 400ms then runs 1400ms; the dim holds through it. */
const DIM_HOLD_MS = 1300;

export function CelebrationHost() {
  const [playing, setPlaying] = useState<number | null>(null);

  useEffect(
    () =>
      useJournalStore.subscribe((state, previous) => {
        if (state.justAddedId === null || state.justAddedId === previous.justAddedId) return;
        setPlaying((n) => (n ?? 0) + 1);
        // Consumed: the next save or change can play it again.
        state.setJustAddedId(null);
      }),
    [],
  );

  if (playing === null) return null;

  return (
    <View key={playing} style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="none">
      <MomentDim holdMs={DIM_HOLD_MS} />
      <CelebrationBurst color={MOMENT_INK} onComplete={() => setPlaying(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 9500, elevation: 950 },
});
