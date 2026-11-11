/**
 * AchievementCard — the profile as a card you can send: your name, the
 * Continuum streak, this month's ink, and the whole year as the square
 * heatmap the Activity card draws.
 *
 * Drawn at a fixed layout size so the capture is sharp and looks the same on
 * every phone; the page holds its ref and hands it to react-native-view-shot.
 */

import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Hatch } from '@/components/hatch';
import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { useProfileDataStore } from '@/hooks/use-profile-data';
import { useProgressionStore } from '@/hooks/use-progression';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { CELL_GAP, MONTHS, buildPanel, formatDate, shadePaths } from '@/utils/activity-grid';

const EMPTY_COUNTS: Record<string, number> = {};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatInk(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

interface AchievementCardProps {
  width: number;
  height: number;
}

export const AchievementCard = forwardRef<View, AchievementCardProps>(function AchievementCard({ width, height }, ref) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { current, longest } = useProgressionStore((state) => state.streak);
  const ink = useProgressionStore((state) => state.ink);
  const counts = useProfileDataStore((state) => state.dayCounts);
  const countsYear = useProfileDataStore((state) => state.dayCountsYear);

  const now = new Date();
  const year = now.getFullYear();
  const todayKey = formatDate(now);
  const countMap = counts && countsYear === year ? counts : EMPTY_COUNTS;
  const panel = useMemo(() => buildPanel(year, 0, 11, countMap, todayKey), [year, countMap, todayKey]);

  // The year, sized to the card: one column per week, one square per day.
  const inner = width - 48;
  const columns = panel.weeks.length;
  const cell = Math.floor(((inner - (columns - 1) * CELL_GAP) / columns) * 10) / 10;
  const pitch = cell + CELL_GAP;
  const gridWidth = columns * pitch - CELL_GAP;
  const gridHeight = 7 * pitch - CELL_GAP;
  const shades = useMemo(() => shadePaths(panel, pitch, cell), [panel, pitch, cell]);

  const name = settings.name.trim() || 'ANONYMOUS';
  const live = current > 0;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[styles.card, { width, height, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      accessible
      accessibilityLabel={`Achievement card. ${name}. ${current} day streak, best ${longest}. ${ink.month} ink this month, record ${ink.record}.`}
    >
      {/* The card's own hatch, under everything. */}
      <Hatch color={`${theme.textMuted}1A`} strokeWidth={1} period={9} style={StyleSheet.absoluteFill} />

      {/* A ghost of the mark, big and faint, bleeding off the top-right corner. */}
      <View style={[styles.watermark, { top: -width * 0.1, right: -width * 0.1 }]} pointerEvents="none">
        <Logo size={width * 0.62} color={theme.text} opacity={0.07} />
      </View>

      <View style={styles.content}>
        <View style={styles.rail}>
          <ThemedText style={[Type.rail, { color: theme.textMuted }]}>FOLD</ThemedText>
          <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{`${MONTHS[now.getMonth()]} ${year}`}</ThemedText>
        </View>

        <ThemedText style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {name}
        </ThemedText>

        <View style={styles.figures}>
          <View style={styles.column}>
            <View style={styles.figure}>
              <ThemedText style={[styles.count, { color: live ? theme.text : theme.textMuted }]}>{pad2(current)}</ThemedText>
              <ThemedText style={[styles.unit, { color: live ? theme.accentWarm : theme.textMuted }]}>
                {current === 1 ? 'day' : 'days'}
              </ThemedText>
            </View>
            <ThemedText style={[styles.best, { color: theme.textMuted }]}>{`best ${longest}`}</ThemedText>
          </View>
          <View style={[styles.column, styles.columnEnd]}>
            <View style={styles.figure}>
              <ThemedText style={[styles.unit, { color: ink.month > 0 ? theme.accentWarm : theme.textMuted }]}>ink</ThemedText>
              <ThemedText style={[styles.count, { color: ink.month > 0 ? theme.text : theme.textMuted }]}>
                {formatInk(ink.month)}
              </ThemedText>
            </View>
            <ThemedText style={[styles.best, { color: theme.textMuted }]}>{`record ${formatInk(ink.record)}`}</ThemedText>
          </View>
        </View>

        <View style={styles.gridBlock}>
          <View style={{ width: gridWidth, height: gridHeight }}>
            <Svg width={gridWidth} height={gridHeight}>
              {[...shades].map(([key, shade]) => (
                <Path key={key} d={shade.d} fill={shade.lit ? theme.accentWarm : theme.textMuted} opacity={shade.opacity} />
              ))}
            </Svg>
          </View>
          <View style={styles.months}>
            {panel.monthStarts.map((month) => (
              <ThemedText key={month.label} style={[styles.month, { color: theme.textMuted }]}>
                {month.label}
              </ThemedText>
            ))}
          </View>
        </View>
      </View>

      {/* The signature band: the card's hatch runs through it, with room around the mark. */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View style={styles.footerRow}>
          <ThemedText style={[styles.footerText, { color: theme.textMuted }]}>MADE WITH FOLD</ThemedText>
          <Logo size={30} color={theme.text} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  rail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 20,
    letterSpacing: 1,
  },
  figures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontSize: 40,
    lineHeight: 44,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 14,
    letterSpacing: 1,
    lineHeight: 20,
  },
  best: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 16,
  },
  gridBlock: {
    gap: 10,
  },
  months: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  month: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 7,
    letterSpacing: 0.4,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 2.5,
  },
});
