import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Settings as SettingsIcon, Book, ChevronRight } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/hooks/use-settings';
import { getAllCompositions } from '@/db/journal-repository';
import type { Composition } from '@/types/journal';

import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { AsciiArt } from '@/components/ascii-art';
import { SYS_READY_ART } from '@/constants/ascii-art';
import { ActivityGrid } from '@/components/activity-grid';
import { ProfileStats } from '@/components/profile-stats';
import { StreakCard } from '@/components/streak-card';
import { TECalendar } from '@/components/te-calendar';
import { Type } from '@/constants/theme';
import { toDayKey } from '@/utils/format-date';

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const [compositions, setCompositions] = useState<Composition[]>([]);

  useEffect(() => {
    getAllCompositions().then(setCompositions).catch(console.error);
  }, []);

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
            <ThemedText style={[styles.identityName, { color: settings.name ? fg : mutedText }]}>
              {settings.name || 'NOT SET'}
            </ThemedText>
            <ThemedText style={[styles.identityMeta, { color: mutedText }]}>
              {settings.dob || 'NOT SET'}
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
        
        {/* Combined Dashboard Card */}
        <StreakCard compositions={compositions} />

        {/* Sleek Story Board Row */}
        <Pressable 
          style={({ pressed }) => [
            styles.sleekRow, 
            { 
              backgroundColor: pressed ? '#E0E0E0' : elementBg, 
              borderColor: borderColor,
            }
          ]}
          onPress={() => router.push('/stories')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Book size={14} color={theme.textMuted} />
            <ThemedText style={[Type.rail, { color: theme.textMuted }]}>STORY BOARD</ThemedText>
          </View>
          <ChevronRight size={16} color={mutedText} />
        </Pressable>

        {/* Heat Map (Activity Grid) */}
        <ActivityGrid compositions={compositions} />

        {/* Time Machine Section */}
        <View style={[styles.portfolioSection, { backgroundColor: elementBg, borderColor: borderColor, padding: 0, overflow: 'hidden' }]}>
          <View style={[styles.portfolioHeader, { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, marginBottom: 0 }]}>
            <ThemedText style={[Type.rail, { color: theme.textMuted }]}>TIME MACHINE</ThemedText>
          </View>
          <TECalendar
            onSelect={(date) => router.push(`/time-machine?day=${toDayKey(date)}`)}
          />
        </View>

        {/* Stats */}
        <ProfileStats compositions={compositions} />

        {/* ASCII Easter Egg Mascot */}
        <View style={styles.mascotContainer}>
          <AsciiArt art={SYS_READY_ART} color="#878787" fontSize={10} />
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
  sleekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderRadius: 4,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  mascotContainer: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
    opacity: 0.5,
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
