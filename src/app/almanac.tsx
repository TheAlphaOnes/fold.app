/**
 * Almanac — the whole year of doodles, opened from the profile's card.
 * Twelve months in order, each kept day showing its date's doodle; tap a
 * lived day to open it in the Time Machine. The current month boils; the
 * rest stay still, so a full year on screen stays light. Share sends the
 * whole year as one picture (see YearShareCard).
 */

import React, { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Share2 } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlmanacGrid } from '@/components/almanac/almanac-grid';
import { YEAR_CARD_HEIGHT, YEAR_CARD_WIDTH, YearShareCard } from '@/components/almanac/year-share-card';
import { CloseButton } from '@/components/round-button';
import { ThemedText } from '@/components/themed-text';
import { fadeIn } from '@/constants/motion';
import { Type } from '@/constants/theme';
import { MONTH_NAMES, almanacYear } from '@/doodles/almanac';
import { useProfileDataStore } from '@/hooks/use-profile-data';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { goBack, navigate } from '@/utils/navigation';

const EMPTY: Record<string, number> = {};
/** Denser than the card: the year reads as a field of doodles. */
const COLUMNS = 10;

export default function AlmanacScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [now] = useState(() => new Date());
  const year = now.getFullYear();
  const cached = useProfileDataStore((s) => s.dayCounts);
  const cachedYear = useProfileDataStore((s) => s.dayCountsYear);
  const counts = cached && cachedYear === year ? cached : EMPTY;

  const months = useMemo(() => almanacYear(year, counts, now), [counts, now, year]);
  const kept = months.reduce((n, m) => n + m.kept, 0);
  const total = months.reduce((n, m) => n + m.days.length, 0);
  const cell = Math.floor((width - 32) / COLUMNS);
  // Opens on this month, not on January.
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const placed = useRef(false);

  // The year picture is only built while sharing: laid out off screen, then
  // captured once it has drawn.
  const shareRef = useRef<React.ComponentRef<typeof View>>(null);
  const [composing, setComposing] = useState(false);
  const capture = async () => {
    try {
      const uri = await captureRef(shareRef, { format: 'png', quality: 1, width: YEAR_CARD_WIDTH * 3, height: YEAR_CARD_HEIGHT * 3 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { dialogTitle: `Share ${year}`, mimeType: 'image/png' });
    } catch (error) {
      console.warn('Failed to share the year', error);
      Alert.alert('Couldn’t share', 'Please try again.');
    } finally {
      setComposing(false);
    }
  };

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
        <CloseButton onPress={() => goBack('/')} />
        <View style={styles.title}>
          <ThemedText style={[styles.year, { color: theme.text }]}>{String(year)}</ThemedText>
          <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{`ALMANAC · ${String(kept).padStart(3, '0')} / ${total}`}</ThemedText>
        </View>
        <Pressable
          onPress={() => {
            if (composing) return;
            haptic.tap();
            setComposing(true);
          }}
          disabled={composing}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Share ${year} as a picture`}
          style={({ pressed }) => [styles.share, { borderColor: theme.border, opacity: pressed || composing ? 0.5 : 1 }]}
        >
          <Share2 size={16} color={theme.text} />
        </Pressable>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}>
        {months.map((m, i) => (
          <Animated.View
            key={m.month}
            entering={fadeIn(260, 40 + Math.min(i, 4) * 50)}
            style={styles.month}
            onLayout={(e) => {
              if (placed.current || m.month !== now.getMonth()) return;
              placed.current = true;
              scroll.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 12), animated: false });
            }}
          >
            <View style={styles.monthHead}>
              <ThemedText style={[Type.rail, { color: m.month === now.getMonth() ? theme.text : theme.textMuted }]}>{MONTH_NAMES[m.month].toUpperCase()}</ThemedText>
              <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{`${String(m.kept).padStart(2, '0')} / ${m.days.length}`}</ThemedText>
            </View>
            <AlmanacGrid
              days={m.days}
              cell={cell}
              moving={m.month === now.getMonth()}
              onDay={(d) => {
                haptic.press();
                navigate.push(`/time-machine?day=${d.key}`);
              }}
            />
          </Animated.View>
        ))}
      </ScrollView>
      {composing && (
        <View
          style={styles.offscreen}
          pointerEvents="none"
          // Give the doodles a frame to draw before capturing.
          onLayout={() => requestAnimationFrame(() => setTimeout(capture, 120))}
        >
          <YearShareCard ref={shareRef} months={months} year={year} kept={kept} total={total} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title: { alignItems: 'center', gap: 2 },
  year: { fontFamily: 'JetBrainsMono-Medium', fontSize: 15, letterSpacing: 2 },
  share: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  offscreen: { position: 'absolute', left: -10000, top: 0 },
  month: { marginTop: 18 },
  monthHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
});
