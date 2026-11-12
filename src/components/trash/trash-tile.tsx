/**
 * TrashTile — one memory in Recently Deleted: a square thumbnail, dimmed as
 * something set aside, with a thin line along its foot that drains as its
 * 30 days run out (orange in the last three). Tap selects it; a selected
 * tile comes back to full strength under an accent ring and a check.
 */

import React, { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Check, Mic } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { EASE_OUT, SPRING_GESTURE, riseIn } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import { TRASH_DAYS } from '@/services/trash.service';
import { getHighResArtwork } from '@/utils/media-attach';
import { isDecorativeMedia } from '@/utils/media-kind';
import type { Composition } from '@/types/journal';

const RADIUS = 12;

/** What the tile shows: the memory's picture, its words, or a mic for a voice note. */
function Face({ memory }: { memory: Composition }) {
  const theme = useTheme();
  const visual = memory.mediaElements.find((m) => (m.type === 'image' || m.type === 'video') && !isDecorativeMedia(m));
  const videoThumb = useVideoThumbnail(visual?.type === 'video' ? visual.uri : undefined);
  const music = memory.mediaElements.find((m) => m.type === 'audio' && m.metadata);
  const uri = visual ? (visual.type === 'video' ? videoThumb : visual.uri) : getHighResArtwork(music?.metadata?.artwork);
  const words = memory.textContent.trim();

  if (uri) return <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" recyclingKey={String(memory.id)} />;
  return (
    <View style={[StyleSheet.absoluteFill, styles.plain, { backgroundColor: theme.backgroundElement }]}>
      {words ? (
        <ThemedText numberOfLines={4} style={[styles.words, { color: memory.textColor ?? theme.text, fontFamily: memory.fontFamily || 'JetBrainsMono-Regular' }]}>
          {words}
        </ThemedText>
      ) : (
        <Mic size={20} color={theme.accentWarm} />
      )}
    </View>
  );
}

interface TrashTileProps {
  memory: Composition;
  size: number;
  /** Whole days left before it is gone for good. */
  daysLeft: number;
  selected: boolean;
  /** Entrance order, for the stagger. */
  order: number;
  label: string;
  onToggle: (id: number) => void;
}

export const TrashTile = memo(function TrashTile({ memory, size, daysLeft, selected, order, label, onToggle }: TrashTileProps) {
  const theme = useTheme();
  const urgent = daysLeft <= 3;
  const pick = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    // The dim lifts on a quick ease; the ring and check land on a spring.
    pick.set(withSpring(selected ? 1 : 0, SPRING_GESTURE));
  }, [selected, pick]);

  const face = useAnimatedStyle(() => ({ opacity: 0.55 + pick.get() * 0.45, transform: [{ scale: 1 - pick.get() * 0.06 }] }));
  const ring = useAnimatedStyle(() => ({ opacity: withTiming(pick.get() > 0.5 ? 1 : 0, { duration: 140, easing: EASE_OUT }) }));
  const check = useAnimatedStyle(() => ({ opacity: pick.get(), transform: [{ scale: 0.6 + pick.get() * 0.4 }] }));

  return (
    <Animated.View entering={riseIn(280, Math.min(order, 12) * 28, 10)} style={{ width: size }}>
      <Pressable
        onPress={() => onToggle(memory.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`${label}, ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
        style={{ width: size, height: size }}
      >
        <Animated.View style={[styles.face, { backgroundColor: theme.backgroundSelected }, face]}>
          <Face memory={memory} />
          {/* Life left: drains from full to nothing over the bin's 30 days. */}
          <View style={styles.lifeTrack}>
            <View style={[styles.life, { width: `${Math.max(4, (daysLeft / TRASH_DAYS) * 100)}%`, backgroundColor: urgent ? theme.accentWarm : '#FFFFFFCC' }]} />
          </View>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ring, { borderColor: theme.accentWarm }, ring]} />
        <Animated.View pointerEvents="none" style={[styles.check, { backgroundColor: theme.accentWarm }, check]}>
          <Check size={12} color="#FFFFFF" strokeWidth={3} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  face: { flex: 1, borderRadius: RADIUS, overflow: 'hidden' },
  plain: { alignItems: 'center', justifyContent: 'center', padding: 10 },
  words: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
  lifeTrack: { position: 'absolute', left: 8, right: 8, bottom: 8, height: 3, borderRadius: 1.5, backgroundColor: '#00000059', overflow: 'hidden' },
  life: { height: 3, borderRadius: 1.5 },
  ring: { borderRadius: RADIUS, borderWidth: 2 },
  check: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
