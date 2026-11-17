/**
 * useYearShare — shares the whole year as one picture (YearShareCard).
 * `share()` mounts the card off screen; once it has laid out and drawn, it
 * is captured at 3× and handed to the share sheet, then unmounted. Render
 * `element` anywhere in the screen. Used by the profile card and the year
 * screen, so both share exactly the same picture.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { YEAR_CARD_HEIGHT, YEAR_CARD_WIDTH, YearShareCard } from '@/components/almanac/year-share-card';
import { almanacYear } from '@/doodles/almanac';
import { useProfileDataStore } from '@/hooks/use-profile-data';
import { track } from '@/services/analytics';
import { haptic } from '@/services/haptics';

const EMPTY: Record<string, number> = {};

export function useYearShare(): { share: () => void; sharing: boolean; element: React.ReactNode } {
  const [sharing, setSharing] = useState(false);
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const cached = useProfileDataStore((s) => s.dayCounts);
  const cachedYear = useProfileDataStore((s) => s.dayCountsYear);

  // Built only while sharing, from the counts as they are at that moment.
  const card = useMemo(() => {
    if (!sharing) return null;
    const now = new Date();
    const year = now.getFullYear();
    const months = almanacYear(year, cached && cachedYear === year ? cached : EMPTY, now);
    const kept = months.reduce((n, m) => n + m.kept, 0);
    const total = months.reduce((n, m) => n + m.days.length, 0);
    return { months, year, kept, total };
  }, [sharing, cached, cachedYear]);

  const capture = async () => {
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1, width: YEAR_CARD_WIDTH * 3, height: YEAR_CARD_HEIGHT * 3 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { dialogTitle: `Share ${card?.year ?? ''}`, mimeType: 'image/png' });
        track('year_shared', { kept: card?.kept ?? 0 });
      }
    } catch (error) {
      console.warn('Failed to share the year', error);
      Alert.alert('Couldn’t share', 'Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const share = () => {
    if (sharing) return;
    haptic.tap();
    setSharing(true);
  };

  const element = card ? (
    <View
      style={styles.offscreen}
      pointerEvents="none"
      // A frame for the doodles to draw before the capture.
      onLayout={() => requestAnimationFrame(() => setTimeout(capture, 120))}
    >
      <YearShareCard ref={ref} months={card.months} year={card.year} kept={card.kept} total={card.total} />
    </View>
  ) : null;

  return { share, sharing, element };
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -10000, top: 0 },
});
