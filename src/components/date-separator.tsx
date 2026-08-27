import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { TimelineMode } from '@/hooks/use-settings';

export const DATE_SEPARATOR_HEIGHT = 72;

interface DateSeparatorProps {
  date: Date;
  timelineMode: TimelineMode;
}

function formatSeparatorLabel(date: Date, mode: TimelineMode): { primary: string; secondary: string } {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  if (mode === 'yearly') {
    return {
      primary: String(date.getFullYear()),
      secondary: months[date.getMonth()],
    };
  }

  if (mode === 'monthly') {
    return {
      primary: months[date.getMonth()],
      secondary: String(date.getFullYear()),
    };
  }

  // Infinite: per-day labels
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  const dow = days[date.getDay()];
  return {
    primary: `${dd}.${mm}.${yyyy}`,
    secondary: dow,
  };
}

export const DateSeparator = React.memo(function DateSeparator({
  date,
  timelineMode,
}: DateSeparatorProps) {
  const theme = useTheme();
  const { primary, secondary } = formatSeparatorLabel(date, timelineMode);

  // Three staggered animation segments so the separator feels alive, not monotonous
  const lineOpacity = useRef(new RNAnimated.Value(0)).current;
  const textTranslate = useRef(new RNAnimated.Value(6)).current;
  const textOpacity = useRef(new RNAnimated.Value(0)).current;
  const dotScale = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    // Segment 1: hairline fades in (0–180ms)
    RNAnimated.timing(lineOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    // Segment 2: label slides up from slight offset (80–300ms)
    RNAnimated.parallel([
      RNAnimated.timing(textOpacity, {
        toValue: 1,
        duration: 220,
        delay: 80,
        useNativeDriver: true,
      }),
      RNAnimated.spring(textTranslate, {
        toValue: 0,
        delay: 80,
        damping: 18,
        stiffness: 260,
        useNativeDriver: true,
      }),
    ]).start();

    // Segment 3: accent dot pops in last (200ms)
    RNAnimated.spring(dotScale, {
      toValue: 1,
      delay: 200,
      damping: 12,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={[styles.container, { height: DATE_SEPARATOR_HEIGHT }]}>
      {/* Left hairline */}
      <RNAnimated.View
        style={[styles.line, { backgroundColor: theme.border, opacity: lineOpacity }]}
      />

      {/* Accent dot */}
      <RNAnimated.View
        style={[
          styles.dot,
          {
            backgroundColor: theme.accentWarm,
            transform: [{ scale: dotScale }],
          },
        ]}
      />

      {/* Date labels */}
      <RNAnimated.View
        style={[
          styles.labelContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslate }],
          },
        ]}
      >
        <Text
          style={[styles.primaryLabel, { color: theme.text }]}
          allowFontScaling={false}
        >
          {primary}
        </Text>
        <Text
          style={[styles.secondaryLabel, { color: theme.textMuted }]}
          allowFontScaling={false}
        >
          {secondary}
        </Text>
      </RNAnimated.View>

      {/* Right hairline */}
      <RNAnimated.View
        style={[styles.line, { backgroundColor: theme.border, opacity: lineOpacity }]}
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
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  labelContainer: {
    alignItems: 'center',
    gap: 2,
  },
  primaryLabel: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  secondaryLabel: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
