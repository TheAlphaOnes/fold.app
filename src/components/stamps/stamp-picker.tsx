/**
 * StampPicker — the composer's sheet for placing a stamp from the collection
 * on a memory, like a sticker. Same sheet as the GIF picker: a header, then
 * the collection as a grid, each stamp at its own slight tilt. Tapping one
 * places it. With no stamps yet, it points the way to making the first.
 */

import React, { useEffect } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { BalancedText } from '@/components/balanced-text';
import { GrainBackground } from '@/components/grain-background';
import { CloseButton } from '@/components/round-button';
import { StampView, STAMP_ASPECT } from '@/components/stamps/stamp-view';
import { ThemedText } from '@/components/themed-text';
import { riseIn } from '@/constants/motion';
import { useStamps } from '@/hooks/use-stamps';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { stampTilt } from '@/stamps/geometry';
import type { Stamp } from '@/types/stamp';
import { navigate } from '@/utils/navigation';

const COLUMNS = 3;
const EDGE = 20;
const GAP = 16;

interface StampPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (stamp: Stamp) => void;
}

export function StampPicker({ visible, onClose, onSelect }: StampPickerProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { stamps, loaded, load } = useStamps();

  useEffect(() => {
    if (visible && !loaded) load();
  }, [visible, loaded, load]);

  const tile = (width - EDGE * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <GrainBackground />
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Add stamp</Text>
          <CloseButton onPress={onClose} hitSlop={12} />
        </View>

        {loaded && stamps.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>no stamps yet</ThemedText>
            <BalancedText style={[styles.emptyBody, { color: theme.textMuted }]}>stamps are photos of places you go, made with the stamp camera</BalancedText>
            <Pressable
              onPress={() => {
                onClose();
                navigate.push('/stamps');
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cta, { backgroundColor: theme.text, opacity: pressed ? 0.75 : 1 }]}
            >
              <ThemedText style={[styles.ctaText, { color: theme.background }]}>MAKE A STAMP</ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={stamps}
            keyExtractor={(s) => String(s.id)}
            numColumns={COLUMNS}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Animated.View entering={riseIn(300, 40 + Math.min(index, 12) * 30, 10)}>
                <Pressable
                  onPress={() => {
                    haptic.select();
                    onSelect(item);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Add stamp from ${item.place}`}
                  style={({ pressed }) => ({ width: tile, height: tile * STAMP_ASPECT, transform: [{ rotate: `${stampTilt(item.id)}deg` }, { scale: pressed ? 0.94 : 1 }] })}
                >
                  <StampView imageUri={item.imageUri} place={item.place} createdAt={item.createdAt} width={tile} postmark={false} />
                </Pressable>
              </Animated.View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontFamily: 'JetBrainsMono-Bold', fontSize: 16 },
  grid: { padding: EDGE, gap: GAP },
  row: { gap: GAP },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 14, paddingBottom: 80 },
  emptyTitle: { fontFamily: 'JetBrainsMono-Medium', fontSize: 15 },
  emptyBody: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, lineHeight: 19, textAlign: 'center' },
  cta: { height: 42, paddingHorizontal: 22, borderRadius: 21, justifyContent: 'center', marginTop: 6 },
  ctaText: { fontFamily: 'JetBrainsMono-Bold', fontSize: 12, letterSpacing: 2 },
});
