/**
 * ContinuumCard — the profile's one progress card. The streak reads on the
 * left with its best run beneath; this month's ink reads on the right with
 * the record month beneath, counting up from what was last seen here. Ink
 * starts empty on the 1st.
 *
 * Entrance segments finish at different rates: the rail fades, the track
 * marks grow, the numbers fade in, the ink counts, the bests arrive last.
 */

import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ContinuumTrack, useContinuumWindow } from '@/components/continuum/continuum-track';
import { EASE_OUT } from '@/constants/motion';
import { Type } from '@/constants/theme';
import { useCountUp } from '@/hooks/use-count-up';
import { useProgressionStore } from '@/hooks/use-progression';
import { useTheme } from '@/hooks/use-theme';

const COUNT_DELAY_MS = 320;
const COUNT_DURATION_MS = 900;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatInk(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Counts this month's ink up from the value last seen, then marks it seen. */
function useInkCount(reduceMotion: boolean): number {
  const ink = useProgressionStore((state) => state.ink);
  const seenInk = useProgressionStore((state) => state.seenInk);
  const markInkSeen = useProgressionStore((state) => state.markInkSeen);

  // Fixed for the card's lifetime, so marking ink seen does not restart the
  // count. A new month counts from zero.
  const fromRef = useRef<number | null>(null);
  if (fromRef.current === null && seenInk !== null) {
    fromRef.current = seenInk.monthKey === ink.monthKey ? Math.min(seenInk.value, ink.month) : 0;
  }

  return useCountUp(fromRef.current ?? ink.month, ink.month, {
    delay: COUNT_DELAY_MS,
    duration: COUNT_DURATION_MS,
    animate: !reduceMotion && seenInk !== null,
    // Until the stored value is read, there is nothing to mark.
    onDone: seenInk !== null ? markInkSeen : undefined,
  });
}

/**
 * The ink number on its own, so the count-up re-renders one Text per frame
 * rather than the whole card and its 21 track marks.
 */
function InkCount({ reduceMotion, color }: { reduceMotion: boolean; color: string }) {
  const shown = useInkCount(reduceMotion);
  return <ThemedText style={[s.count, { color }]}>{formatInk(shown)}</ThemedText>;
}

export function ContinuumCard() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion() ?? false;

  // Read from the progression store: it sees every memory's day, not just
  // the latest page the profile happens to have loaded.
  const activeDays = useProgressionStore((state) => state.activeDays);
  const { current: currentStreak, longest: longestStreak } = useProgressionStore((state) => state.streak);
  const ink = useProgressionStore((state) => state.ink);
  // The bests land once the ink has mostly counted.
  const bestEntering = reduceMotion
    ? undefined
    : FadeIn.delay(COUNT_DELAY_MS + COUNT_DURATION_MS * 0.6).duration(320).easing(EASE_OUT);
  const days = useContinuumWindow(activeDays, currentStreak);

  const live = currentStreak > 0;
  const streakInk = live ? theme.accentWarm : theme.textMuted;
  const unit = currentStreak === 1 ? 'day' : 'days';
  const isRecordMonth = ink.record > 0 && ink.month >= ink.record;

  const spoken =
    `Continuum, ${currentStreak} ${unit}, best ${longestStreak}. ` +
    `${ink.month} ink this month, record ${ink.record}.`;

  return (
    <View
      style={[s.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={spoken}
    >
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(220).easing(EASE_OUT)}
        style={s.rail}
      >
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>CONTINUUM</ThemedText>
      </Animated.View>

      <ContinuumTrack days={days} color={streakInk} idleColor={theme.border} reduceMotion={reduceMotion} />

      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.delay(160).duration(280).easing(EASE_OUT)}
        style={s.readout}
      >
        <View style={s.column}>
          <View style={s.figure}>
            <ThemedText style={[s.count, { color: live ? theme.text : theme.textMuted }]}>{pad2(currentStreak)}</ThemedText>
            <ThemedText style={[s.unit, { color: streakInk }]}>{unit}</ThemedText>
          </View>
          <Animated.View entering={bestEntering}>
            <ThemedText style={[s.best, { color: theme.textMuted }]}>{`best ${longestStreak}`}</ThemedText>
          </Animated.View>
        </View>
        <View style={[s.column, s.columnEnd]}>
          <View style={s.figure}>
            <InkCount reduceMotion={reduceMotion} color={ink.month > 0 ? theme.text : theme.textMuted} />
            <ThemedText style={[s.unit, { color: ink.month > 0 ? theme.accentWarm : theme.textMuted }]}>ink</ThemedText>
          </View>
          <Animated.View entering={bestEntering}>
            <ThemedText style={[s.best, { color: isRecordMonth ? theme.accentWarm : theme.textMuted }]}>
              {`record ${formatInk(ink.record)}`}
            </ThemedText>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  rail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  readout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  column: {
    gap: 4,
  },
  columnEnd: {
    alignItems: 'flex-end',
  },
  figure: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  count: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 32,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 13,
    letterSpacing: 1,
    lineHeight: 18,
  },
  best: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 16,
  },
});
