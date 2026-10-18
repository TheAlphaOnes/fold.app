/**
 * StoryCover — a story's lead image: its cover, else its newest photo or
 * video thumbnail. Stories without media get the brand hatching and a book
 * mark instead of an empty grey box.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Book } from 'lucide-react-native';

import { DiagonalStripes } from '@/components/diagonal-stripes';
import { useTheme } from '@/hooks/use-theme';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import type { Story } from '@/types/journal';

type Visual = { uri: string; type: 'image' | 'video' };

/** Visual media for a story, lead image first. */
export function storyVisuals(story: Story): Visual[] {
  const visuals: Visual[] = [];
  if (story.coverImageUri) visuals.push({ uri: story.coverImageUri, type: 'image' });
  for (const media of story.sampleMedia ?? []) {
    if (media.type === 'image' || media.type === 'video') {
      if (!visuals.some((v) => v.uri === media.uri)) visuals.push({ uri: media.uri, type: media.type });
    }
  }
  return visuals;
}

export function VisualImage({ visual }: { visual: Visual }) {
  const thumb = useVideoThumbnail(visual.type === 'video' ? visual.uri : undefined);
  const uri = visual.type === 'video' ? thumb : visual.uri;
  if (!uri) return null;
  return <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />;
}

export function StoryCover({ story }: { story: Story }) {
  const theme = useTheme();
  const lead = storyVisuals(story)[0];

  if (lead) return <VisualImage visual={lead} />;

  return (
    <View style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor: theme.backgroundSelected }]}>
      <DiagonalStripes color={theme.border} opacity={0.35} />
      <Book size={22} color={theme.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
