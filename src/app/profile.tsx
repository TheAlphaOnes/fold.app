import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useIsFocused } from 'expo-router';

import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings as SettingsIcon } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/hooks/use-settings';
import { useTransitionDone } from '@/hooks/use-transition-done';
import { riseIn } from '@/constants/motion';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { AsciiArt } from '@/components/ascii-art';
import { SYS_READY_ART } from '@/constants/ascii-art';
import { ActivityGrid } from '@/components/activity-grid';
import { FromYourPastCard } from '@/components/from-your-past-card';
import { ContinuumCard } from '@/components/continuum/continuum-card';
import { StoryBoardCard } from '@/components/profile/story-board-card';
import { StampAlbumCard } from '@/components/profile/stamp-album-card';
import { ProfileAvatar } from '@/components/profile-avatar';
import { CloseButton, RoundButton } from '@/components/round-button';
import { TECalendar } from '@/components/te-calendar';
import { Type } from '@/constants/theme';
import { toDayKey } from '@/utils/format-date';
import { navigate } from '@/utils/navigation';

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const bg = theme.background;
  const fg = theme.text;
  const elementBg = theme.backgroundElement;
  const borderColor = theme.border;
  const mutedText = '#878787';
  // Every card reads the profile cache, which loads in the background, so
  // the visible cards draw in the same frame as the slide. Only the photo
  // wall at the bottom (dozens of images, off screen) waits for the slide.
  const settled = useTransitionDone();
  const focused = useIsFocused();
  const { height: screenHeight } = useWindowDimensions();

  // The photo wall at the bottom is mounted once you scroll near it, and only
  // falls while it's on screen and the profile is in front. Before, it loaded
  // with the profile and animated forever, even out of sight or under another
  // screen.
  const [wallTop, setWallTop] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const nearWall = wallTop !== null && scrollY + screenHeight * 1.5 > wallTop;
  const wallVisible = focused && wallTop !== null && scrollY + screenHeight > wallTop;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    // Only re-render when crossing a quarter screen; the checks above are coarse.
    if (Math.abs(y - scrollY) > screenHeight / 4) setScrollY(y);
  };

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
          <RoundButton icon={SettingsIcon} accessibilityLabel="Settings" onPress={() => navigate.push('/settings')} />
          <CloseButton />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        onScrollEndDrag={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        onMomentumScrollEnd={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={100}
      >
        
        {/* Combined Dashboard Card */}
        <ContinuumCard />

        <StoryBoardCard />

        <StampAlbumCard />

        {/* Heat Map (Activity Grid) */}
        <ActivityGrid />

        {/* Time Machine Section */}
        <View style={[styles.portfolioSection, { backgroundColor: elementBg, borderColor: borderColor }]}>
          <View style={styles.portfolioHeader}>
            <ThemedText style={[Type.rail, { color: theme.textMuted }]}>TIME MACHINE</ThemedText>
          </View>
          <TECalendar onSelect={(date) => navigate.push(`/time-machine?day=${toDayKey(date)}`)} />
        </View>

        {/* Marks where the wall starts, so it can wait until you scroll near it. */}
        <View onLayout={(e) => setWallTop(e.nativeEvent.layout.y)} />
        {settled && nearWall && (
          <Animated.View entering={riseIn(420, 0, 12)}>
            {/* Today's memory from the past — photo-first, opens the memory */}
            <FromYourPastCard visible={wallVisible} />

            {/* ASCII Easter Egg Mascot */}
            <View style={styles.mascotContainer}>
              <AsciiArt art={SYS_READY_ART} color="#878787" fontSize={10} />
              <ThemedText style={styles.mascotSubtitle}>FOLD</ThemedText>
            </View>
          </Animated.View>
        )}

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
