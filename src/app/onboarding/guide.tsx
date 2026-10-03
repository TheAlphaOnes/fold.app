import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, Alert, Platform, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn, FadeInUp,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AudioModule, useAudioRecorder, useAudioRecorderState, RecordingPresets } from 'expo-audio';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Device from 'expo-device';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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

export default function OnboardingGuideScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const cardHeight = screenHeight - insets.top - insets.bottom - 160;
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

  // ---------------------------------------------------------------------------
  // Phase advancement
  // ---------------------------------------------------------------------------

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
      setPhase(prev => prev + 1);
    }, 1000);
  }, [textScale]);

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

  // Phase 6: show a CTA button after a brief dramatic pause
  const [showProceedBtn, setShowProceedBtn] = useState(false);
  useEffect(() => {
    if (phase === 6) {
      setShowProceedBtn(false);
      const timer = setTimeout(() => setShowProceedBtn(true), 2000);
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
      if (recorder.isRecording) {
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

  const handleSwipeUp = async (type: 'photo' | 'video') => {
    if (phase !== 3) return;
    if (isCameraOpenRef.current) return;
    try {
      isCameraOpenRef.current = true;
      if (type === 'video' && !Device.isDevice && Platform.OS === 'ios') {
        Alert.alert('Simulator Unsupported', 'Skipping camera.', [{ text: 'OK', onPress: handleActionSuccess }]);
        isCameraOpenRef.current = false;
        return;
      }

      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus !== 'granted') {
        Alert.alert('Camera Required', 'Fold needs the camera to capture moments.', [{ text: 'Skip', onPress: handleActionSuccess }]);
        isCameraOpenRef.current = false;
        return;
      }

      if (type === 'video') {
        const { status: micStatus } = await AudioModule.requestRecordingPermissionsAsync();
        if (micStatus !== 'granted') {
          isCameraOpenRef.current = false;
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: type === 'video' ? ['videos'] : ['images'],
        allowsEditing: false,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const extMatch = asset.uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : (asset.type === 'video' ? 'mp4' : 'jpg');
        const dest = `${FileSystem.documentDirectory}camera_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

        await FileSystem.copyAsync({ from: asset.uri, to: dest });

        setPendingCameraMedia({
          uri: dest,
          type: asset.type === 'video' ? 'video' : 'image',
          width: asset.width,
          height: asset.height
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

  // Gesture scale feedback helper — runs on UI thread
  const scaleDown = () => {
    'worklet';
    console.log('[GESTURE] scaleDown worklet fired');
    pressedScale.value = withTiming(0.96, { duration: 150 });
  };
  const scaleUp = () => {
    'worklet';
    console.log('[GESTURE] scaleUp worklet fired');
    pressedScale.value = withTiming(1, { duration: 150 });
  };

  const logWorklet = (msg: string) => {
    'worklet';
    console.log(msg);
  };

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onStart(() => {
      'worklet';
      logWorklet('[GESTURE] doubleTap onStart');
      scaleDown();
    })
    .onEnd(() => {
      'worklet';
      logWorklet('[GESTURE] doubleTap onEnd');
      scaleUp();
      runOnJS(handleDoubleTap)();
    })
    .onFinalize(() => {
      'worklet';
      logWorklet('[GESTURE] doubleTap onFinalize');
      scaleUp();
    });

  const longPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      'worklet';
      scaleDown();
      runOnJS(handleLongPressCard)();
    })
    .onFinalize(scaleUp);

  const composedGestures = Gesture.Exclusive(doubleTap, longPress);
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
            [ ACCEPTED ]
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
        <View style={styles.textContainer}>
          {phase === 1 && (
            <Animated.View key="phase1" entering={SlideInRight} exiting={SlideOutLeft} style={[styles.phaseBlock, { justifyContent: 'center', marginTop: -150 }]}>
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 1</ThemedText>
              {renderInstruction('tap to write.')}
            </Animated.View>
          )}

          {phase === 2 && (
            <Animated.View key="phase2" entering={SlideInRight} exiting={SlideOutLeft} style={[styles.phaseBlock, { justifyContent: 'center', marginTop: -150 }]}>
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 2</ThemedText>
              {renderInstruction('press and hold to capture your voice.')}
            </Animated.View>
          )}

          {phase === 3 && (
            <Animated.View key="phase3" entering={SlideInRight} exiting={SlideOutLeft} style={[styles.phaseBlock, { justifyContent: 'center', marginTop: -150 }]}>
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 3</ThemedText>
              {renderInstruction('swipe up to capture a moment.')}
            </Animated.View>
          )}

          {phase === 4 && (
            <Animated.View key="phase4" entering={SlideInRight} exiting={SlideOutLeft} style={[styles.phaseBlock, { justifyContent: 'flex-start', paddingTop: 24 }]}>
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 4</ThemedText>
              {renderInstruction('double tap memory to open.')}
            </Animated.View>
          )}

          {phase === 5 && (
            <Animated.View key="phase5" entering={SlideInRight} exiting={SlideOutLeft} style={[styles.phaseBlock, { justifyContent: 'flex-start', paddingTop: 24 }]}>
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>PHASE 5</ThemedText>
              {renderInstruction('hold memory to share.')}
            </Animated.View>
          )}

          {phase === 6 && (
            <Animated.View key="phase6" entering={SlideInRight} style={[styles.phaseBlock, { justifyContent: 'center', marginTop: -100, gap: 16 }]}>
              <ThemedText style={[styles.phaseTitle, { color: accent }]}>YOU'RE READY</ThemedText>
              <ThemedText style={[styles.instruction, { color: fg, textAlign: 'center', lineHeight: 40 }]}>
                {'every memory,\nevery voice,\nevery moment.\n'}
              </ThemedText>
              <ThemedText style={[styles.instruction, { color: accent, fontFamily: 'JetBrainsMono-Bold' }]}>
                {'fold keeps it all.'}
              </ThemedText>
            </Animated.View>
          )}

        </View>

        {/* Action Area — AddButton for phases 1-3, button for 6 */}
        <Animated.View
          entering={FadeIn.delay(400).duration(800)}
          pointerEvents="box-none"
          style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          {phase <= 3 ? (
            <AddButton
              onPress={() => { if (phase === 1) handleTap(); else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }}
              onSwipeUp={(type) => { if (phase === 3) handleSwipeUp(type); else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }}
              onLongPressStart={() => { if (phase === 2) handleLongPressStart(); else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }}
              onLongPressEnd={() => { if (phase === 2) handleLongPressEnd(); }}
            />
          ) : phase === 6 && showProceedBtn ? (
            <Animated.View entering={FadeInUp.duration(500).springify()}>
              <ActionLink text="ENTER FOLD" onPress={handleComplete} />
            </Animated.View>
          ) : null}
        </Animated.View>

        {/* Full-size memory card for phases 4 & 5 */}
        {phase >= 4 && phase <= 5 && firstMemory && (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={{
              position: 'absolute',
              bottom: Math.max(insets.bottom, 16) + 40,
              left: 21,
              right: 21,
              height: cardHeight,
            }}
          >
            <GestureDetector gesture={composedGestures}>
              <Animated.View style={[{ width: '100%', height: cardHeight }, cardAnimatedStyle]}>
                <View pointerEvents="none" style={{ flex: 1 }}>
                  <MemoryCard
                    item={firstMemory}
                    height={cardHeight}
                    onUpdatePositions={() => {}}
                    isExporting={isSharing}
                  />
                </View>
              </Animated.View>
            </GestureDetector>
          </Animated.View>
        )}

        {/* Hidden Card For Sharing */}
        {isSharing && firstMemory && (
          <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -100, width: cardWidth, height: cardHeight }}>
            <View ref={hiddenCardRef} collapsable={false} style={{ width: cardWidth, height: cardHeight }}>
              <MemoryCard
                item={firstMemory}
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
  phaseBlock: { alignItems: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  phaseTitle: { fontFamily: 'BitcountGridDouble-Light', fontSize: 24, letterSpacing: 4, marginBottom: 16, opacity: 0.5 },
  instruction: { fontFamily: 'JetBrainsMono-Regular', fontSize: 24, lineHeight: 36, textAlign: 'center' },
  bottomBar: { position: 'absolute', bottom: 40, left: 0, right: 0, zIndex: 999, alignItems: 'center' },
});
