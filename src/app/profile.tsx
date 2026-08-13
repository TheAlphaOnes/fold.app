import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Settings as SettingsIcon } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useJournal } from '@/hooks/use-journal';
import { useSettings } from '@/hooks/use-settings';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { ActivityGrid } from '@/components/activity-grid';
import { VolumeChart } from '@/components/volume-chart';
import { MomentumChart } from '@/components/momentum-chart';
import { RecentAssets } from '@/components/recent-assets';
import { TECalendar } from '@/components/te-calendar';

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { compositions } = useJournal();
  const { settings } = useSettings();

  // Aggregate fake "Portfolio" data from real compositions
  const totalDuration = useMemo(() => {
    const ms = compositions.filter(c => c.type === 'audio').reduce((acc, c) => acc + (c.duration || 0), 0);
    return Math.round(ms / 60000); // Minutes
  }, [compositions]);

  const totalWords = useMemo(() => {
    return compositions.filter(c => c.type === 'text').reduce((acc, c) => acc + (c.text?.split(/\s+/).length || 0), 0);
  }, [compositions]);

  // We now use theme colors instead of hardcoded terminal dark mode
  const bg = theme.background;
  const fg = theme.text;
  const elementBg = theme.backgroundElement;
  const borderColor = theme.border;
  const mutedText = '#878787';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <GrainBackground />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, borderColor: borderColor }]}>
        <View style={styles.identityBadge}>
          <View style={styles.avatar} />
          <View>
            <ThemedText style={[styles.identityName, { color: fg }]}>
              {settings.name || 'Nollan'}
            </ThemedText>
            <ThemedText style={[styles.identityMeta, { color: mutedText }]}>
              {settings.dob || '0x4a7B...Cef1'}
            </ThemedText>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable 
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.iconBtn, 
              { borderColor: theme.border, opacity: pressed ? 0.5 : 1 }
            ]}
          >
            <SettingsIcon size={16} color={fg} />
          </Pressable>
          <Pressable 
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.iconBtn, 
              { borderColor: theme.border, opacity: pressed ? 0.5 : 1 }
            ]}
          >
            <X size={16} color={fg} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Portfolio Section */}
        <View style={[styles.portfolioSection, { backgroundColor: elementBg, borderColor: borderColor }]}>
          <View style={styles.portfolioHeader}>
            <ThemedText style={[styles.portfolioTitle, { color: fg }]}>Portfolio</ThemedText>
          </View>

          <View style={styles.portfolioStatsRow}>
            <View style={styles.portfolioStat}>
              <ThemedText style={[styles.statLabel, { color: mutedText }]}>Today</ThemedText>
              <ThemedText style={[styles.statValue, { color: fg }]}>
                {compositions.length > 0 ? '12' : '0'}
              </ThemedText>
              <ThemedText style={styles.statChangeGreen}>↑ 25.50%</ThemedText>
            </View>
            <View style={styles.portfolioStat}>
              <ThemedText style={[styles.statLabel, { color: mutedText }]}>Words</ThemedText>
              <ThemedText style={[styles.statValue, { color: fg }]}>
                {totalWords.toLocaleString()}
              </ThemedText>
              <ThemedText style={styles.statChangeRed}>↓ 5.50%</ThemedText>
            </View>
            <View style={styles.portfolioStat}>
              <ThemedText style={[styles.statLabel, { color: mutedText }]}>Audio (m)</ThemedText>
              <ThemedText style={[styles.statValue, { color: fg }]}>
                {totalDuration}
              </ThemedText>
              <ThemedText style={styles.statChangeGreen}>↑ 25.50%</ThemedText>
            </View>
          </View>
        </View>

        {/* Time Machine Section */}
        <View style={[styles.portfolioSection, { backgroundColor: elementBg, borderColor: borderColor, padding: 0 }]}>
          <View style={[styles.portfolioHeader, { padding: 16, paddingBottom: 16, marginBottom: 0, borderBottomWidth: 1, borderBottomColor: borderColor }]}>
            <ThemedText style={[styles.portfolioTitle, { color: fg }]}>Time Machine</ThemedText>
          </View>
          
          <View>
            <TECalendar onSelect={(date) => router.push(`/archive?ts=${date.getTime()}`)} />
          </View>
        </View>

        {/* Charts */}
        <ActivityGrid compositions={compositions} />
        <VolumeChart compositions={compositions} />
        <MomentumChart compositions={compositions} />
        <RecentAssets compositions={compositions} />

        {/* ASCII Easter Egg Mascot */}
        <View style={styles.mascotContainer}>
          <ThemedText style={styles.mascotText}>
{`.-----------.
| .-------. |
| |>_     | |
| '-------' |
|       ( ) |
|   _       |
| _| |_  (B)|
||_   _|(A) |
|  |_|      |
'-----------'`}
          </ThemedText>
          <ThemedText style={styles.mascotSubtitle}>SYS.READY</ThemedText>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#1A1A1A',
  },
  identityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF4B00',
  },
  identityName: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
    marginBottom: 2,
  },
  identityMeta: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    color: '#878787',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  portfolioSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 4,
  },
  portfolioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  portfolioTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
    color: '#E0E0E0',
  },
  portfolioStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  portfolioStat: {
    flex: 1,
  },
  statLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    color: '#878787',
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 18,
    marginBottom: 4,
  },
  statChangeGreen: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    color: '#00FF66',
  },
  statChangeRed: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    color: '#FF3B30',
  },
  mascotContainer: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
    opacity: 0.5,
  },
  mascotText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    lineHeight: 12,
    color: '#878787',
    textAlign: 'left',
  },
  mascotSubtitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    color: '#FF4B00',
    marginTop: 8,
    letterSpacing: 2,
  },
  timeMachineBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeMachineBtnText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
  }
});
