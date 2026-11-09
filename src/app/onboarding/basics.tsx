/**
 * Onboarding basics — three slides, one per gesture on the orange key
 * (the first chapter of the Field Guide), so everyone leaves onboarding
 * knowing how to capture. Each slide has to be done, not skipped: NEXT
 * unlocks once its gesture has saved a memory (or the mic/camera is off),
 * and there's no swiping ahead. BACK always works; dots show where you are.
 *
 * The key is the real key: tap opens the writing page, hold records a voice
 * note, swipe up opens the camera. When the memory is saved and you're
 * back, the slide confirms it and moves on; a wrong gesture says what to
 * do instead. Same rule as the Field Guide: only a real saved memory counts.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

import { AddButton } from '@/components/add-button';
import { RecordingOverlay } from '@/components/recording-overlay';
import { GrainBackground } from '@/components/grain-background';
import { GestureHint } from '@/components/guide/gesture-hint';
import { StepMarker } from '@/components/onboarding/onboarding-frame';
import { ThemedText } from '@/components/themed-text';
import { GUIDE_STEPS, type GuideStepId } from '@/constants/guide';
import { fadeIn, riseIn } from '@/constants/motion';
import { useLatestMemory } from '@/hooks/use-latest-memory';
import { useQuickCapture } from '@/hooks/use-quick-capture';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { goBack } from '@/utils/navigation';

const SLIDE_IDS: GuideStepId[] = ['write', 'voice', 'capture'];
const SLIDES = SLIDE_IDS.map((id) => GUIDE_STEPS.find((step) => step.id === id)!);
type KeyGesture = 'tap' | 'hold' | 'swipe-up';
const NAMES: Record<KeyGesture, string> = { tap: 'a tap', hold: 'a hold', 'swipe-up': 'a swipe' };
const DONE: Record<KeyGesture, string> = { tap: 'written. saved to your journal.', hold: 'recorded. saved to your journal.', 'swipe-up': 'snapped. saved to your journal.' };
const DENIED = { hold: 'mic is off. allow it in settings, or tap next.', 'swipe-up': 'camera is off. allow it in settings, or tap next.' };

export default function OnboardingBasicsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  // Slides whose gesture has been done (or can't be, with permission off).
  const [cleared, setCleared] = useState<ReadonlySet<number>>(() => new Set());
  const clear = (i: number) => setCleared((prev) => new Set(prev).add(i));
  const canAdvance = cleared.has(index);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  const goTo = (next: number) => {
    haptic.select();
    setFeedback(null);
    setIndex(next);
    scroller.current?.scrollTo({ x: next * width, animated: true });
  };

  const quickCapture = useQuickCapture();
  const latest = useLatestMemory();

  // Success = a memory newer than the newest one when this slide began.
  const baseline = useRef<number | null>(null);
  const newestId = latest.memory?.id ?? 0;
  useEffect(() => {
    baseline.current = latest.loaded ? newestId : null;
    // Re-baseline only when the slide changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, latest.loaded]);
  useEffect(() => {
    if (baseline.current === null || newestId <= baseline.current) return;
    baseline.current = newestId;
    const gesture = SLIDES[index].gesture as KeyGesture;
    haptic.success();
    clear(index);
    setFeedback({ text: DONE[gesture], ok: true });
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => (isLast ? router.push('/onboarding/tour') : goTo(index + 1)), 1100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestId]);

  const tryGesture = async (done: KeyGesture) => {
    const expected = SLIDES[index].gesture as KeyGesture;
    if (done !== expected) {
      haptic.select();
      setFeedback({ text: `that was ${NAMES[done]}. try ${NAMES[expected]}.`, ok: false });
      return;
    }
    setFeedback(null);
    if (done === 'tap') {
      router.push('/compose');
    } else if (done === 'hold') {
      if ((await quickCapture.startRecording()) === 'denied') {
        clear(index);
        setFeedback({ text: DENIED.hold, ok: false });
      }
    } else if ((await quickCapture.capturePhoto()) === 'denied') {
      clear(index);
      setFeedback({ text: DENIED['swipe-up'], ok: false });
    }
  };

  const onBack = () => (index === 0 ? goBack('/onboarding/dob') : goTo(index - 1));
  const onNext = () => {
    if (!canAdvance) return;
    if (isLast) router.push('/onboarding/tour');
    else goTo(index + 1);
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
        // Slides move only with BACK / NEXT, so none can be swiped past.
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
      >
        {SLIDES.map((slide, i) => (
          <View key={slide.id} style={[styles.slide, { width }]}>
            <ThemedText style={[styles.kicker, { color: theme.textMuted }]}>
              THE BASICS · {i + 1} OF {SLIDES.length}
            </ThemedText>
            <ThemedText style={[styles.title, { color: theme.text }]}>{slide.title}</ThemedText>
            <ThemedText style={[styles.hint, { color: theme.textMuted }]}>{slide.hint}</ThemedText>

            {/* Live practice: the ghost finger shows it, the key takes it. */}
            <View style={styles.feedbackSlot}>
              {i === index && feedback && (
                <Animated.View key={feedback.text} entering={fadeIn(180)}>
                  <ThemedText style={[styles.feedback, { color: feedback.ok ? theme.accentWarm : theme.textMuted }]}>
                    {feedback.text}
                  </ThemedText>
                </Animated.View>
              )}
            </View>
            <View style={styles.demo}>
              <View>
                <AddButton
                  onPress={() => tryGesture('tap')}
                  onHold={() => tryGesture('hold')}
                  onSwipeUp={() => tryGesture('swipe-up')}
                />
                <GestureHint
                  gesture={slide.gesture}
                  visible={i === index && !feedback?.ok && !quickCapture.isRecording}
                  style={StyleSheet.absoluteFill}
                />
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
        <Pressable
          onPress={onNext}
          disabled={!canAdvance}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Continue' : 'Next'}
          accessibilityState={{ disabled: !canAdvance }}
          style={[styles.navButton, !canAdvance && styles.navLocked]}
        >
          <ThemedText style={[styles.navText, { color: theme.text }]}>{isLast ? 'CONTINUE' : 'NEXT'}</ThemedText>
          <ArrowRight size={18} color={theme.text} strokeWidth={1.75} />
        </Pressable>
      </Animated.View>

      <RecordingOverlay
        visible={quickCapture.isRecording}
        durationMillis={quickCapture.durationMillis}
        onStop={quickCapture.stopRecording}
      />
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
  feedbackSlot: {
    height: 20,
    marginTop: 28,
    justifyContent: 'center',
  },
  feedback: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 12,
    letterSpacing: 1,
    textAlign: 'center',
  },
  demo: {
    marginTop: 24,
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
  navLocked: { opacity: 0.3 },
  navText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 13,
    letterSpacing: 2,
  },
});
