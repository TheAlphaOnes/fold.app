/**
 * Achievement — your profile as a card you can send: the streak, the ink,
 * and the last three weeks. The same flow as sharing a memory as a card:
 * capture the view, then hand the image to the share sheet.
 */

import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AchievementCard } from '@/components/profile/achievement-card';
import { CloseButton } from '@/components/round-button';
import { ThemedText } from '@/components/themed-text';
import { useProgressionStore } from '@/hooks/use-progression';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/services/analytics';
import { haptic } from '@/services/haptics';

/** Card proportions: a portrait card, taller than wide, with room for the year grid. */
const CARD_RATIO = 1.25;
/** Room the header and the share button keep around the card. */
const CHROME = 200;

export default function AchievementScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const streak = useProgressionStore((state) => state.streak.current);
  const ink = useProgressionStore((state) => state.ink.month);
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);
  const [sharing, setSharing] = useState(false);

  // Fits the card between the header and the share button on any screen,
  // leaving the frame's margin on every side.
  const cardWidth = Math.min(width - 80, (height - insets.top - insets.bottom - CHROME) / CARD_RATIO, 340);
  const cardHeight = cardWidth * CARD_RATIO;

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    haptic.tap();
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { dialogTitle: 'Share your achievement', mimeType: 'image/png' });
        track('achievement_shared', { streak, ink });
      }
    } catch (error) {
      console.warn('Failed to share achievement', error);
      Alert.alert('Couldn’t share', 'Please try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 6, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.topBar}>
        <CloseButton accessibilityLabel="Close achievement" />
      </View>

      <View style={styles.stage}>
        {/* The captured frame: the card with the page's own margin around it,
            so the shared image never runs the card to its edges. */}
        <View ref={cardRef} collapsable={false} style={[styles.frame, { backgroundColor: theme.background }]}>
          <AchievementCard width={cardWidth} height={cardHeight} />
        </View>
      </View>

      <Pressable
        onPress={share}
        disabled={sharing}
        accessibilityRole="button"
        accessibilityLabel="Share your achievement"
        style={({ pressed }) => [styles.share, { backgroundColor: theme.text, opacity: pressed || sharing ? 0.7 : 1 }]}
      >
        {sharing ? (
          <ActivityIndicator size="small" color={theme.background} />
        ) : (
          <ThemedText style={[styles.shareText, { color: theme.background }]}>SHARE</ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { padding: 24 },
  share: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  shareText: { fontFamily: 'JetBrainsMono-Bold', fontSize: 13, letterSpacing: 3 },
});
