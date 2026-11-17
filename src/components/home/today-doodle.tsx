/**
 * TodayDoodle — home's first page: today's doodle, set on the page itself,
 * not in a card. Today is not a memory yet, so it shouldn't wear a memory
 * card's frame.
 *
 *   not yet kept                  kept
 *   ┌──────────────────────┐      ┌──────────────────────┐
 *   │ TUE 17.11   No. 322 ?│      │ TUE 17.11      No. 322│
 *   │                      │      │                      │
 *   │      ( ghosted )     │      │      ( doodle )      │  full colour,
 *   │                      │      │                      │  gently boiling
 *   │ keep today with the  │      │       star anise     │
 *   │        key.          │      │ kept today · 07 this │
 *   │          ↓           │      │              month   │
 *   └──────────────────────┘      └──────────────────────┘
 *
 * The arrow points down at the orange key, the one place that keeps today;
 * there are no second and third capture buttons on the page. Keeping
 * anything earns the doodle (see DoodleReveal on home), and the earned page
 * opens it large in the spotlight.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { BalancedText } from '@/components/balanced-text';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { DayDoodle } from '@/doodles/day-doodle';
import { doodleForDate, serialOf, slotOf } from '@/doodles/library';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface TodayDoodleProps {
  width: number;
  height: number;
  /** Something was kept today: the doodle is earned. */
  kept?: boolean;
  /** Days kept this month, shown on the earned page. */
  monthDays?: number;
  /** Opens the earned doodle large. */
  onOpen?: () => void;
}

export function TodayDoodle({ width, height, kept = false, monthDays, onOpen }: TodayDoodleProps) {
  const theme = useTheme();
  const today = new Date();
  const doodle = doodleForDate(today);
  const art = Math.min(width * 0.66, height * 0.44);
  const stamp = `${DAYS[today.getDay()]} ${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}`;
  const serial = serialOf(slotOf(today));
  const earnedLine = monthDays === undefined ? 'kept today' : `kept today · ${String(monthDays).padStart(2, '0')} this month`;

  const page = (
    <View style={[styles.page, { width: width - 48, height: height - 16 }]}>
      <View style={styles.top}>
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{`${stamp.toUpperCase()} `}</ThemedText>
        <ThemedText style={[Type.rail, { color: kept ? theme.accentWarm : theme.textMuted }]}>
          {kept ? serial.toUpperCase() : `${serial.toUpperCase()} · ?`}
        </ThemedText>
      </View>

      <View
        style={styles.middle}
        accessible
        accessibilityLabel={
          kept ? `Today's doodle: ${doodle.name}` : "Today's doodle, hidden until you keep a moment today"
        }
      >
        {kept ? (
          <Animated.View entering={FadeIn.duration(320)}>
            <DayDoodle doodle={doodle} size={art} moving />
          </Animated.View>
        ) : (
          <View style={{ opacity: 0.22 }}>
            <DayDoodle doodle={doodle} size={art} moving={false} />
          </View>
        )}
      </View>

      {kept ? (
        <Animated.View entering={FadeIn.delay(140).duration(320)} style={styles.earned}>
          <ThemedText style={[styles.name, { color: theme.text }]}>{doodle.name}</ThemedText>
          <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{earnedLine}</ThemedText>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.delay(160).duration(320)} style={styles.bottom}>
          <BalancedText style={[styles.line, { color: theme.textMuted }]}>
            keep today with the key.
          </BalancedText>
          {/* A hand-drawn arrow down to the orange key, the one way in. */}
          <Svg width={48} height={68} viewBox="0 0 48 68" style={styles.arrow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Path
              d="M25 3 C 30 19, 20 35, 25 52"
              stroke={theme.accentWarm}
              strokeWidth={1.8}
              strokeOpacity={0.85}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M16 44 L25 55 L34 44"
              stroke={theme.accentWarm}
              strokeWidth={1.8}
              strokeOpacity={0.85}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
      )}
    </View>
  );

  if (!kept || !onOpen) return page;
  return (
    <Pressable
      onPress={() => {
        haptic.press();
        onOpen();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Today's doodle: ${doodle.name}. Opens it large.`}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {page}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { alignItems: 'center', gap: 6, paddingBottom: 4 },
  line: { fontFamily: 'JetBrainsMono-Regular', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  arrow: { marginTop: 2 },
  earned: { alignItems: 'center', gap: 8, paddingBottom: 14 },
  name: { fontFamily: 'JetBrainsMono-Medium', fontSize: 20 },
});
