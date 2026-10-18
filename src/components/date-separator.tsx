/**
 * DateSeparator — the quiet divider between years, months or days in the feed.
 *
 * Its entrance is split into segments that land at different rates: the two
 * hairlines draw outward from the label (left 380ms, right 460ms), the label
 * ticks in character by character like a split-flap readout, and in monthly
 * or daily mode the accent dot pops in last. Respects reduced motion.
 *
 * The date itself rewinds: its digits start at today's and roll back to the
 * divider's own, like an odometer winding back through the years — a small,
 * nostalgic cue for how far into the past you have scrolled. Each digit
 * settles at its own pace; unchanged digits stay still.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { EASE_OUT, SPRING_BOUNCE } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import type { TimelineMode } from '@/hooks/use-settings';

export const DATE_SEPARATOR_HEIGHT = 72;

const CHAR_STAGGER = 35;
const LINE = 18;
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

interface DateSeparatorProps {
  date: Date;
  timelineMode: TimelineMode;
}

function formatSeparatorLabel(date: Date, mode: string): { prefix: string; suffix: string } {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const yyyy = String(date.getFullYear());

  if (mode === 'yearly') {
    return { prefix: '', suffix: yyyy };
  }
  
  if (mode === 'monthly') {
    return { prefix: months[date.getMonth()], suffix: yyyy };
  }

  // Infinite: per-day labels
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dow = days[date.getDay()];
  return { prefix: dow, suffix: `${dd}.${mm}.${yyyy}` };
}

const drawLine = (delay: number, duration: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scaleX: 0 }] },
    100: { opacity: 1, transform: [{ scaleX: 1 }], easing: EASE_OUT },
  })
    .duration(duration)
    .delay(delay);

const tickIn = (delay: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 9 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE_OUT },
  })
    .duration(260)
    .delay(delay);

const dotIn = (delay: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0 }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: SPRING_BOUNCE },
  })
    .duration(260)
    .delay(delay);

/** A single odometer wheel rolling from one digit to another. */
function DigitWheel({ from, to, delay, color }: { from: number; to: number; delay: number; color: string }) {
  const reduceMotion = useReducedMotion();
  const position = useSharedValue(reduceMotion ? to : from);

  useEffect(() => {
    if (reduceMotion || from === to) {
      position.set(to);
      return;
    }
    const distance = Math.abs(to - from);
    position.set(withDelay(delay, withTiming(to, { duration: 420 + distance * 90, easing: Easing.out(Easing.cubic) })));
  }, [from, to, delay, reduceMotion, position]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -position.get() * LINE }] }));

  return (
    <View style={styles.wheel}>
      <Animated.View style={style}>
        {DIGITS.map((digit) => (
          <Animated.Text key={digit} style={[styles.primaryLabel, styles.wheelDigit, { color }]} allowFontScaling={false}>
            {digit}
          </Animated.Text>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * The date, rewinding from today's equivalent label to this one. Digits roll
 * on wheels; separators (dots) simply tick in.
 */
function RewindLabel({ text, presentText, color, startDelay }: { text: string; presentText: string; color: string; startDelay: number }) {
  const chars = Array.from(text);
  const present = Array.from(presentText);
  return (
    <View style={styles.ticker} accessible accessibilityLabel={text}>
      {chars.map((char, index) => {
        const isDigit = /\d/.test(char);
        const delay = startDelay + index * CHAR_STAGGER;
        if (!isDigit) {
          return (
            <Animated.Text
              key={`${index}-${char}`}
              entering={tickIn(delay)}
              style={[styles.primaryLabel, { color }]}
              allowFontScaling={false}
              importantForAccessibility="no"
            >
              {char}
            </Animated.Text>
          );
        }
        const fromChar = present[index];
        const from = fromChar && /\d/.test(fromChar) ? Number(fromChar) : Number(char);
        return (
          <Animated.View key={`${index}-${char}`} entering={tickIn(delay)} importantForAccessibility="no-hide-descendants">
            <DigitWheel from={from} to={Number(char)} delay={delay + 80} color={color} />
          </Animated.View>
        );
      })}
    </View>
  );
}

/** One label rendered as individually ticking characters. */
function TickerLabel({ text, color, startDelay }: { text: string; color: string; startDelay: number }) {
  return (
    <View style={styles.ticker} accessible accessibilityLabel={text}>
      {Array.from(text).map((char, index) => (
        <Animated.Text
          key={`${index}-${char}`}
          entering={tickIn(startDelay + index * CHAR_STAGGER)}
          style={[styles.primaryLabel, { color }]}
          allowFontScaling={false}
          importantForAccessibility="no"
        >
          {char}
        </Animated.Text>
      ))}
    </View>
  );
}

export const DateSeparator = React.memo(function DateSeparator({ date, timelineMode }: DateSeparatorProps) {
  const theme = useTheme();
  const { prefix, suffix } = formatSeparatorLabel(date, timelineMode);
  const suffixDelay = 120 + (prefix ? prefix.length * CHAR_STAGGER + 60 : 0);

  return (
    <View style={[styles.container, { height: DATE_SEPARATOR_HEIGHT }]}>
      <Animated.View
        entering={drawLine(60, 380)}
        style={[styles.line, styles.lineLeft, { backgroundColor: theme.border }]}
      />

      <View style={styles.labelContainer}>
        {!!prefix && (
          <>
            <TickerLabel text={prefix} color={theme.textMuted} startDelay={120} />
            <Animated.View
              entering={dotIn(suffixDelay - 20)}
              style={[styles.dot, { backgroundColor: theme.accentWarm }]}
            />
          </>
        )}
        <RewindLabel
          text={suffix}
          presentText={formatSeparatorLabel(new Date(), timelineMode).suffix}
          color={theme.text}
          startDelay={suffixDelay}
        />
      </View>

      <Animated.View
        entering={drawLine(100, 460)}
        style={[styles.line, styles.lineRight, { backgroundColor: theme.border }]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 21,
    gap: 10,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  // Lines grow outward from the label.
  lineLeft: {
    transformOrigin: 'right',
  },
  lineRight: {
    transformOrigin: 'left',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ticker: {
    flexDirection: 'row',
  },
  primaryLabel: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
    lineHeight: LINE,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  wheel: {
    height: LINE,
    overflow: 'hidden',
  },
  wheelDigit: {
    height: LINE,
  },
});
