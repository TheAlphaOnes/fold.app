import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, Alert, Platform, useWindowDimensions, Pressable, ScrollView, Image as RNImage } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withRepeat,
  Easing,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AudioModule, useAudioRecorder, useAudioRecorderState, RecordingPresets } from 'expo-audio';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

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
import { AsciiArt } from '@/components/ascii-art';
import { SYS_READY_ART } from '@/constants/ascii-art';
import type { Composition, MediaElement } from '@/types/journal';

export default function FieldGuideScreen() {
  const params = useLocalSearchParams();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Exact same formula as home screen (src/app/index.tsx line 80)
  const cardHeight = Math.min(screenWidth * 1.618, screenHeight * 0.78);
  const cardWidth = screenWidth - 42;

  const { settings, completeGuideStep } = useSettingsStore();
  const { compositions, addComposition } = useJournalStore();
  const rawProgress = settings.guideProgress;

  // Determine initial phase based on param or first uncompleted step
  const getInitialPhase = () => {
    if (params.phase) {
      const parsed = parseInt(params.phase as string, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 9) return parsed;
    }
    if (!rawProgress.write) return 1;
    if (!rawProgress.voice) return 2;
    if (!rawProgress.capture) return 3;
    if (!rawProgress.inspect) return 4;
    if (!rawProgress.share) return 5;
    if (!rawProgress.stickers) return 6;
    if (!rawProgress.stories) return 8;
    return 1;
  };

  const [phase, setPhase] = useState(getInitialPhase);
  const [isSuccess, setIsSuccess] = useState(false);
  const initialCount = useRef(compositions.length);
  const isCameraOpenRef = useRef(false);

  useEffect(() => {
    if (params.phase) {
      const parsed = parseInt(params.phase as string, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 9) {
        setPhase(parsed);
      }
    }
  }, [params.phase]);

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Flight animation
  const [scanKey, setScanKey] = useState<number>(0);
  const [isSharing, setIsSharing] = useState(false);
  const hiddenCardRef = useRef<View>(null);

  const textScale = useSharedValue(1);
  const pressedScale = useSharedValue(1);

  // Auto-scroll phase selector chips so current phase is always visible
  const chipScrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (chipScrollRef.current) {
      const targetX = Math.max(0, (phase - 3) * 44);
      chipScrollRef.current.scrollTo({ x: targetX, animated: true });
    }
  }, [phase]);

  // Audio Recording for Phase 2
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const recordIntentRef = useRef(false);

  // Sync guide progress step on success
  const syncStepProgress = useCallback((phaseNum: number) => {
    if (phaseNum === 1) completeGuideStep('write');
    if (phaseNum === 2) completeGuideStep('voice');
    if (phaseNum === 3) completeGuideStep('capture');
    if (phaseNum === 4) completeGuideStep('inspect');
    if (phaseNum === 5) completeGuideStep('share');
    if (phaseNum === 6) completeGuideStep('stickers');
    // phase 7 (pinch) is still the stickers lesson — no separate step
    if (phaseNum === 8) completeGuideStep('stories');
  }, [completeGuideStep]);

  const handleActionSuccess = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid), 60);

    syncStepProgress(phaseRef.current);
    setIsSuccess(true);

    textScale.value = withSequence(
      withTiming(0.92, { duration: 50 }),
      withTiming(1, { duration: 150 })
    );

    setTimeout(() => {
      setIsSuccess(false);
      setPhase((prev) => (prev < 8 ? prev + 1 : 9));
    }, 1000);
  }, [textScale, syncStepProgress]);

  // Monitor composition additions for Phase 1, 2, 3
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

  // Dedicated text memory card for Phase 4 & 5 guide demonstration
  // Guarantees Text medium so it renders rich text content rather than an audio/photo view
  const guideTextMemory: Composition = useMemo(() => {
    const textComp = compositions.find(
      (c) => (!c.mediaElements || c.mediaElements.length === 0) && c.textContent && c.textContent.trim().length > 0
    );
    if (textComp) {
      return {
        ...textComp,
        mediaElements: [], // Guarantee text medium
      };
    }
    return {
      id: 999999,
      textContent: 'Today I started capturing my story with Fold.',
      createdAt: Date.now(),
      mediaElements: [],
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 18,
      storyIds: [],
    };
  }, [compositions]);

  // Phase 5 Sticker Demo State — 2 local stickers for moving, layering & resizing
  const initialStickerElements = useMemo<MediaElement[]>(() => {
    let craneUri = '';
    let photoUri = '';
    try {
      // fold-logo.png = transparent-bg origami crane; sticker-demo-photo.jpg = cinematic mountain
      craneUri = RNImage.resolveAssetSource(require('../../assets/fold-logo.png'))?.uri || '';
      photoUri = RNImage.resolveAssetSource(require('../../assets/images/sticker-demo-photo.jpg'))?.uri || '';
    } catch {
      // fallback — stickers simply won't render
    }
    return [
      {
        id: 'guide-sticker-1',
        uri: craneUri,
        type: 'image',
        x_pos: 16,
        y_pos: 30,
        scale: 0.9,
      },
      {
        id: 'guide-sticker-2',
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
    fontSize: 16,
    storyIds: [],
  }), [guideStickers]);

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

  // Phase 1 handler
  const handleTap = () => {
    if (phase !== 1) return;
    router.push({ pathname: '/compose', params: { sharedText: 'Today I started using Fold.' } });
  };

  // Phase 2 handlers
  const handleLongPressStart = async () => {
    if (phase !== 2) return;
    try {
      recordIntentRef.current = true;
      const { status } = await AudioModule.requestRecordingPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Microphone Required', 'Fold needs the mic to capture your voice.', [
          { text: 'Skip', onPress: handleActionSuccess },
        ]);
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
          const info = await FileSystem.getInfoAsync(uri);
          if (info.exists) {
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
              fontSize: 16,
              storyIds: [],
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to stop quick record', err);
    }
  };

  // Phase 3 handler (photo only camera capture)
  const handleSwipeUp = async () => {
    if (phase !== 3) return;
    if (isCameraOpenRef.current) return;
    try {
      isCameraOpenRef.current = true;
      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus !== 'granted') {
        Alert.alert('Camera Required', 'Fold needs the camera to capture moments.', [
          { text: 'Skip', onPress: handleActionSuccess },
        ]);
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
      console.error('Failed to open camera in guide', error);
    } finally {
      isCameraOpenRef.current = false;
    }
  };

  // Phase 4 handler (double-tap card)
  const handleDoubleTap = useCallback(() => {
    if (phaseRef.current === 4) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (compositions[0]) {
        router.push(`/memory/${compositions[0].id}`);
      }
      handleActionSuccess();
    }
  }, [compositions, handleActionSuccess]);

  // Phase 5 handler (long press share)
  const triggerShare = useCallback(() => {
    setIsSharing(true);
    setScanKey((prev) => prev + 1);

    setTimeout(() => {
      const advance = () => {
        setIsSharing(false);
        handleActionSuccess();
      };
      if (hiddenCardRef.current) {
        captureRef(hiddenCardRef, { format: 'png', quality: 1 })
          .then((uri) => Sharing.shareAsync(uri))
          .catch(() => {})
          .finally(() => advance());
      } else {
        advance();
      }
    }, 1750);
  }, [handleActionSuccess]);

  const handleLongPressCard = useCallback(() => {
    if (phaseRef.current === 5) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      triggerShare();
    }
  }, [triggerShare]);

  // Subtle breathing arrow animation
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

  // Native touch handler for card double-tap
  const lastTapRef = useRef(0);
  const handleCardPress = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300) {
      if (phaseRef.current === 4) {
        handleDoubleTap();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [handleDoubleTap]);

  const handleCardLongPress = useCallback(() => {
    if (phaseRef.current === 5) {
      handleLongPressCard();
    }
  }, [handleLongPressCard]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressedScale.value }],
  }));

  const bg = theme.background;
  const fg = theme.text;
  const accent = theme.accentWarm;

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

  const phaseSteps = [
    { num: 1, id: 'write' as const, label: '01' },
    { num: 2, id: 'voice' as const, label: '02' },
    { num: 3, id: 'capture' as const, label: '03' },
    { num: 4, id: 'inspect' as const, label: '04' },
    { num: 5, id: 'share' as const, label: '05' },
    { num: 6, id: 'stickers' as const, label: '06' },
    { num: 7, id: 'stickers' as const, label: '07' },
    { num: 8, id: 'stories' as const, label: '08' },
    { num: 9, id: 'ready' as const, label: '09' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <GrainBackground />

      {/* Top Header Bar: Close Button + Phase Selector */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          style={({ pressed }) => [
            styles.closeBtn,
            {
              backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
              borderColor: theme.border,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
          hitSlop={12}
        >
          <X size={16} color={theme.text} strokeWidth={2} />
        </Pressable>

        <ScrollView
          ref={chipScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.phaseSelectorScroll}
        >
          {phaseSteps.map((s) => {
            const isCurrent = phase === s.num;
            const isDone = s.id !== 'ready' && rawProgress[s.id as keyof typeof rawProgress];
            return (
              <Pressable
                key={s.num}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPhase(s.num);
                }}
                style={({ pressed }) => [
                  styles.phaseChip,
                  {
                    borderColor: isCurrent ? theme.text : theme.border,
                    backgroundColor: isCurrent
                      ? theme.backgroundElement
                      : pressed
                      ? theme.backgroundSelected
                      : 'transparent',
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.phaseChipText,
                    {
                      color: isCurrent ? theme.text : theme.textMuted,
                      fontFamily: isCurrent ? 'JetBrainsMono-Bold' : 'JetBrainsMono-Regular',
                    },
                  ]}
                >
                  {s.label}
                </ThemedText>
                {isDone && (
                  <View style={[styles.chipDot, { backgroundColor: theme.accentWarm }]} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        <View style={styles.textContainer} pointerEvents="box-none">
          {phase === 1 && (
            <Animated.View
              key="phase1"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={[styles.phaseBlock, { justifyContent: 'center', marginTop: -100 }]}
              pointerEvents="box-none"
            >
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>
                PHASE 1
              </ThemedText>
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
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>
                PHASE 2
              </ThemedText>
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
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>
                PHASE 3
              </ThemedText>
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
              <ThemedText style={[styles.phaseTitleCompact, { color: isSuccess ? accent : fg }]}>
                PHASE 4
              </ThemedText>
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
              <ThemedText style={[styles.phaseTitleCompact, { color: isSuccess ? accent : fg }]}>
                PHASE 5
              </ThemedText>
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
              <ThemedText style={[styles.phaseTitleCompact, { color: isSuccess ? accent : fg }]}>
                PHASE 6
              </ThemedText>
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
              <ThemedText style={[styles.phaseTitleCompact, { color: isSuccess ? accent : fg }]}>
                PHASE 7
              </ThemedText>
              {renderInstruction('pinch a sticker to scale it.')}
            </Animated.View>
          )}

          {phase === 8 && (
            <Animated.View
              key="phase8"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={[styles.phaseBlock, { justifyContent: 'center', marginTop: -80 }]}
              pointerEvents="box-none"
            >
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>
                PHASE 8
              </ThemedText>
              {renderInstruction('stories collect memories\ninto timeless chapters.')}
            </Animated.View>
          )}

          {phase === 9 && (
            <Animated.View
              key="phase9"
              entering={FadeIn.duration(400)}
              style={styles.completeContainer}
              pointerEvents="box-none"
            >
              <View style={styles.completeArtWrap}>
                <AsciiArt art={SYS_READY_ART} color={theme.textMuted} fontSize={10} />
              </View>

              <ThemedText style={[styles.completeTitle, { color: accent }]}>
                FIELD GUIDE COMPLETE
              </ThemedText>

              <ThemedText style={[styles.completeSubtitle, { color: theme.textSecondary }]}>
                your journal is ready.{'\n'}start capturing what matters.
              </ThemedText>
            </Animated.View>
          )}
        </View>

        {/* Action Area — AddButton for phases 1-3, Return button for 7 */}
        <Animated.View
          entering={FadeIn.delay(400).duration(800)}
          pointerEvents="box-none"
          style={[
            styles.bottomBar,
            {
              paddingBottom: Math.max(insets.bottom, 24) + (Platform.OS === 'android' ? 14 : 0),
            },
          ]}
        >
          {phase <= 3 ? (
            <View style={{ alignItems: 'center', gap: 12 }}>
              {!isSuccess && (
                <Animated.View entering={FadeIn.delay(1000).duration(800)} style={arrowStyle}>
                  <ThemedText
                    style={{
                      fontFamily: 'JetBrainsMono-Regular',
                      fontSize: 22,
                      color: theme.text,
                      opacity: 0.4,
                    }}
                  >
                    {phase === 3 ? '↑' : '↓'}
                  </ThemedText>
                </Animated.View>
              )}
              <AddButton
                onPress={() => {
                  if (phase === 1) handleTap();
                  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }}
                onSwipeUp={() => {
                  if (phase === 3) handleSwipeUp();
                  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }}
                onLongPressStart={() => {
                  if (phase === 2) handleLongPressStart();
                  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }}
                onLongPressEnd={() => {
                  if (phase === 2) handleLongPressEnd();
                }}
              />
            </View>
          ) : phase === 8 ? (
            <Animated.View entering={FadeInUp.duration(500).springify()}>
              <ActionLink
                text="EXPLORE STORIES"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  completeGuideStep('stories');
                  router.push('/stories');
                }}
              />
            </Animated.View>
          ) : phase === 9 ? (
            <Animated.View entering={FadeInUp.duration(500).springify()}>
              <ActionLink
                text="OPEN JOURNAL"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/');
                  }
                }}
              />
            </Animated.View>
          ) : null}
        </Animated.View>

        {/* Full-size memory card for phases 4–7 */}
        {phase >= 4 && phase <= 7 && (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={[
              {
                position: 'absolute',
                bottom: Math.max(insets.bottom, 12),
                left: 21,
                right: 21,
                height: cardHeight,
                zIndex: 500,
              },
              cardAnimatedStyle,
            ]}
          >
            {/* Phases 4 & 5: Text memory card */}
            {(phase === 4 || phase === 5) && (
              <Pressable
                onPressIn={() => { pressedScale.value = withTiming(0.96, { duration: 150 }); }}
                onPressOut={() => { pressedScale.value = withTiming(1, { duration: 150 }); }}
                onPress={handleCardPress}
                onLongPress={handleCardLongPress}
                delayLongPress={500}
                style={{ flex: 1, width: '100%', height: '100%' }}
              >
                <MemoryCard
                  item={guideTextMemory}
                  height={cardHeight}
                  onUpdatePositions={() => {}}
                  isExporting={false}
                />
              </Pressable>
            )}

            {/* Phases 6 & 7: Sticker canvas card */}
            {(phase === 6 || phase === 7) && (
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
                      {phase === 6 ? 'HOLD TO LIFT · DRAG TO PLACE' : 'PINCH TO SCALE'}
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {/* Hidden Card For Sharing */}
        {isSharing && (
          <View
            style={{
              position: 'absolute',
              opacity: 0,
              pointerEvents: 'none',
              zIndex: -100,
              width: cardWidth,
              height: cardHeight,
            }}
          >
            <View ref={hiddenCardRef} collapsable={false} style={{ width: cardWidth, height: cardHeight }}>
              <MemoryCard
                item={guideTextMemory}
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
      <RecordingOverlay
        visible={recorderState.isRecording}
        durationMillis={recorderState.durationMillis}
        onStop={handleLongPressEnd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 6,
    zIndex: 200,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseSelectorScroll: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 16,
  },
  phaseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 7,
    borderWidth: 1,
    gap: 4,
  },
  phaseChipText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  chipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
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
  },
  phaseTitleCompact: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 16,
    letterSpacing: 4,
    marginBottom: 6,
    opacity: 0.5,
  },
  instruction: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  instructionCompact: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  instructionSubtle: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    opacity: 0.8,
    letterSpacing: 0.3,
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
  storyTagOverlay: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 100,
  },
  storyTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storyTagBtnText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  storyExplainer: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
    paddingHorizontal: 16,
  },
  storyExplainerText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  completeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  completeArtWrap: {
    marginBottom: 16,
    opacity: 0.75,
  },
  completeTitle: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 10,
  },
  completeSubtitle: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 0,
  },
  completePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  completePillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  completePillText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  completeCtaBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeCtaText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 12,
    letterSpacing: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
  },
});
