import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, Alert, Platform, useWindowDimensions, Pressable, Image as RNImage } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn, FadeInUp, FadeInDown,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withRepeat,
  Easing,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AudioModule, useAudioRecorder, useAudioRecorderState, RecordingPresets } from 'expo-audio';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Device from 'expo-device';

import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/hooks/use-settings';
import { useJournalStore } from '@/hooks/use-journal';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { AddButton } from '@/components/add-button';
import { RecordingOverlay } from '@/components/recording-overlay';
import { MemoryCard } from '@/components/memory-card';
import { LogoUploadFlight } from '@/components/logo-upload-flight';
import { ActionLink } from '@/components/action-link';
import { setPendingCameraMedia } from '@/utils/pending-camera-media';
import { isValidDob } from '@/utils/dob';
import type { Composition, MediaElement } from '@/types/journal';

export default function OnboardingGuideScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const cardHeight = Math.min(screenWidth * 1.618, screenHeight * 0.78);
  const cardWidth = screenWidth - 42;
  const { updateSetting } = useSettingsStore();
  const { compositions, addComposition } = useJournalStore();

  const [phase, setPhase] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const initialCount = useRef(compositions.length);
  const isCameraOpenRef = useRef(false);

  // Keep a ref in sync with phase so gesture callbacks always read current value
  const phaseRef = useRef(1);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Phase 5 Flight animation
  const [scanKey, setScanKey] = useState<number>(0);
  const [isSharing, setIsSharing] = useState(false);
  const hiddenCardRef = useRef<View>(null);

  const textScale = useSharedValue(1);
  const pressedScale = useSharedValue(1);

  // For Phase 2: Audio Recording
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const recordIntentRef = useRef(false);

  // Fallback memory card if firstMemory is not yet composed
  const guideTextMemory: Composition = useMemo(() => ({
    id: 999999,
    textContent: 'Today I started using Fold.',
    createdAt: Date.now(),
    mediaElements: [],
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 18,
    storyIds: [],
  }), []);

  // Phases 6 & 7 Sticker State
  const initialStickerElements = useMemo<MediaElement[]>(() => {
    let craneUri = '';
    let photoUri = '';
    try {
      craneUri = RNImage.resolveAssetSource(require('../../assets/fold-logo.png'))?.uri || '';
      photoUri = RNImage.resolveAssetSource(require('../../assets/images/sticker-demo-photo.jpg'))?.uri || '';
    } catch {
      // fallback
    }
    return [
      {
        id: 'onboard-sticker-1',
        uri: craneUri,
        type: 'image',
        x_pos: 16,
        y_pos: 30,
        scale: 0.9,
      },
      {
        id: 'onboard-sticker-2',
        uri: photoUri,
        type: 'image',
        x_pos: Math.max(110, cardWidth - 130),
        y_pos: 140,
        scale: 1,
        width: 120,
        height: 120,
      },
    ];
  }, [cardWidth]);

  const [guideStickers, setGuideStickers] = useState<MediaElement[]>(initialStickerElements);

  const guideStickerMemory: Composition = useMemo(() => ({
    id: 999998,
    textContent: 'Every memory has layers.\nPin photos, artwork, and stamps anywhere on your card.',
    createdAt: Date.now() - 3600000,
    mediaElements: guideStickers,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 17,
    storyIds: [],
  }), [guideStickers]);

  // Phase advancement
  const handleActionSuccess = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid), 60);

    setIsSuccess(true);

    textScale.value = withSequence(
      withTiming(0.92, { duration: 50 }),
      withTiming(1, { duration: 150 })
    );

    setTimeout(() => {
      setIsSuccess(false);
      setPhase(prev => (prev < 8 ? prev + 1 : 8));
    }, 1000);
  }, [textScale]);

  // Handler for sticker gestures in phases 6 (drag) & 7 (pinch)
  const handleStickerUpdatePositions = useCallback((_id: number, updatedMedia: MediaElement[]) => {
    const currentPhase = phaseRef.current;
    if ((currentPhase === 6 || currentPhase === 7) && !isSuccess) {
      // Phase 6: success on drag (position moved > 4px)
      const positionChanged = updatedMedia.some(u => {
        const prev = guideStickers.find(s => s.id === u.id);
        return prev && (Math.abs(u.x_pos - prev.x_pos) > 4 || Math.abs(u.y_pos - prev.y_pos) > 4);
      });
      // Phase 7: success on pinch (scale changed > 4%)
      const scaleChanged = updatedMedia.some(u => {
        const prev = guideStickers.find(s => s.id === u.id);
        return prev && Math.abs((u.scale ?? 1) - (prev.scale ?? 1)) > 0.04;
      });
      const shouldAdvance = currentPhase === 6 ? positionChanged : scaleChanged;
      if (shouldAdvance) {
        setGuideStickers(updatedMedia);
        handleActionSuccess();
        return;
      }
    }
    setGuideStickers(updatedMedia);
  }, [handleActionSuccess, isSuccess, guideStickers]);

  // Monitor Composition Count to auto-advance Phase 1, 2, and 3
  useFocusEffect(
    useCallback(() => {
      if (isSuccess) return;

      if ((phase === 1 || phase === 2 || phase === 3) && compositions.length > initialCount.current) {
        initialCount.current = compositions.length;
        handleActionSuccess();
      }

      if (compositions.length < initialCount.current) {
        initialCount.current = compositions.length;
      }
    }, [compositions.length, phase, isSuccess, handleActionSuccess])
  );

  const handleComplete = async () => {
    const { name, dob } = useSettingsStore.getState().settings;
    if (!name.trim() || !isValidDob(dob)) {
      router.replace('/onboarding/name');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateSetting('hasOnboarded', true);
    router.replace('/');
  };

  // Phase 8: show a CTA button after a brief dramatic pause
  const [showProceedBtn, setShowProceedBtn] = useState(false);
  useEffect(() => {
    if (phase === 8) {
      setShowProceedBtn(false);
      const timer = setTimeout(() => setShowProceedBtn(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // ---------------------------------------------------------------------------
  // Phase 1: Tap to write
  // ---------------------------------------------------------------------------

  const handleTap = () => {
    if (phase !== 1) return;
    router.push({ pathname: '/compose', params: { sharedText: 'Today I started using Fold.' } });
  };

  // ---------------------------------------------------------------------------
  // Phase 2: Hold to record
  // ---------------------------------------------------------------------------

  const handleLongPressStart = async () => {
    if (phase !== 2) return;
    try {
      recordIntentRef.current = true;
      const { status } = await AudioModule.requestRecordingPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Microphone Required', 'Fold needs the mic to capture your voice.', [{ text: 'Skip', onPress: handleActionSuccess }]);
        return;
      }

      await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();

      if (!recordIntentRef.current) return;
      await recorder.record();
    } catch (err) {
      console.error('Failed to start quick record', err);
    }
  };

  const handleLongPressEnd = async () => {
    if (phase !== 2) return;
    try {
      recordIntentRef.current = false;
      if (recorder.isRecording || recorder.uri) {
        await recorder.stop();
        const uri = recorder.uri;
        if (uri) {
          const extMatch = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
          const ext = extMatch ? extMatch[1].toLowerCase() : 'm4a';
          const dest = `${FileSystem.documentDirectory}audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

          await FileSystem.copyAsync({ from: uri, to: dest });

          const newMedia = {
            id: Math.random().toString(36).substring(2, 9),
            uri: dest,
            type: 'audio' as const,
            x_pos: 30 + Math.random() * 100,
            y_pos: 30 + Math.random() * 100,
          };

          await addComposition({
            textContent: '',
            mediaElements: [newMedia],
            fontFamily: 'JetBrainsMono-Regular',
            fontSize: 16
          });
        }
      }
    } catch (err) {
      console.error('Failed to stop quick record', err);
    }
  };

  // ---------------------------------------------------------------------------
  // Phase 3: Swipe up to capture
  // ---------------------------------------------------------------------------

  const handleSwipeUp = async () => {
    if (phase !== 3) return;
    if (isCameraOpenRef.current) return;
    try {
      isCameraOpenRef.current = true;
      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus !== 'granted') {
        Alert.alert('Camera Required', 'Fold needs the camera to capture moments.', [{ text: 'Skip', onPress: handleActionSuccess }]);
        isCameraOpenRef.current = false;
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const extMatch = asset.uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
        const dest = `${FileSystem.documentDirectory}camera_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

        await FileSystem.copyAsync({ from: asset.uri, to: dest });

        setPendingCameraMedia({
          uri: dest,
          type: 'image',
          width: asset.width,
          height: asset.height,
        });

        router.push('/compose');
      }
    } catch (error) {
      console.error(error);
    } finally {
      isCameraOpenRef.current = false;
    }
  };

  // ---------------------------------------------------------------------------
  // Phase 4 & 5: Card gestures
  // All logic runs on JS thread via runOnJS to avoid stale closures.
  // phaseRef.current is always the latest phase value.
  // compositions is read fresh from the store via useJournalStore.
  // ---------------------------------------------------------------------------

  const firstMemory = compositions[0];

  // JS-thread handler for double-tap (Phase 4)
  const handleDoubleTap = useCallback(() => {
    console.log('[GESTURE] handleDoubleTap fired in JS! phase:', phaseRef.current);
    const mem = useJournalStore.getState().compositions[0];
    if (phaseRef.current === 4 && mem) {
      console.log('[GESTURE] handleDoubleTap condition met! Pushing router...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/memory/${mem.id}`);
      handleActionSuccess();
    } else {
      console.log('[GESTURE] handleDoubleTap condition failed. Phase:', phaseRef.current, 'Mem:', mem?.id);
    }
  }, [handleActionSuccess]);

  // JS-thread handler for long-press share (Phase 5)
  const triggerShare = useCallback(() => {
    setIsSharing(true);
    setScanKey(prev => prev + 1);

    setTimeout(() => {
      const advance = () => {
        setIsSharing(false);
        handleActionSuccess();
      };
      if (hiddenCardRef.current) {
        captureRef(hiddenCardRef, { format: 'png', quality: 1 })
          .then(uri => Sharing.shareAsync(uri))
          .catch(() => {})
          .finally(() => advance());
      } else {
        advance();
      }
    }, 1750);
  }, [handleActionSuccess]);

  const handleLongPressCard = useCallback(() => {
    const mem = useJournalStore.getState().compositions[0];
    if (phaseRef.current === 5 && mem) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      triggerShare();
    }
  }, [triggerShare]);


  // Subtle, premium breathing arrow animation
  const arrowOffset = useSharedValue(0);
  useEffect(() => {
    arrowOffset.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateY: arrowOffset.value }] }));

  // --- NATIVE TOUCH HANDLERS (No RNGH) ---
  const lastTapRef = useRef(0);

  const handleCardPress = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    if (timeSinceLastTap < 300) {
      // Double Tap Detected natively
      console.log('[NATIVE] Double tap detected! Phase:', phaseRef.current);
      if (phaseRef.current === 4) {
        handleDoubleTap();
      }
      lastTapRef.current = 0; // Reset
    } else {
      lastTapRef.current = now;
    }
  }, [handleDoubleTap]);

  const handleCardLongPress = useCallback(() => {
    console.log('[NATIVE] Long press detected! Phase:', phaseRef.current);
    if (phaseRef.current === 5) {
      handleLongPressCard();
    }
  }, [handleLongPressCard]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressedScale.value }] }));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const bg = theme.background;
  const fg = theme.text;
  const accent = '#FF4B00';

  const animatedTextStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
  }));

  const renderInstruction = (text: string) => {
    if (isSuccess) {
      return (
        <Animated.View style={animatedTextStyle}>
          <ThemedText style={[styles.instruction, { color: accent, fontFamily: 'JetBrainsMono-Bold' }]}>
            [ CAPTURED ]
          </ThemedText>
        </Animated.View>
      );
    }
    return (
      <Animated.View style={animatedTextStyle}>
        <ThemedText style={[styles.instruction, { color: fg }]}>
          {text}
        </ThemedText>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <GrainBackground />

      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.textContainer} pointerEvents="box-none">
          {phase === 1 && (
            <Animated.View
              key="phase1"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={[styles.phaseBlock, { justifyContent: 'center', marginTop: -100 }]}
              pointerEvents="box-none"
            >
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 1</ThemedText>
              {renderInstruction('tap to write.')}
            </Animated.View>
          )}

          {phase === 2 && (
            <Animated.View
              key="phase2"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={[styles.phaseBlock, { justifyContent: 'center', marginTop: -100 }]}
              pointerEvents="box-none"
            >
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 2</ThemedText>
              {renderInstruction('hold to capture your voice.')}
            </Animated.View>
          )}

          {phase === 3 && (
            <Animated.View
              key="phase3"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={[styles.phaseBlock, { justifyContent: 'center', marginTop: -100 }]}
              pointerEvents="box-none"
            >
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 3</ThemedText>
              {renderInstruction('swipe up trigger\nfor instant camera.')}
            </Animated.View>
          )}

          {phase === 4 && (
            <Animated.View
              key="phase4"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={styles.phaseBlockCompact}
              pointerEvents="box-none"
            >
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 4</ThemedText>
              {renderInstruction('double tap to inspect memory.')}
            </Animated.View>
          )}

          {phase === 5 && (
            <Animated.View
              key="phase5"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={styles.phaseBlockCompact}
              pointerEvents="box-none"
            >
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 5</ThemedText>
              {renderInstruction('hold to share your memory.')}
            </Animated.View>
          )}

          {phase === 6 && (
            <Animated.View
              key="phase6"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={styles.phaseBlockCompact}
              pointerEvents="box-none"
            >
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 6</ThemedText>
              {renderInstruction('hold a sticker, drag to place.')}
            </Animated.View>
          )}

          {phase === 7 && (
            <Animated.View
              key="phase7"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={styles.phaseBlockCompact}
              pointerEvents="box-none"
            >
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 7</ThemedText>
              {renderInstruction('pinch a sticker to zoom in or out.')}
            </Animated.View>
          )}

          {phase === 8 && (
            <Animated.View
              key="phase8"
              entering={SlideInRight}
              style={[styles.phaseBlock, { justifyContent: 'center', marginTop: -80, gap: 10 }]}
              pointerEvents="box-none"
            >
              <ThemedText style={[styles.phaseTitle, { color: accent }]}>YOU'RE READY</ThemedText>
              <ThemedText style={[styles.instruction, { color: fg }]}>
                {'every memory, every voice, every moment.\nfold keeps it all.'}
              </ThemedText>
            </Animated.View>
          )}
        </View>

        {/* Action Area — AddButton for phases 1-3, button for 8 */}
        <Animated.View
          entering={FadeIn.delay(400).duration(800)}
          pointerEvents="box-none"
          style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) + (Platform.OS === 'android' ? 14 : 0) }]}
        >
          {phase <= 3 ? (
            <View style={{ alignItems: 'center', gap: 12 }}>
              {!isSuccess && (
                <Animated.View entering={FadeIn.delay(1000).duration(800)} style={arrowStyle}>
                  <ThemedText style={{
                    fontFamily: 'JetBrainsMono-Regular',
                    fontSize: 22,
                    color: theme.text,
                    opacity: 0.4,
                  }}>
                    {phase === 3 ? '↑' : '↓'}
                  </ThemedText>
                </Animated.View>
              )}
              <AddButton
                onPress={() => { if (phase === 1) handleTap(); else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }}
                onSwipeUp={() => { if (phase === 3) handleSwipeUp(); else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }}
                onLongPressStart={() => { if (phase === 2) handleLongPressStart(); else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }}
                onLongPressEnd={() => { if (phase === 2) handleLongPressEnd(); }}
              />
            </View>
          ) : phase === 8 && showProceedBtn ? (
            <Animated.View entering={FadeInUp.duration(500).springify()}>
              <ActionLink text="START JOURNALING" onPress={handleComplete} />
            </Animated.View>
          ) : null}
        </Animated.View>

        {/* Full-size memory card for phases 4 & 5 (text memory card) */}
        {phase >= 4 && phase <= 5 && (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={[{
              position: 'absolute',
              bottom: Math.max(insets.bottom, 12),
              left: 21,
              right: 21,
              height: cardHeight,
              zIndex: 500,
            }, cardAnimatedStyle]}
          >
            <Pressable
              onPressIn={() => { pressedScale.value = withTiming(0.96, { duration: 150 }); }}
              onPressOut={() => { pressedScale.value = withTiming(1, { duration: 150 }); }}
              onPress={handleCardPress}
              onLongPress={handleCardLongPress}
              delayLongPress={500}
              style={{ flex: 1, width: '100%', height: '100%' }}
            >
              <View pointerEvents="none" style={{ flex: 1, width: '100%', height: '100%' }}>
                <MemoryCard
                  item={firstMemory || guideTextMemory}
                  height={cardHeight}
                  onUpdatePositions={() => {}}
                  isExporting={false}
                />
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* Full-size memory card for phases 6 & 7 (sticker demo card) */}
        {(phase === 6 || phase === 7) && (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={[{
              position: 'absolute',
              bottom: Math.max(insets.bottom, 12),
              left: 21,
              right: 21,
              height: cardHeight,
              zIndex: 500,
            }, cardAnimatedStyle]}
          >
            <View style={{ flex: 1, width: '100%', height: '100%' }}>
              <MemoryCard
                item={guideStickerMemory}
                height={cardHeight}
                onUpdatePositions={handleStickerUpdatePositions}
                isExporting={false}
              />
              <View style={styles.canvasHintOverlay} pointerEvents="none">
                <View style={[styles.canvasHintPill, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <ThemedText style={[styles.canvasHintText, { color: theme.textMuted }]}>
                    {phase === 6 ? 'HOLD TO LIFT · DRAG TO PLACE' : 'PINCH WITH TWO FINGERS TO SCALE'}
                  </ThemedText>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Hidden Card For Sharing */}
        {isSharing && (
          <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -100, width: cardWidth, height: cardHeight }}>
            <View ref={hiddenCardRef} collapsable={false} style={{ width: cardWidth, height: cardHeight }}>
              <MemoryCard
                item={firstMemory || guideTextMemory}
                height={cardHeight}
                onUpdatePositions={() => {}}
                isExporting={true}
              />
            </View>
          </View>
        )}

      </View>

      {/* Flight Animation & Recording Overlay */}
      {isSharing && <LogoUploadFlight color={fg} key={scanKey} />}
      <RecordingOverlay visible={recorderState.isRecording} durationMillis={recorderState.durationMillis} onStop={handleLongPressEnd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  textContainer: { flex: 1, width: '100%', zIndex: 100 },
  phaseBlock: {
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  phaseBlockCompact: {
    alignItems: 'center',
    paddingTop: 6,
    paddingHorizontal: 24,
    zIndex: 600,
  },
  phaseTitle: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 16,
    letterSpacing: 4,
    marginBottom: 6,
    opacity: 0.5,
    textAlign: 'center',
  },
  instruction: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
  },
  canvasHintOverlay: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  canvasHintPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  canvasHintText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    letterSpacing: 1.5,
  },
});
