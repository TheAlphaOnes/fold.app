/**
 * The last onboarding step: offers the Field Guide tour and shows where the
 * guide lives on the home screen, using the same tab shapes as home.
 *
 * Either answer finishes onboarding. "Take the tour" opens the guide right
 * away; "I'll explore" lands on home, where the guide tab is pointed out once.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { User } from 'lucide-react-native';

import { GuideRing } from '@/components/field-guide-tab';
import { EDGE_TAB_GAP, EDGE_TAB_HEIGHT, EDGE_TAB_WIDTH } from '@/components/edge-tab';
import { OnboardingFrame } from '@/components/onboarding/onboarding-frame';
import { ThemedText } from '@/components/themed-text';
import { GUIDE_MISSION_COUNT } from '@/constants/guide';
import { EASE_IN_OUT, fadeIn, riseIn } from '@/constants/motion';
import { useSettingsStore } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { track } from '@/services/analytics';
import { getAgeRange } from '@/utils/dob';
import { goBack } from '@/utils/navigation';

const LESSONS = [
  { verb: 'TAP', what: 'write' },
  { verb: 'HOLD', what: 'talk' },
  { verb: 'SWIPE UP', what: 'snap' },
] as const;

export default function OnboardingTourScreen() {
  const theme = useTheme();
  const finish = async (takeTour: boolean) => {
    const { settings, updateSetting } = useSettingsStore.getState();
    haptic.success();
    await updateSetting('hasOnboarded', true);
    track('onboarding_completed', { age_range: getAgeRange(settings.dob), took_tour: takeTour });
    router.replace(takeTour ? '/guide' : '/');
  };

  return (
    <OnboardingFrame
      step={3}
      title="QUICK TOUR?"
      subtitle={'TWO MINUTES, ON YOUR\nOWN MEMORIES.'}
      footnote={'Skip it now? The guide waits\non the home screen, right edge.'}
      onBack={() => goBack('/onboarding/dob')}
      cta={{ text: 'TAKE THE TOUR', onPress: () => void finish(true) }}
      secondary={{ text: 'I’ll explore myself', onPress: () => void finish(false) }}
    >
      <ShelfPreview />
      <View style={styles.lessons}>
        {LESSONS.map((lesson, i) => (
          <Animated.View
            key={lesson.verb}
            entering={riseIn(320, 420 + i * 90, 8)}
            style={[styles.lesson, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            <ThemedText style={[styles.lessonVerb, { color: theme.accentWarm }]}>{lesson.verb}</ThemedText>
            <ThemedText style={[styles.lessonWhat, { color: theme.text }]}>{lesson.what}</ThemedText>
          </Animated.View>
        ))}
      </View>
    </OnboardingFrame>
  );
}

/**
 * The home screen's right edge in miniature: the profile tab, and below it
 * the guide tab with a ring pulsing around it and a label pointing at it.
 */
function ShelfPreview() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withDelay(
      700,
      withRepeat(
        withSequence(withTiming(1, { duration: 1300, easing: EASE_IN_OUT }), withTiming(0, { duration: 0 })),
        -1,
      ),
    );
  }, [pulse, reduceMotion]);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.18 }],
  }));

  const tab = [styles.tab, { backgroundColor: theme.backgroundElement, borderColor: theme.border }];

  return (
    <View style={[styles.screen, { borderColor: theme.border }]}>
      <View style={styles.shelf}>
        <View style={tab}>
          <User size={16} color={theme.text} strokeWidth={2.5} />
        </View>

        <View style={styles.guideRow}>
          <Animated.View entering={fadeIn(360, 560)} style={styles.callout}>
            <ThemedText style={[styles.calloutText, { color: theme.text }]}>the guide</ThemedText>
            <View style={[styles.calloutLine, { backgroundColor: theme.accentWarm }]} />
          </Animated.View>
          <View>
            <Animated.View
              pointerEvents="none"
              style={[styles.pulse, { borderColor: theme.accentWarm }, pulseStyle]}
            />
            <View style={[tab, { borderColor: theme.accentWarm }]}>
              <GuideRing completed={0} total={GUIDE_MISSION_COUNT} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const TAB_RADIUS = 16;

const styles = StyleSheet.create({
  // Bleeds past the content padding to the real screen edge, like home's tabs.
  screen: {
    alignSelf: 'flex-end',
    width: 240,
    height: 136,
    borderWidth: 1,
    borderRightWidth: 0,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    marginRight: -24,
    overflow: 'hidden',
  },
  shelf: {
    position: 'absolute',
    right: 0,
    top: 18,
    alignItems: 'flex-end',
    gap: EDGE_TAB_GAP,
  },
  tab: {
    width: EDGE_TAB_WIDTH,
    height: EDGE_TAB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRightWidth: 0,
    borderTopLeftRadius: TAB_RADIUS,
    borderBottomLeftRadius: TAB_RADIUS,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRightWidth: 0,
    borderTopLeftRadius: TAB_RADIUS,
    borderBottomLeftRadius: TAB_RADIUS,
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  calloutText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  calloutLine: {
    width: 22,
    height: 1.5,
    marginLeft: 8,
    borderRadius: 1,
  },
  lessons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 28,
  },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  lessonVerb: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  lessonWhat: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
  },
});
