/**
 * ProfileScreen — the profile as one kept-alive layer over the timeline.
 *
 * It is not a pushed route: a route is unmounted when it pops, and
 * rebuilding this page on every open (the MapLibre view above all) is what
 * made each open take seconds. Home mounts this layer once per session and
 * keeps it; the profile tab and the close button only flip the visibility
 * store, and the layer slides on the UI thread. Anything pushed from here —
 * settings, the time machine, a memory — slides over it and comes back to
 * it, exactly as it would over a route.
 *
 * The heavy sections still build one per idle period after the first open,
 * behind their skeletons — never inside the slide's frames, and never twice.
 */

import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View, ScrollView, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings as SettingsIcon } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/hooks/use-settings';
import { useProfileVisibility } from '@/hooks/use-profile-visibility';
import { useProfileDataStore } from '@/hooks/use-profile-data';
import { useStamps } from '@/hooks/use-stamps';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { AsciiArt } from '@/components/ascii-art';
import { SYS_READY_ART } from '@/constants/ascii-art';
import { DURATION, EASE_IN, EASE_OUT } from '@/constants/motion';
import { AlmanacCard } from '@/components/almanac/almanac-card';
import { FromYourPastCard } from '@/components/from-your-past-card';
import { ContinuumCard } from '@/components/continuum/continuum-card';
import { StoryBoardCard } from '@/components/profile/story-board-card';
import { StampAlbumCard } from '@/components/profile/stamp-album-card';
import { ActivitySkeleton, CalendarSkeleton, MapSkeleton, PastWallSkeleton } from '@/components/profile/profile-skeleton';
import { ProfileAvatar } from '@/components/profile-avatar';
import { CloseButton, RoundButton } from '@/components/round-button';
import { TECalendar } from '@/components/te-calendar';
import { track } from '@/services/analytics';
import { toDayKey } from '@/utils/format-date';
import { navigate } from '@/utils/navigation';

type ProfileSection = 'map' | 'calendar' | 'activity' | 'wall';

/** Heavy sections build in this order, one per idle callback. */
const SECTION_ORDER: ProfileSection[] = ['map', 'calendar', 'activity', 'wall'];

/** Slack for the slide's completion callback, like the old transition fallback. */
const ARRIVAL_SLACK_MS = 120;

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const bg = theme.background;
  const fg = theme.text;
  const elementBg = theme.backgroundElement;
  const borderColor = theme.border;
  const mutedText = theme.textMuted;
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();

  // The tab and the close button only flip this; the slide is the layer's.
  const open = useProfileVisibility((state) => state.open);
  const closeProfile = useProfileVisibility((state) => state.closeProfile);

  // Set by the tab itself, not by an effect: once the profile has been
  // asked for, its content stays mounted for the whole session.
  const everOpened = useProfileVisibility((state) => state.everOpened);
  const slide = useSharedValue(screenWidth);
  // True from the first open's landing on: sections may start building.
  const [arrived, setArrived] = useState(false);

  const [mounted, setMounted] = useState<Record<ProfileSection, boolean>>({
    map: false,
    calendar: false,
    activity: false,
    wall: false,
  });
  const [scrollY, setScrollY] = useState(0);
  const [wallTop, setWallTop] = useState<number | undefined>(undefined);
  // While a finger is on the map, the page stops scrolling so pans and
  // pinches move the map instead of the page.
  const [mapActive, setMapActive] = useState(false);

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

  // The open and the close, on the UI thread: in like a pushed page, out
  // faster (exits always beat entrances). The arrival callback — backed by
  // a timeout, the way the route version backed the stack's transitionEnd —
  // is what lets the section build-out start, never inside the slide.
  // Between visits the layer stays in the tree, parked off screen with its
  // touches and accessibility off; only the transform moves.
  useEffect(() => {
    if (open) {
      slide.value = screenWidth;
      slide.value = withTiming(0, { duration: DURATION.page, easing: EASE_OUT }, (finished) => {
        if (finished) runOnJS(setArrived)(true);
      });
      const fallback = setTimeout(() => setArrived(true), DURATION.page + ARRIVAL_SLACK_MS);
      return () => clearTimeout(fallback);
    }
    if (!everOpened) return;
    slide.value = withTiming(screenWidth, { duration: DURATION.exit, easing: EASE_IN });
  }, [open, everOpened, screenWidth, slide]);

  // One per open: how the open felt, warm or cold. The first open of a
  // session builds the sections; every later one finds them standing.
  const warmVisitRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    track('profile_opened', { warm_visit: warmVisitRef.current });
    warmVisitRef.current = true;
  }, [open]);

  // The layer is not a route, so Android's back button has no pop to
  // trigger; it closes the layer the way the close button does.
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeProfile();
      return true;
    });
    return () => subscription.remove();
  }, [open, closeProfile]);

  const nextSection = SECTION_ORDER.find((key) => {
    if (mounted[key]) return false;
    if (key === 'map') return stampsLoaded;
    if (key === 'calendar') return activeDates !== null;
    if (key === 'activity') return dayCounts !== null;
    return pastMemories !== null;
  });

  // One section per idle period, in order, once the first open has landed.
  // Sections stay mounted for the session, so this build-out runs once ever.
  useEffect(() => {
    if (!nextSection || !arrived) return;
    const idle = requestIdleCallback(() => {
      setMounted((current) => (current[nextSection] ? current : { ...current, [nextSection]: true }));
    });
    return () => cancelIdleCallback(idle);
  }, [arrived, nextSection]);

  // The wall only animates while it can be seen; mounting is never gated.
  const wallVisible = open && wallTop !== undefined && scrollY + screenHeight > wallTop;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    // Only re-render when crossing a quarter screen; the checks above are coarse.
    if (Math.abs(y - scrollY) > screenHeight / 4) setScrollY(y);
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(e.nativeEvent.contentOffset.y);
  };

  const layerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.value }],
  }));

  if (!everOpened) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.layer, layerStyle]}
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
    >
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
            <CloseButton onPress={closeProfile} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!mapActive}
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
            {mounted.map && stampsLoaded ? <StampAlbumCard onInteractChange={setMapActive} /> : <MapSkeleton />}
          </View>

          <View>
            {mounted.calendar && activeDates !== null ? (
              /* Time Machine Section */
              <View style={[styles.portfolioSection, { backgroundColor: elementBg, borderColor: borderColor }]}>
                <TECalendar onSelect={(date) => navigate.push(`/time-machine?day=${toDayKey(date)}`)} />
              </View>
            ) : (
              <CalendarSkeleton />
            )}
          </View>

          <View>
            {mounted.activity && dayCounts !== null ? <AlmanacCard /> : <ActivitySkeleton />}
          </View>

          <View onLayout={(event) => setWallTop(event.nativeEvent.layout.y)}>
            {mounted.wall ? (
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Above the bottom bar's zIndex 999; the recording overlay that follows
  // this layer in home's tree stays on top of everything.
  layer: {
    zIndex: 1000,
    elevation: 100,
  },
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
