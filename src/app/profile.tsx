import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Settings as SettingsIcon } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/hooks/use-settings';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { AsciiArt } from '@/components/ascii-art';
import { SYS_READY_ART } from '@/constants/ascii-art';
import { ActivityGrid } from '@/components/activity-grid';
import { FromYourPastCard } from '@/components/from-your-past-card';
import { ContinuumCard } from '@/components/continuum/continuum-card';
import { StoryBoardCard } from '@/components/profile/story-board-card';
import { ProfileAvatar } from '@/components/profile-avatar';
import { TECalendar } from '@/components/te-calendar';
import { Type } from '@/constants/theme';
import { toDayKey } from '@/utils/format-date';
import { haptic } from '@/services/haptics';
import { goBack } from '@/utils/navigation';

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
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
          <ProfileAvatar />
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
            onPress={() => {
              haptic.tap();
              router.push('/settings');
            }}
            style={({ pressed }) => [
              styles.iconBtn, 
              { borderColor: theme.border, opacity: pressed ? 0.5 : 1 }
            ]}
          >
            <SettingsIcon size={16} color={fg} />
          </Pressable>
          <Pressable 
            onPress={() => {
              haptic.tap();
              goBack();
            }}
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
        <ContinuumCard />

        <StoryBoardCard />

        {/* Heat Map (Activity Grid) */}
        <ActivityGrid />

        {/* Time Machine Section */}
        <View style={[styles.portfolioSection, { backgroundColor: elementBg, borderColor: borderColor }]}>
          <View style={styles.portfolioHeader}>
            <ThemedText style={[Type.rail, { color: theme.textMuted }]}>TIME MACHINE</ThemedText>
          </View>
          <TECalendar onSelect={(date) => router.push(`/time-machine?day=${toDayKey(date)}`)} />
        </View>

        {/* Today's memory from the past — photo-first, opens the memory */}
        <FromYourPastCard />

        {/* ASCII Easter Egg Mascot */}
        <View style={styles.mascotContainer}>
          <AsciiArt art={SYS_READY_ART} color="#878787" fontSize={10} />
          <ThemedText style={styles.mascotSubtitle}>FOLD</ThemedText>
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
  // Explicit line heights: the default text style's 24px line box was what
  // pushed the name and date of birth apart.
  identityName: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  identityMeta: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    lineHeight: 13,
    textTransform: 'uppercase',
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
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
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
});
