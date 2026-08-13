import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { FileText, Headphones } from 'lucide-react-native';
import type { Composition } from '@/types/journal';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

interface RecentAssetsProps {
  compositions: Composition[];
}

export function RecentAssets({ compositions }: RecentAssetsProps) {
  const theme = useTheme();
  
  // Take only top 4 recent
  const recent = [...compositions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 4);

  const hasAudio = (c: Composition) => c.mediaElements.some(m => m.type === 'audio');

  const formatSize = (c: Composition) => {
    if (hasAudio(c)) {
      return '1:00'; // Placeholder since we don't store actual duration yet
    }
    const words = c.textContent?.trim().split(/\s+/).filter(Boolean).length || 0;
    return `${words} W`;
  };

  const formatChange = (c: Composition) => {
    if (hasAudio(c)) {
      return <ThemedText style={[styles.changeText, { color: theme.accentWarm }]}>+12.25%</ThemedText>;
    }
    return <ThemedText style={[styles.changeText, { color: '#FF3B30' }]}>-5.2%</ThemedText>;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: theme.text }]}>Recent Assets</ThemedText>
        <ThemedText style={styles.sortText}>Sort by Date ↓</ThemedText>
      </View>

      {recent.map((c, i) => {
        const dateStr = new Date(c.createdAt).toLocaleDateString(undefined, { 
          year: 'numeric',
          month: 'short', 
          day: 'numeric' 
        });
        
        const isAudio = hasAudio(c);
        const previewTitle = c.textContent?.trim() || (isAudio ? 'Voice Memo' : 'Text Entry');
        // truncated title
        const title = previewTitle.length > 20 ? previewTitle.substring(0, 20) + '...' : previewTitle;

        return (
          <Pressable 
            key={c.id} 
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.push(`/memory/${c.id}`)}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
              {isAudio ? <Headphones size={14} color={theme.text} /> : <FileText size={14} color={theme.text} />}
            </View>
            
            <View style={styles.infoCol}>
              <ThemedText style={[styles.assetTitle, { color: theme.text }]}>
                {title}
              </ThemedText>
              <View style={styles.subInfoRow}>
                <ThemedText style={styles.assetSub}>{dateStr}</ThemedText>
                {formatChange(c)}
              </View>
            </View>

            <View style={styles.sizeCol}>
              <ThemedText style={[styles.sizeTitle, { color: theme.text }]}>{formatSize(c)}</ThemedText>
              <ThemedText style={styles.sizeSub}>
                {isAudio ? 'AUDIO' : 'TEXT'}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#0F0F0F',
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
    color: '#E0E0E0',
  },
  sortText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    color: '#878787',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
  assetTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 13,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assetSub: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    color: '#878787',
  },
  changeText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
  },
  sizeCol: {
    alignItems: 'flex-end',
  },
  sizeTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 13,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sizeSub: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    color: '#878787',
  }
});
