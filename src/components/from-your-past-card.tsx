/**
 * FromYourPastCard — brings one memory back each day.
 *
 * Photo-first: when the memory has a photo or video, it fills the card and the
 * words ride on it. Text-only memories show in the font and ink they were
 * written in; voice notes and songs show their artwork or a quiet mark.
 * Tapping opens the memory.
 *
 * The entrance is split so it reads as a memory surfacing, not a fade: the
 * image eases from a slight zoom over 900ms while its opacity resolves in
 * 320ms; the label and words rise in after it on their own curves.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { Keyframe } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Mic } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { BALANCED_TEXT, Type } from '@/constants/theme';
import { EASE_OUT, fadeIn, riseIn } from '@/constants/motion';
import { useResurfacedMemory } from '@/hooks/use-resurfaced-memory';
import { useTheme } from '@/hooks/use-theme';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import { haptic } from '@/services/haptics';
import { getHighResArtwork } from '@/utils/media-attach';
import { isGifMedia } from '@/utils/media-kind';
import { memoryTextMetrics } from '@/utils/memory-text';
import type { Composition } from '@/types/journal';

const PHOTO_ASPECT = 0.8;

const settleIn = new Keyframe({
  0: { transform: [{ scale: 1.06 }] },
  100: { transform: [{ scale: 1 }], easing: EASE_OUT },
}).duration(900);

function formatWhen(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(timestamp))
    .toUpperCase();
}

function firstLine(text: string): string {
  return text.trim().split('\n')[0] ?? '';
}

function PhotoBody({ memory, uri }: { memory: Composition; uri: string }) {
  const line = firstLine(memory.textContent);
  return (
    <View style={styles.photoFrame}>
      <Animated.View entering={fadeIn(320)} style={StyleSheet.absoluteFill}>
        <Animated.View entering={settleIn} style={StyleSheet.absoluteFill}>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
        </Animated.View>
      </Animated.View>
      <View style={styles.scrim} pointerEvents="none" />
      <Animated.View entering={riseIn(300, 220, 8)} style={styles.photoCaption}>
        {line ? (
          <ThemedText {...BALANCED_TEXT} style={styles.photoLine} numberOfLines={2}>
            {line}
          </ThemedText>
        ) : null}
        <ThemedText style={styles.photoDate}>{formatWhen(memory.createdAt)}</ThemedText>
      </Animated.View>
    </View>
  );
}

function TextBody({ memory }: { memory: Composition }) {
  const theme = useTheme();
  const metrics = memoryTextMetrics(memory.fontFamily, Math.min(memory.fontSize || 21, 24));
  return (
    <Animated.View entering={riseIn(320, 160, 8)} style={styles.textBody}>
      <ThemedText
        {...BALANCED_TEXT}
        style={{
          ...metrics,
          fontFamily: memory.fontFamily || 'JetBrainsMono-Regular',
          color: memory.textColor ?? theme.text,
          textAlign: 'center',
        }}
        numberOfLines={4}
      >
        {memory.textContent.trim()}
      </ThemedText>
      <ThemedText style={[styles.textDate, { color: theme.textMuted }]}>{formatWhen(memory.createdAt)}</ThemedText>
    </Animated.View>
  );
}

function SoundBody({ memory }: { memory: Composition }) {
  const theme = useTheme();
  const audio = memory.mediaElements.find((m) => m.type === 'audio');
  const artwork = getHighResArtwork(audio?.metadata?.artwork);
  if (artwork) return <PhotoBody memory={memory} uri={artwork} />;
  return (
    <Animated.View entering={riseIn(320, 160, 8)} style={styles.textBody}>
      <View style={[styles.soundMark, { borderColor: theme.border }]}>
        <Mic size={20} color={theme.accentWarm} />
      </View>
      <ThemedText style={[styles.textDate, { color: theme.textMuted }]}>
        {`A VOICE NOTE  ·  ${formatWhen(memory.createdAt)}`}
      </ThemedText>
    </Animated.View>
  );
}

function MemoryBody({ memory }: { memory: Composition }) {
  const visual = memory.mediaElements.find((m) => (m.type === 'image' || m.type === 'video') && !isGifMedia(m));
  const videoThumb = useVideoThumbnail(visual?.type === 'video' ? visual.uri : undefined);
  const photoUri = visual?.type === 'video' ? videoThumb : visual?.uri;

  if (photoUri) return <PhotoBody memory={memory} uri={photoUri} />;
  if (memory.textContent.trim()) return <TextBody memory={memory} />;
  return <SoundBody memory={memory} />;
}

export function FromYourPastCard() {
  const theme = useTheme();
  const { resurfaced, loaded } = useResurfacedMemory();

  if (!loaded) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.rail}>
        <ThemedText style={[Type.rail, { color: theme.textMuted }]}>FROM YOUR PAST</ThemedText>
        {resurfaced ? (
          <Animated.View entering={fadeIn(240, 120)}>
            <ThemedText style={[Type.rail, { color: theme.accentWarm }]}>{resurfaced.label}</ThemedText>
          </Animated.View>
        ) : null}
      </View>

      {resurfaced ? (
        <Pressable
          onPress={() => {
            haptic.press();
            router.push(`/memory/${resurfaced.memory.id}`);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Open memory, ${resurfaced.label.toLowerCase()}`}
          style={({ pressed }) => [styles.body, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          <MemoryBody key={resurfaced.memory.id} memory={resurfaced.memory} />
        </Pressable>
      ) : (
        <View style={styles.empty}>
          <ThemedText {...BALANCED_TEXT} style={[styles.emptyText, { color: theme.textMuted }]}>
            your past starts today. memories return here after a week.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  rail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 1 / PHOTO_ASPECT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  photoCaption: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    gap: 6,
  },
  photoLine: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  photoDate: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.75)',
  },
  textBody: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 8,
  },
  textDate: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.6,
  },
  soundMark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
});
