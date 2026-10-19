/**
 * ContinuumCard — the profile's one progress card. The streak reads on the
 * left; this month's ink reads on the right and counts up from what was
 * last seen here. Ink starts empty on the 1st; the best month stands as
 * the record in the footer.
 *
 * Entrance segments finish at different rates: the rail fades, the track
 * marks grow, the ink counts, the factors rise one by one, the footer last.
 */

import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ContinuumTrack, useContinuumWindow } from '@/components/continuum/continuum-track';
import { InkFactors, describeFactors } from '@/components/continuum/ink-factors';
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

/** "2026-10" → "OCTOBER". */
function monthName(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return '';
  return new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' }).toUpperCase();
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

export function ContinuumCard() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion() ?? false;

  // Read from the progression store: it sees every memory's day, not just
  // the latest page the profile happens to have loaded.
  const activeDays = useProgressionStore((state) => state.activeDays);
  const { current: currentStreak, longest: longestStreak } = useProgressionStore((state) => state.streak);
  const ink = useProgressionStore((state) => state.ink);
  const shownInk = useInkCount(reduceMotion);
  const days = useContinuumWindow(activeDays, currentStreak);

  const live = currentStreak > 0;
  const streakInk = live ? theme.accentWarm : theme.textMuted;
  const unit = currentStreak === 1 ? 'day' : 'days';
  const bestUnit = longestStreak === 1 ? 'DAY' : 'DAYS';
  const month = monthName(ink.monthKey);
  const isRecordMonth = ink.record > 0 && ink.month >= ink.record;

  const spoken =
    `Continuum, ${currentStreak} ${unit}, best ${longestStreak}. ` +
    `${ink.month} ink this ${month.toLowerCase() || 'month'}, ${ink.today} today: ${describeFactors(ink.todayEarned)}. ` +
    `Record month ${ink.record} ink.`;

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
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{`BEST ${longestStreak} ${bestUnit}`}</ThemedText>
      </Animated.View>

      <ContinuumTrack days={days} color={streakInk} idleColor={theme.border} reduceMotion={reduceMotion} />

      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.delay(160).duration(280).easing(EASE_OUT)}
        style={s.readout}
      >
        <View style={s.figure}>
          <ThemedText style={[s.count, { color: live ? theme.text : theme.textMuted }]}>{pad2(currentStreak)}</ThemedText>
          <ThemedText style={[s.unit, { color: streakInk }]}>{unit}</ThemedText>
        </View>
        <View style={s.figure}>
          <ThemedText style={[s.count, { color: ink.month > 0 ? theme.text : theme.textMuted }]}>
            {formatInk(shownInk)}
          </ThemedText>
          <ThemedText style={[s.unit, { color: ink.month > 0 ? theme.accentWarm : theme.textMuted }]}>ink</ThemedText>
        </View>
      </Animated.View>

      <InkFactors
        earned={ink.todayEarned}
        accent={theme.accentWarm}
        muted={theme.textMuted}
        border={theme.border}
        delay={240}
        reduceMotion={reduceMotion}
      />

      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.delay(COUNT_DELAY_MS + COUNT_DURATION_MS * 0.6).duration(320).easing(EASE_OUT)}
        style={[s.footer, { borderTopColor: theme.border }]}
      >
        <ThemedText style={[Type.rail, s.footerText, { color: theme.textMuted }]} numberOfLines={1}>
          {month}
          {ink.today > 0 && <ThemedText style={[Type.rail, { color: theme.accentWarm }]}>{`  +${ink.today}`}</ThemedText>}
        </ThemedText>
        <ThemedText
          style={[Type.rail, s.footerText, { color: isRecordMonth ? theme.accentWarm : theme.textMuted }]}
          numberOfLines={1}
        >
          {`RECORD ${formatInk(ink.record)}`}
        </ThemedText>
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
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  footerText: {
    letterSpacing: 2,
    flexShrink: 1,
  },
});
