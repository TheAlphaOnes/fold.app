/**
 * DoodleShareCard — one earned doodle as a share image: the doodle on Fold's
 * hatch, its serial, name and date, and the crane in the corner. Laid out off
 * screen at a fixed size and captured by the caller, so the spotlight and the
 * reveal share exactly the same picture.
 */

import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { DiagonalStripes } from '@/components/diagonal-stripes';
import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { DayDoodle } from '@/doodles/day-doodle';
import type { LibraryDoodle } from '@/doodles/types';
import { useTheme } from '@/hooks/use-theme';

interface DoodleShareCardProps {
  doodle: LibraryDoodle;
  /** "No. 321" */
  serial: string;
  /** "kept 17 nov 2026" */
  date: string;
  ref?: React.Ref<React.ComponentRef<typeof View>>;
}

export function DoodleShareCard({ doodle, serial, date, ref }: DoodleShareCardProps) {
  const theme = useTheme();
  return (
    <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <DiagonalStripes color={theme.textMuted} opacity={0.14} />
      <DayDoodle doodle={doodle} size={250} moving={false} />
      <ThemedText style={[Type.rail, { color: theme.textMuted, marginTop: 6 }]}>{serial}</ThemedText>
      <ThemedText style={[styles.name, { color: theme.text }]}>{doodle.name}</ThemedText>
      <ThemedText style={[styles.date, { color: theme.textMuted }]}>{date}</ThemedText>
      <View style={styles.logo}>
        <Logo size={30} color={theme.text} />
      </View>
    </View>
  );
}

/** Captures the card and hands it to the share sheet. Never throws. */
export async function shareDoodleCard(
  ref: React.RefObject<React.ComponentRef<typeof View> | null>,
  title: string,
): Promise<void> {
  try {
    const uri = await captureRef(ref, { format: 'png', quality: 1 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { dialogTitle: title, mimeType: 'image/png' });
    }
  } catch (error) {
    console.warn('Failed to share doodle', error);
    Alert.alert('Couldn’t share', 'Please try again.');
  }
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: -10000,
    top: 0,
    width: 360,
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  name: { fontFamily: 'JetBrainsMono-Medium', fontSize: 16 },
  date: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11 },
  logo: { position: 'absolute', right: 20, bottom: 20 },
});
