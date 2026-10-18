/**
 * StoryCover — a chapter's cover, built from the user's own photos.
 *
 *   3+ photos → album mosaic: one large on the left, two stacked on the right
 *   2 photos  → two side by side
 *   1 photo   → full bleed
 *   none      → a calm surface with a centred book mark
 *
 * Video items use their generated thumbnail. Purely visual; the caption lives
 * outside the cover so text is never laid over a photo.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Book } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import type { Story } from '@/types/journal';

type Visual = { uri: string; type: 'image' | 'video' };

const SEAM = 2;

/** Visual media for a story, lead image first, without repeats. */
export function storyVisuals(story: Story): Visual[] {
  const visuals: Visual[] = [];
  if (story.coverImageUri) visuals.push({ uri: story.coverImageUri, type: 'image' });
  for (const media of story.sampleMedia ?? []) {
    if ((media.type === 'image' || media.type === 'video') && !visuals.some((v) => v.uri === media.uri)) {
      visuals.push({ uri: media.uri, type: media.type });
    }
  }
  return visuals;
}

function Pane({ visual, style }: { visual: Visual; style: object }) {
  const theme = useTheme();
  const thumb = useVideoThumbnail(visual.type === 'video' ? visual.uri : undefined);
  const uri = visual.type === 'video' ? thumb : visual.uri;
  return (
    <View style={[style, { backgroundColor: theme.backgroundSelected }]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
      ) : null}
    </View>
  );
}

export function StoryCover({ story }: { story: Story }) {
  const theme = useTheme();
  const visuals = storyVisuals(story).slice(0, 3);

  if (visuals.length === 0) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.empty, { backgroundColor: theme.backgroundSelected }]}>
        <Book size={22} color={theme.textMuted} strokeWidth={1.5} />
      </View>
    );
  }

  if (visuals.length === 1) {
    return <Pane visual={visuals[0]} style={StyleSheet.absoluteFill} />;
  }

  if (visuals.length === 2) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.row]}>
        <Pane visual={visuals[0]} style={styles.flex} />
        <Pane visual={visuals[1]} style={styles.flex} />
      </View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.row]}>
      <Pane visual={visuals[0]} style={styles.lead} />
      <View style={styles.column}>
        <Pane visual={visuals[1]} style={styles.flex} />
        <Pane visual={visuals[2]} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: SEAM,
  },
  column: {
    flex: 1,
    gap: SEAM,
  },
  lead: {
    flex: 1.6,
  },
  flex: {
    flex: 1,
  },
});
