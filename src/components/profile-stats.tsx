import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { FileText, Headphones, Image as ImageIcon, Video } from 'lucide-react-native';
import type { Composition } from '@/types/journal';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

interface ProfileStatsProps {
  compositions: Composition[];
}

export function ProfileStats({ compositions }: ProfileStatsProps) {
  const theme = useTheme();

  const { totalWords, audioCount, photoCount, videoCount } = useMemo(() => {
    let words = 0;
    let audio = 0;
    let photos = 0;
    let videos = 0;

    compositions.forEach(c => {
      if (c.textContent) {
        words += c.textContent.trim().split(/\s+/).filter(Boolean).length;
      }
      c.mediaElements.forEach(m => {
        if (m.type === 'audio') audio++;
        else if (m.type === 'video') videos++;
        else if (m.type === 'image') photos++;
      });
    });

    return { totalWords: words, audioCount: audio, photoCount: photos, videoCount: videos };
  }, [compositions]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: theme.text }]}>Your Vault</ThemedText>
        <ThemedText style={styles.subText}>{compositions.length} Entries</ThemedText>
      </View>

      <View style={styles.row}>
        <View style={styles.statBox}>
          <FileText size={14} color={theme.textMuted} />
          <ThemedText style={[styles.statValue, { color: theme.text }]}>{totalWords}</ThemedText>
          <ThemedText style={styles.statLabel}>Words</ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.statBox}>
          <ImageIcon size={14} color={theme.textMuted} />
          <ThemedText style={[styles.statValue, { color: theme.text }]}>{photoCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Photos</ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.statBox}>
          <Video size={14} color={theme.textMuted} />
          <ThemedText style={[styles.statValue, { color: theme.text }]}>{videoCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Videos</ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.statBox}>
          <Headphones size={14} color={theme.textMuted} />
          <ThemedText style={[styles.statValue, { color: theme.text }]}>{audioCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Audio</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
  },
  subText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    color: '#878787',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 18,
  },
  statLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    color: '#878787',
  },
  divider: {
    width: 1,
    height: 40,
  },
});
