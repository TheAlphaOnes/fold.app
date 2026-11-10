/** Dev: the four Stamp Album designs, stacked, to compare. */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ALBUMS, type AlbumStyle } from '@/components/profile/stamp-album-variants';
import { useTheme } from '@/hooks/use-theme';

const ORDER: AlbumStyle[] = ['passport', 'hero', 'grid', 'envelope'];

export default function StampAlbumsDev() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 60 }}>
      {ORDER.map((key, i) => {
        const Album = ALBUMS[key];
        return (
          <View key={key}>
            <ThemedText style={[styles.label, { color: theme.textMuted }]}>
              {i + 1}. {key.toUpperCase()}
            </ThemedText>
            <Album />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: 'JetBrainsMono-Bold', fontSize: 11, letterSpacing: 2, marginBottom: 8 },
});
