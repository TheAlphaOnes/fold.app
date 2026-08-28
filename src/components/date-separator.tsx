import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated, Easing } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { TimelineMode } from '@/hooks/use-settings';

export const DATE_SEPARATOR_HEIGHT = 72;

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

export const DateSeparator = React.memo(function DateSeparator({
  date,
  timelineMode,
}: DateSeparatorProps) {
  const theme = useTheme();
  const { prefix, suffix } = formatSeparatorLabel(date, timelineMode);

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
        useNativeDriver: true,
      }),
      RNAnimated.timing(textTranslate, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Segment 3: accent dot pops in (delay 200, dur 200)
    RNAnimated.sequence([
      RNAnimated.delay(200),
      RNAnimated.spring(dotScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [lineOpacity, textOpacity, textTranslate, dotScale]);

  return (
    <View style={[styles.container, { height: DATE_SEPARATOR_HEIGHT }]}>
      {/* Left hairline */}
      <RNAnimated.View
        style={[styles.line, { backgroundColor: theme.border, opacity: lineOpacity }]}
      />

      <RNAnimated.View
        style={[
          styles.labelContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslate }],
          },
        ]}
      >
        {!!prefix && (
          <>
            <Text
              style={[styles.primaryLabel, { color: theme.textMuted }]}
              allowFontScaling={false}
            >
              {prefix}
            </Text>
            
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
          </>
        )}

        <Text
          style={[styles.primaryLabel, { color: theme.text }]}
          allowFontScaling={false}
        >
          {suffix}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryLabel: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 14,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
