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

  const formatSize = (c: Composition) => {
    if (c.type === 'audio') {
      const ms = c.duration || 0;
      const secs = Math.round(ms / 1000);
      return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
    }
    const words = c.text?.split(/\s+/).length || 0;
    return `${words} W`;
  };

  const formatChange = (c: Composition) => {
    // Fake data to match the UI: Audio is green, Text is red/grey just to look like crypto % changes
    if (c.type === 'audio') {
      return <ThemedText style={[styles.changeText, { color: '#00FF66' }]}>+12.25%</ThemedText>;
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
          month: 'short', 
          day: 'numeric' 
        });

        return (
          <Pressable 
            key={c.id} 
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.push(`/memory/${c.id}`)}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
              {c.type === 'audio' ? <Headphones size={14} color={theme.text} /> : <FileText size={14} color={theme.text} />}
            </View>
            
            <View style={styles.infoCol}>
              <ThemedText style={[styles.assetTitle, { color: theme.text }]}>
                {c.title || (c.type === 'audio' ? 'Voice Memo' : 'Text Entry')}
              </ThemedText>
              <View style={styles.subInfoRow}>
                <ThemedText style={styles.assetSub}>{dateStr}</ThemedText>
                {formatChange(c)}
              </View>
            </View>

            <View style={styles.sizeCol}>
              <ThemedText style={[styles.sizeTitle, { color: theme.text }]}>{formatSize(c)}</ThemedText>
              <ThemedText style={styles.sizeSub}>
                {c.type === 'audio' ? 'AUDIO' : 'TEXT'}
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
