/**
 * TriggerStage — CAPTURE chapter (write · voice · snap).
 *
 * The real orange key, placed exactly where the home screen puts it, with the
 * ghost finger demonstrating the gesture. A step succeeds when a new memory
 * actually lands in the journal — the guide never fakes completion. The
 * memory you just made then drops into the centre as a receipt.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Keyframe } from 'react-native-reanimated';
import { haptic } from '@/services/haptics';

import { AddButton } from '@/components/add-button';
import { ThemedText } from '@/components/themed-text';
import { GestureHint } from '@/components/guide/gesture-hint';
import { FittedMemoryCard, useFullCardSize } from '@/components/guide/fitted-memory-card';
import type { GuideStageProps, LatestMemory, StageArea } from '@/components/guide/types';
import { SPRING_BOUNCE, fadeIn, fadeOut } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import type { GuideStepId } from '@/constants/guide';
import type { useQuickCapture } from '@/hooks/use-quick-capture';

type QuickCapture = ReturnType<typeof useQuickCapture>;
type KeyGesture = 'tap' | 'hold' | 'swipe';

const EXPECTED: Partial<Record<GuideStepId, KeyGesture>> = {
  write: 'tap',
  voice: 'hold',
  capture: 'swipe',
};

/** Corrective copy when the key gets the wrong gesture: name what happened, then what to do. */
const NUDGES: Record<KeyGesture, Partial<Record<KeyGesture, string>>> = {
  tap: {
    hold: 'that was a hold. just tap once.',
    swipe: 'that was a swipe. just tap once.',
  },
  hold: {
    tap: 'that was a tap. keep holding.',
    swipe: 'keep your finger still and hold.',
  },
  swipe: {
    tap: 'that was a tap. slide it up.',
    hold: 'no need to hold. slide it up.',
  },
};

const PERMISSION_NUDGE = {
  mic: 'mic is off. allow it in settings, or skip.',
  camera: 'camera is off. allow it in settings, or skip.',
};

// The receipt lands in two segments: it fades in quickly while the card
// itself rises and settles on a slower spring.
const receiptRise = new Keyframe({
  0: { transform: [{ translateY: 22 }, { scale: 0.94 }] },
  100: { transform: [{ translateY: 0 }, { scale: 1 }], easing: SPRING_BOUNCE },
}).duration(420);

const RECEIPT_LABEL_HEIGHT = 28;
const RECEIPT_MAX_SCALE = 0.6;

interface TriggerStageProps extends GuideStageProps {
  latest: LatestMemory;
  /** Highest memory id when the guide opened; anything above it was made here. */
  sessionStartId: number | null;
  quickCapture: QuickCapture;
}

export function TriggerStage({
  step,
  status,
  latest,
  sessionStartId,
  quickCapture,
  onSuccess,
  onNudge,
}: TriggerStageProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const full = useFullCardSize();
  const expected = EXPECTED[step.id];
  const isActive = status === 'active';

  // Success = a memory newer than the one that existed when this step began.
  const baselineId = useRef<number | null>(null);
  useEffect(() => {
    baselineId.current = null;
  }, [step.id]);

  const newestId = latest.memory?.id ?? 0;
  useEffect(() => {
    if (!latest.loaded) return;
    if (baselineId.current === null) {
      baselineId.current = newestId;
      return;
    }
    if (isActive && newestId > baselineId.current) {
      baselineId.current = newestId;
      onSuccess();
    }
  }, [latest.loaded, newestId, step.id, isActive, onSuccess]);

  const nudgeFor = useCallback((actual: KeyGesture) => {
    if (!expected || actual === expected) return;
    const message = NUDGES[expected][actual];
    if (!message) return;
    haptic.warning();
    onNudge(message);
  }, [expected, onNudge]);

  const handleTap = () => {
    if (expected !== 'tap') return nudgeFor('tap');
    router.push('/compose');
  };

  const handleHoldStart = async () => {
    if (expected !== 'hold') return nudgeFor('hold');
    const result = await quickCapture.startRecording();
    if (result === 'denied') onNudge(PERMISSION_NUDGE.mic);
  };

  const handleSwipeUp = async () => {
    if (expected !== 'swipe') return nudgeFor('swipe');
    const result = await quickCapture.capturePhoto();
    if (result === 'denied') onNudge(PERMISSION_NUDGE.camera);
  };

  const [receiptArea, setReceiptArea] = useState<StageArea | null>(null);
  const onReceiptLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setReceiptArea({ width: width - 64, height: height - RECEIPT_LABEL_HEIGHT - 24 });
  };

  const sessionMemory =
    latest.memory && sessionStartId !== null && latest.memory.id > sessionStartId ? latest.memory : null;

  const slotScale = receiptArea
    ? Math.min(RECEIPT_MAX_SCALE, receiptArea.width / full.width, receiptArea.height / full.height)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.receipt} onLayout={onReceiptLayout}>
        {receiptArea && slotScale > 0 && (
          sessionMemory ? (
            <Animated.View key={sessionMemory.id} entering={fadeIn(200)} exiting={fadeOut()} style={styles.receiptInner}>
              <ThemedText style={[styles.receiptLabel, { color: theme.textMuted }]}>
                SAVED TO YOUR JOURNAL
              </ThemedText>
              <Animated.View entering={receiptRise}>
                <FittedMemoryCard memory={sessionMemory} area={receiptArea} maxScale={RECEIPT_MAX_SCALE} />
              </Animated.View>
            </Animated.View>
          ) : (
            <Animated.View key="slot" entering={fadeIn(260, 120)} exiting={fadeOut()} style={styles.receiptInner}>
              <ThemedText style={[styles.receiptLabel, { color: theme.textMuted }]}>
                YOUR FIRST MEMORY LANDS HERE
              </ThemedText>
              <View
                style={[
                  styles.slot,
                  {
                    width: full.width * slotScale,
                    height: full.height * slotScale,
                    borderRadius: 34 * slotScale,
                    borderColor: theme.border,
                  },
                ]}
              />
            </Animated.View>
          )
        )}
      </View>

      <View
        style={[
          styles.keyBar,
          { paddingBottom: Math.max(insets.bottom, 24) + (Platform.OS === 'android' ? 14 : 0) },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.keyAnchor}>
          <AddButton
            onPress={handleTap}
            onHold={handleHoldStart}
            onSwipeUp={handleSwipeUp}
          />
          <GestureHint gesture={step.gesture} visible={isActive && !quickCapture.isRecording} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  receipt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptInner: {
    alignItems: 'center',
    gap: 12,
  },
  receiptLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 2,
  },
  slot: {
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.8,
  },
  keyBar: {
    alignItems: 'center',
    paddingTop: 12,
  },
  keyAnchor: {
    width: 150,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
