import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useIsFocused } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings as SettingsIcon } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/hooks/use-settings';
import { useTransitionDone } from '@/hooks/use-transition-done';
import { useProfileDataStore } from '@/hooks/use-profile-data';
import { useProfileWarmth, type ProfileSection } from '@/hooks/use-profile-warmth';
import { useStamps } from '@/hooks/use-stamps';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { AsciiArt } from '@/components/ascii-art';
import { SYS_READY_ART } from '@/constants/ascii-art';
import { ActivityGrid } from '@/components/activity-grid';
import { FromYourPastCard } from '@/components/from-your-past-card';
import { ContinuumCard } from '@/components/continuum/continuum-card';
import { StoryBoardCard } from '@/components/profile/story-board-card';
import { StampAlbumCard } from '@/components/profile/stamp-album-card';
import { ActivitySkeleton, CalendarSkeleton, MapSkeleton, PastWallSkeleton } from '@/components/profile/profile-skeleton';
import { ProfileAvatar } from '@/components/profile-avatar';
import { CloseButton, RoundButton } from '@/components/round-button';
import { TECalendar } from '@/components/te-calendar';
import { toDayKey } from '@/utils/format-date';
import { navigate } from '@/utils/navigation';

/** Heavy sections build in this order, one per idle callback, right after the slide. */
const SECTION_ORDER: ProfileSection[] = ['map', 'calendar', 'activity', 'wall'];

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
  // the visible cards draw in the same frame as the slide. The heavy sections
  // build after the slide, in the background, never on demand.
  const settled = useTransitionDone();
  const focused = useIsFocused();
  const { height: screenHeight } = useWindowDimensions();

  // Sections built once this session stay built: a return visit draws the
  // whole page in its first frame, with no skeletons and no staged mounting.
  const readySections = useProfileWarmth((state) => state.warm);
  const markWarm = useProfileWarmth((state) => state.markWarm);
  const [scrollY, setScrollY] = useState(0);
  const [wallTop, setWallTop] = useState<number | undefined>(undefined);

  // Each section also waits for its own cached data; the skeleton covers it.
  const dayCounts = useProfileDataStore((state) => state.dayCounts);
  const activeDates = useProfileDataStore((state) => state.activeDates);
  const pastMemories = useProfileDataStore((state) => state.pastMemories);
  const hydrateProfile = useProfileDataStore((state) => state.hydrateFromSnapshot);
  // The root layout hydrates at launch; this is the safety net for a store
  // that was reset (a reload) after that ran. It reads the snapshot only
  // when the cache is empty, so a normal open costs nothing.
  useEffect(() => {
    if (dayCounts === null) void hydrateProfile();
  }, [dayCounts, hydrateProfile]);
  const stampsLoaded = useStamps((state) => state.loaded);
  const loadStamps = useStamps((state) => state.load);

  // Stamps are part of the page, not a scroll reward: load them with the rest.
  useEffect(() => {
    if (!stampsLoaded) void loadStamps();
  }, [stampsLoaded, loadStamps]);

  const nextSection = SECTION_ORDER.find((key) => {
    if (readySections[key]) return false;
    if (key === 'map') return stampsLoaded;
    if (key === 'calendar') return activeDates !== null;
    if (key === 'activity') return dayCounts !== null;
    return pastMemories !== null;
  });

  // One section per idle period, in order, right after the slide. The work is
  // spread so the page stays interactive, but it never waits for a scroll:
  // every section is built before the user can reach it.
  useEffect(() => {
    if (!settled || !nextSection) return;
    const idle = requestIdleCallback(() => markWarm(nextSection));
    return () => cancelIdleCallback(idle);
  }, [settled, nextSection, markWarm]);

  // The wall only animates while it can be seen; mounting is never gated.
  const wallVisible = focused && wallTop !== undefined && scrollY + screenHeight > wallTop;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    // Only re-render when crossing a quarter screen; the checks above are coarse.
    if (Math.abs(y - scrollY) > screenHeight / 4) setScrollY(y);
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(e.nativeEvent.contentOffset.y);
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
        onScrollEndDrag={onScrollEnd}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={100}
      >
        
        {/* Combined Dashboard Card */}
        <ContinuumCard />

        <StoryBoardCard />

        {/* The scheduler above builds these in the background, one per idle
            period, so they are already there when the page is scrolled. */}
        <View>
          {readySections.map && stampsLoaded ? <StampAlbumCard /> : <MapSkeleton />}
        </View>

        <View>
          {readySections.calendar && activeDates !== null ? (
            /* Time Machine Section */
            <View style={[styles.portfolioSection, { backgroundColor: elementBg, borderColor: borderColor }]}>
              <TECalendar onSelect={(date) => navigate.push(`/time-machine?day=${toDayKey(date)}`)} />
            </View>
          ) : (
            <CalendarSkeleton />
          )}
        </View>

        <View>
          {readySections.activity && dayCounts !== null ? <ActivityGrid /> : <ActivitySkeleton />}
        </View>

        <View onLayout={(event) => setWallTop(event.nativeEvent.layout.y)}>
          {readySections.wall ? (
            <>
              {/* Today's memory from the past — photo-first, opens the memory */}
              <FromYourPastCard visible={wallVisible} />

              {/* ASCII Easter Egg Mascot */}
              <View style={styles.mascotContainer}>
                <AsciiArt art={SYS_READY_ART} color="#878787" fontSize={10} />
                <ThemedText style={styles.mascotSubtitle}>FOLD</ThemedText>
              </View>
            </>
          ) : (
            <PastWallSkeleton />
          )}
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
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  portfolioSection: {
    marginBottom: 24,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
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
