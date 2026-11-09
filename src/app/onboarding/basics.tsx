/**
 * Onboarding basics — three slides, one per gesture on the orange key
 * (the first chapter of the Field Guide), so everyone leaves onboarding
 * knowing how to capture. Swipe between slides or use BACK / NEXT; dots
 * show where you are.
 *
 * The key is drawn for demonstration only: a ghost finger performs each
 * gesture on it, and touching it does nothing.
 */

import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

import { AddButton } from '@/components/add-button';
import { GrainBackground } from '@/components/grain-background';
import { GestureHint } from '@/components/guide/gesture-hint';
import { StepMarker } from '@/components/onboarding/onboarding-frame';
import { ThemedText } from '@/components/themed-text';
import { GUIDE_STEPS, type GuideStepId } from '@/constants/guide';
import { fadeIn, riseIn } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { goBack } from '@/utils/navigation';

const SLIDE_IDS: GuideStepId[] = ['write', 'voice', 'capture'];
const SLIDES = SLIDE_IDS.map((id) => GUIDE_STEPS.find((step) => step.id === id)!);
const noop = () => {};

export default function OnboardingBasicsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const goTo = (next: number) => {
    haptic.select();
    setIndex(next);
    scroller.current?.scrollTo({ x: next * width, animated: true });
  };

  const onBack = () => (index === 0 ? goBack('/onboarding/dob') : goTo(index - 1));
  const onNext = () => (isLast ? router.push('/onboarding/tour') : goTo(index + 1));

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) {
      haptic.select();
      setIndex(next);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
      <GrainBackground />

      <Animated.View entering={fadeIn(260)} style={styles.marker}>
        <StepMarker step={3} />
      </Animated.View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {SLIDES.map((slide, i) => (
          <View key={slide.id} style={[styles.slide, { width }]}>
            <ThemedText style={[styles.kicker, { color: theme.textMuted }]}>
              THE BASICS · {i + 1} OF {SLIDES.length}
            </ThemedText>
            <ThemedText style={[styles.title, { color: theme.text }]}>{slide.title}</ThemedText>
            <ThemedText style={[styles.hint, { color: theme.textMuted }]}>{slide.hint}</ThemedText>

            {/* The key, for show: the ghost finger plays this slide's gesture. */}
            <View style={styles.demo} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View>
                <AddButton onPress={noop} />
                <GestureHint gesture={slide.gesture} visible={i === index} style={StyleSheet.absoluteFill} />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <Animated.View entering={riseIn(420, 200, 14)} style={styles.dots} accessibilityElementsHidden>
        {SLIDES.map((slide, i) => (
          <View
            key={slide.id}
            style={[styles.dot, { backgroundColor: i === index ? theme.accentWarm : theme.border, width: i === index ? 20 : 6 }]}
          />
        ))}
      </Animated.View>

      <Animated.View entering={riseIn(440, 280, 16)} style={styles.nav}>
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.navButton}>
          <ArrowLeft size={18} color={theme.textMuted} strokeWidth={1.75} />
          <ThemedText style={[styles.navText, { color: theme.textMuted }]}>BACK</ThemedText>
        </Pressable>
        <Pressable onPress={onNext} hitSlop={12} accessibilityRole="button" accessibilityLabel={isLast ? 'Continue' : 'Next'} style={styles.navButton}>
          <ThemedText style={[styles.navText, { color: theme.text }]}>{isLast ? 'CONTINUE' : 'NEXT'}</ThemedText>
          <ArrowRight size={18} color={theme.text} strokeWidth={1.75} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  marker: { alignItems: 'center' },
  pager: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  kicker: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    letterSpacing: 2,
  },
  title: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 30,
    lineHeight: 42,
    letterSpacing: 3,
    marginTop: 12,
    textAlign: 'center',
  },
  hint: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 1,
    marginTop: 8,
    textAlign: 'center',
  },
  demo: {
    marginTop: 72,
    height: 200,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 28,
  },
  dot: { height: 6, borderRadius: 3 },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    marginBottom: 40,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  navText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 13,
    letterSpacing: 2,
  },
});
