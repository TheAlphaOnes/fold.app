/**
 * ActivityGrid — the year as a compact heatmap: one column per week, one
 * square per day.
 *
 * Refinements over a plain heatmap:
 *  - four distinct accent levels (1, 2, 3, 4+ memories) instead of a
 *    continuous fade, so busy days read at a glance;
 *  - days already lived are grey, the rest of the year fainter, so "now"
 *    is visible in the grid itself;
 *  - today wears an outline that breathes gently;
 *  - months with writing are labelled in full ink, the rest muted;
 *  - tap a square to open that day.
 *
 * The whole year sits on one line that fits the card exactly, no scrolling:
 * square size is derived from the card width and the year's week count.
 *
 * Counts come from the profile cache (whole year, live memories only).
 *
 * Performance: react-native-svg mounts a native view for every shape, so
 * ~370 <Rect>s were still ~370 views and stalled the profile's slide-in.
 * Squares are grouped by shade instead: one <Path> per fill and opacity,
 * about seven in all, drawing exactly the same grid.
 * Entrance: a card-coloured wipe uncovers the weeks left to right while
 * the month labels and legend fade in on their own, slower clocks.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Share2 } from 'lucide-react-native';

import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from './themed-text';
import { Type } from '@/constants/theme';
import { EASE_OUT, fadeIn } from '@/constants/motion';
import { useProfileDataStore } from '@/hooks/use-profile-data';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { CELL_GAP, buildPanel, formatDate, shadePaths, type Panel } from '@/utils/activity-grid';
import { navigate } from '@/utils/navigation';

const GRID_PADDING = 16;
const LABEL_SIZE = 9;
const LABEL_TRACKING = 0.4;
const LABEL_CHAR = LABEL_SIZE * 0.62;
/** How long the wipe takes to uncover the whole year. */
const WIPE_MS = 520;
const EMPTY_COUNTS: Record<string, number> = {};

function textWidth(text: string): number {
  return text.length * LABEL_CHAR + Math.max(0, text.length - 1) * LABEL_TRACKING;
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

/** Today's square: an accent outline that breathes, so "now" is findable. */
function TodayOutline({ size, left, top }: { size: number; left: number; top: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    glow.set(
      withRepeat(
        withSequence(
          withTiming(0.35, {
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [reduceMotion, glow]);
  const style = useAnimatedStyle(() => ({ opacity: glow.get() }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.todayOutline,
        { width: size + 2, height: size + 2, left: left - 1, top: top - 1, borderColor: theme.accentWarm },
        style,
      ]}
    />
  );
}

/** A card-coloured cover that slides off to the right, uncovering the weeks in order. */
function Wipe({ color, delay }: { color: string; delay: number }) {
  const cover = useSharedValue(1);
  useEffect(() => {
    cover.set(withDelay(delay, withTiming(0, { duration: WIPE_MS, easing: EASE_OUT })));
  }, [cover, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: cover.get() }] }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wipe, { backgroundColor: color }, style]} />;
}

function YearStrip({
  panel,
  cellSize,
  columnPitch,
  activeMonths,
  delayBase,
  reduceMotion,
}: {
  panel: Panel;
  cellSize: number;
  columnPitch: number;
  activeMonths: Set<number>;
  delayBase: number;
  reduceMotion: boolean;
}) {
  const theme = useTheme();
  const ink = theme.accentWarm;
  const { weeks, monthStarts } = panel;

  // One touch target per panel: the tap position picks the day.
  const openDayAt = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const column = weeks[Math.floor((locationX - GRID_PADDING) / columnPitch)];
    const day = column?.[Math.floor(locationY / columnPitch)];
    if (!day || !day.inYear || day.isFuture) return;
    haptic.press();
    navigate.push(`/time-machine?day=${day.date}`);
  };

  const labels = monthStarts.map((ms, i) => {
    const startX = ms.week * columnPitch;
    const endX = (monthStarts[i + 1]?.week ?? weeks.length) * columnPitch;
    const band = Math.max(0, endX - startX);
    const text = band >= textWidth(ms.label) + 4 ? ms.label : ms.label[0];
    return {
      key: ms.label,
      text,
      left: startX + Math.max(0, (band - textWidth(text)) / 2),
      active: activeMonths.has(ms.month),
    };
  });

  const gridWidth = weeks.length * columnPitch - CELL_GAP;
  const gridHeight = 7 * columnPitch - CELL_GAP;
  const todayWeek = weeks.findIndex((days) => days.some((day) => day.isToday));
  const today =
    todayWeek >= 0
      ? { left: todayWeek * columnPitch, top: weeks[todayWeek].findIndex((day) => day.isToday) * columnPitch }
      : null;
  // One path per shade: lit days by level, then lived and future empty days.
  const shades = shadePaths(panel, columnPitch, cellSize);

  return (
    <View>
      <Pressable
        onPress={openDayAt}
        accessibilityRole="button"
        accessibilityLabel="Open a day in the Time Machine"
        style={styles.grid}
      >
        {/* Not a touch target itself, so tap positions are measured from the Pressable. */}
        <View style={{ width: gridWidth, height: gridHeight }} pointerEvents="none">
          <Svg width={gridWidth} height={gridHeight}>
            {[...shades].map(([key, shade]) => (
              <Path key={key} d={shade.d} fill={shade.lit ? ink : theme.textMuted} opacity={shade.opacity} />
            ))}
          </Svg>
          {today && <TodayOutline size={cellSize} left={today.left} top={today.top} />}
          {!reduceMotion && <Wipe color={theme.backgroundElement} delay={delayBase} />}
        </View>
      </Pressable>

      <Animated.View entering={reduceMotion ? undefined : fadeIn(240, delayBase + 160)} style={styles.xLabels}>
        {labels.map((label) => (
          <ThemedText
            key={label.key}
            style={[
              styles.xLabel,
              {
                color: label.active ? theme.text : theme.textMuted,
                left: label.left,
              },
            ]}
          >
            {label.text}
          </ThemedText>
        ))}
      </Animated.View>
    </View>
  );
}

export function ActivityGrid() {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const reduceMotion = useReducedMotion() ?? false;
  const [now] = useState(() => new Date());
  const currentYear = now.getFullYear();
  const todayKey = formatDate(now);

  // From the profile cache: drawn at once, replaced when a refresh lands.
  const cachedCounts = useProfileDataStore((state) => state.dayCounts);
  const cachedYear = useProfileDataStore((state) => state.dayCountsYear);
  const countMap = cachedCounts && cachedYear === currentYear ? cachedCounts : EMPTY_COUNTS;

  const { year, litDays, activeMonths } = useMemo(() => {
    const months = new Set<number>();
    let lit = 0;
    for (const [key, count] of Object.entries(countMap)) {
      if (count > 0 && key.startsWith(`${currentYear}-`)) {
        lit += 1;
        months.add(Number(key.slice(5, 7)) - 1);
      }
    }
    return {
      year: buildPanel(currentYear, 0, 11, countMap, todayKey),
      litDays: lit,
      activeMonths: months,
    };
  }, [countMap, currentYear, todayKey]);

  // Card is inset 16pt from each screen edge; the grid 16pt inside it.
  const innerWidth = width - 32 - GRID_PADDING * 2;
  const columns = year.weeks.length;
  const cellSize = Math.floor(((innerWidth - (columns - 1) * CELL_GAP) / columns) * 10) / 10;
  const columnPitch = cellSize + CELL_GAP;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Activity ${currentYear}. ${litDays} days written.`}
    >
      <YearStrip
        panel={year}
        cellSize={cellSize}
        columnPitch={columnPitch}
        activeMonths={activeMonths}
        delayBase={60}
        reduceMotion={reduceMotion}
      />

      {/* The name signs the card off, so the card reads as one surface. */}
      <Animated.View entering={reduceMotion ? undefined : fadeIn(240, 300)} style={styles.footer}>
        <View style={styles.footerTop}>
          <View style={styles.caption}>
            <ThemedText style={[Type.rail, { color: theme.textMuted }]}>ACTIVITY</ThemedText>
            <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{`· ${pad3(litDays)} DAYS`}</ThemedText>
          </View>
          <Pressable
            onPress={() => {
              haptic.tap();
              navigate.push('/achievement');
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Share your achievement"
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Share2 size={16} color={theme.textMuted} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  grid: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
  },
  todayOutline: {
    position: 'absolute',
    borderRadius: 2.5,
    borderWidth: 1,
  },
  wipe: {
    transformOrigin: 'right',
  },
  xLabels: {
    position: 'relative',
    height: 12,
    marginTop: 10,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  xLabel: {
    position: 'absolute',
    top: 0,
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: LABEL_SIZE,
    letterSpacing: LABEL_TRACKING,
    lineHeight: 12,
  },
  footer: {
    paddingHorizontal: 16,
    // Same 16 as the grid's top, so the card is padded evenly on every side.
    paddingTop: 14,
    paddingBottom: 16,
  },
  footerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
