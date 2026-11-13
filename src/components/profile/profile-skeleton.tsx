/**
 * ProfileSkeleton — the profile's lower half while its cards are still being
 * built: the stamp map, the calendar and the activity grid, as quiet
 * placeholders in the same shapes and heights, so the page never shows a
 * blank gap and nothing jumps when the real cards land.
 *
 * Each block breathes on its own clock — different durations and delays — so
 * the wait reads as one surface settling rather than three things blinking in
 * sync. Reduce Motion holds them still.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { almanacCardHeight, almanacCell } from '@/components/almanac/almanac-card';

const CARD_GAP = 24;
const CARD_RADIUS = 10;
const MAP_H = 240;
const GRID_PADDING = 16;
/** The calendar's header and day-of-week rows, as laid out in TECalendar. */
const CALENDAR_HEADER = 44;
const CALENDAR_DOW = 40;
/** The past wall's full-bleed viewport and three uneven masonry columns. */
const PAST_VIEWPORT_HEIGHT = 380;
const PAST_COLUMNS = [
  [142, 96, 168, 118],
  [110, 154, 128, 176],
  [166, 122, 148, 104],
];

/** One block's breathing: its own duration and delay so the three never sync. */
function useBreath(duration: number, delay: number) {
  const reduceMotion = useReducedMotion();
  const value = useSharedValue(0.5);
  useEffect(() => {
    if (reduceMotion) return;
    value.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0.7, { duration, easing: Easing.inOut(Easing.quad) }),
            withTiming(0.35, { duration, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        ),
      ),
    );
  }, [delay, duration, reduceMotion, value]);
  return useAnimatedStyle(() => ({ opacity: value.get() }));
}

function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

/** The stamp map's card: a pin and a caption line, waiting for the map. */
export function MapSkeleton() {
  const theme = useTheme();
  const breath = useBreath(900, 0);
  return (
    <Card style={styles.mapCard}>
      <Animated.View style={[styles.mapInner, breath]}>
        <View style={[styles.mapPin, { borderColor: theme.textMuted }]} />
        <View style={[styles.mapLine, { backgroundColor: theme.textMuted }]} />
      </Animated.View>
    </Card>
  );
}

/** The calendar's card: its header, day-of-week row and this month's grid. */
export function CalendarSkeleton() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const cell = (width - 32) / 7;
  const rows = useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.ceil((firstDay + days) / 7);
  }, []);
  const breath = useBreath(1100, 120);
  return (
    <Card>
      <Animated.View style={breath}>
        <View style={[styles.calendarHeader, { borderBottomColor: theme.border }]}>
          <View style={[styles.calendarTitle, { backgroundColor: theme.textMuted }]} />
        </View>
        <View style={[styles.calendarDow, { borderBottomColor: theme.border }]}>
          {Array.from({ length: 7 }, (_, i) => (
            <View key={i} style={styles.dowCell}>
              <View style={[styles.dowBar, { backgroundColor: theme.textMuted }]} />
            </View>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {Array.from({ length: rows * 7 }, (_, i) => (
            <View key={i} style={[styles.dayCell, { height: cell }]}>
              <View style={[styles.dayDot, { backgroundColor: theme.textMuted }]} />
            </View>
          ))}
        </View>
      </Animated.View>
    </Card>
  );
}

/** The almanac card: its header, this month's rows of dots and its caption line, at its exact height. */
export function ActivitySkeleton() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const days = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }, []);
  const breath = useBreath(1300, 240);
  const cell = almanacCell(width);
  return (
    <Card style={{ height: almanacCardHeight(width, days) }}>
      <Animated.View style={[styles.activityInner, breath]}>
        <View style={[styles.activityLabel, { backgroundColor: theme.textMuted }]} />
        <View style={styles.activityRow}>
          {Array.from({ length: days }, (_, i) => (
            <View key={i} style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
              <View style={[styles.activityCell, { backgroundColor: theme.textMuted }]} />
            </View>
          ))}
        </View>
      </Animated.View>
    </Card>
  );
}

/**
 * The past wall's placeholder: the same full-bleed viewport, three columns,
 * title and shuffle slot as the real wall, so it never opens as empty space.
 */
export function PastWallSkeleton() {
  const theme = useTheme();
  const first = useBreath(1000, 0);
  const second = useBreath(1250, 140);
  const third = useBreath(1450, 280);
  const breaths = [first, second, third];

  return (
    <View style={styles.pastSection} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.pastStage}>
        {PAST_COLUMNS.map((heights, column) => (
          <Animated.View key={column} style={[styles.pastColumn, breaths[column]]}>
            {heights.map((height, index) => (
              <View
                key={index}
                style={[styles.pastTile, { height, backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}
              >
                <View style={[styles.pastTileLine, { backgroundColor: theme.textMuted }]} />
              </View>
            ))}
          </Animated.View>
        ))}
        <View style={[styles.pastShuffle, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]} />
      </View>
      <ThemedText style={[styles.pastTitle, { color: theme.textMuted }]}>FROM YOUR PAST</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: CARD_GAP,
    borderWidth: 1,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  mapCard: {
    height: MAP_H,
  },
  mapInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  mapPin: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  mapLine: {
    width: 64,
    height: 6,
    borderRadius: 3,
  },
  calendarHeader: {
    height: CALENDAR_HEADER,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  calendarTitle: {
    width: 96,
    height: 10,
    borderRadius: 5,
  },
  calendarDow: {
    height: CALENDAR_DOW,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  dowCell: {
    width: '14.2857%',
    alignItems: 'center',
  },
  dowBar: {
    width: 14,
    height: 6,
    borderRadius: 3,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  activityInner: {
    flex: 1,
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  activityCell: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  activityLabel: {
    width: 88,
    height: 8,
    borderRadius: 4,
  },
  pastSection: {
    marginHorizontal: -16,
    marginBottom: 24,
  },
  pastStage: {
    position: 'relative',
    height: PAST_VIEWPORT_HEIGHT,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  pastColumn: {
    flex: 1,
    gap: 6,
  },
  pastTile: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 10,
  },
  pastTileLine: {
    width: 38,
    height: 5,
    borderRadius: 3,
    opacity: 0.35,
  },
  pastShuffle: {
    position: 'absolute',
    top: 10,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pastTitle: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 4,
  },
});
