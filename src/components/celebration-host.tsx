/**
 * CelebrationHost — mounted once at the root; plays the current moment
 * (useMoments): the screen dims, the sparkle bursts in white, and a short
 * caption rises under it when there is one ("DAY 05", "RESTORED"). Same dim
 * as the share bird, so every small moment in Fold looks alike.
 *
 * Saving or changing a memory (useJournalStore.justAddedId) celebrates
 * automatically.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePathname } from 'expo-router';

import { CelebrationBurst } from '@/components/celebration-burst';
import { MOMENT_INK, MomentDim } from '@/components/moment-dim';
import { ThemedText } from '@/components/themed-text';
import { fadeIn, riseIn } from '@/constants/motion';
import { useJournalStore } from '@/hooks/use-journal';
import { useMoments } from '@/hooks/use-moments';

/**
 * Waits out the screen that's closing (compose sliding away) so the dim
 * lands on the screen underneath, then the burst flashes as the dim peaks.
 * Burst runs 1400ms; the dim holds through it.
 */
const LEAD_MS = 420;
const BURST_DELAY_MS = LEAD_MS + 220;
const DIM_HOLD_MS = 1150;
/** The caption sits in the burst's hollow centre, a little below the middle. */
const CAPTION_OFFSET = 56;

export function CelebrationHost() {
  const moment = useMoments((state) => state.moment);
  const finish = useMoments((state) => state.finish);
  // A save from compose waits until compose has closed, then plays on the
  // screen underneath; the lead below covers the slide-out.
  const pathname = usePathname();
  const waiting = pathname.startsWith('/compose');

  useEffect(
    () =>
      useJournalStore.subscribe((state, previous) => {
        if (state.justAddedId === null || state.justAddedId === previous.justAddedId) return;
        useMoments.getState().celebrate();
        // Consumed: the next save or change can play it again.
        state.setJustAddedId(null);
      }),
    [],
  );

  if (!moment || waiting) return null;

  return (
    <View key={moment.id} style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="none">
      <MomentDim holdMs={DIM_HOLD_MS} delayMs={LEAD_MS} />
      <CelebrationBurst color={MOMENT_INK} delayMs={BURST_DELAY_MS} onComplete={() => finish(moment.id)} />
      {moment.caption && (
        <Animated.View key={moment.caption} entering={riseIn(360, BURST_DELAY_MS, 10)} style={styles.captionWrap}>
          <Animated.View entering={fadeIn(200, BURST_DELAY_MS)}>
            <ThemedText style={styles.caption}>{moment.caption}</ThemedText>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 9500, elevation: 950, alignItems: 'center', justifyContent: 'center' },
  captionWrap: {
    position: 'absolute',
    top: '50%',
    marginTop: CAPTION_OFFSET,
  },
  caption: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 13,
    letterSpacing: 4,
    color: MOMENT_INK,
  },
});
