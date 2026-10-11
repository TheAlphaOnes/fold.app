import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, Alert, Platform, useWindowDimensions, Pressable, ScrollView, Image as RNImage } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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
import { Camera, X, Check, Book } from 'lucide-react-native';
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
import type { Composition, MediaElement } from '@/types/journal';

export default function FieldGuideScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Exact same formula as home screen (src/app/index.tsx line 80)
  const cardHeight = Math.min(screenWidth * 1.618, screenHeight * 0.78);
  const cardWidth = screenWidth - 42;

  const { settings, completeGuideStep } = useSettingsStore();
  const { compositions, addComposition } = useJournalStore();
  const rawProgress = settings.guideProgress;

  // Determine initial phase based on first uncompleted step
  const getInitialPhase = () => {
    if (!rawProgress.write) return 1;
    if (!rawProgress.voice) return 2;
    if (!rawProgress.capture) return 3;
    if (!rawProgress.inspect) return 4;
    if (!rawProgress.stickers) return 5;
    if (!rawProgress.stories) return 6;
    return 1;
  };

  const [phase, setPhase] = useState(getInitialPhase);
  const [isSuccess, setIsSuccess] = useState(false);
  const initialCount = useRef(compositions.length);
  const isCameraOpenRef = useRef(false);

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
    if (phaseNum === 5) completeGuideStep('stickers');
    if (phaseNum === 6) completeGuideStep('stories');
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
      setPhase((prev) => (prev < 6 ? prev + 1 : 7));
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
    let iconUri = '';
    let logoUri = '';
    try {
      iconUri = RNImage.resolveAssetSource(require('../../assets/images/icon.png'))?.uri || '';
      logoUri = RNImage.resolveAssetSource(require('../../assets/fold-logo.png'))?.uri || '';
    } catch {
      // fallback
    }
    return [
      {
        id: 'guide-sticker-1',
        uri: iconUri,
        type: 'image',
        x_pos: 24,
        y_pos: 60,
        scale: 1,
      },
      {
        id: 'guide-sticker-2',
        uri: logoUri,
        type: 'image',
        x_pos: 150,
        y_pos: 170,
        scale: 1,
      },
    ];
  }, []);

  const [guideStickers, setGuideStickers] = useState<MediaElement[]>(initialStickerElements);

  const guideStickerMemory: Composition = useMemo(() => ({
    id: 999998,
    textContent: 'Hold 220ms to lift. Drag to place.\nPinch with 2 fingers to scale.',
    createdAt: Date.now() - 3600000,
    mediaElements: guideStickers,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 17,
    storyIds: [],
  }), [guideStickers]);

  const handleStickerUpdatePositions = useCallback((_id: number, updatedMedia: MediaElement[]) => {
    setGuideStickers(updatedMedia);
    if (phaseRef.current === 5 && !isSuccess) {
      handleActionSuccess();
    }
  }, [handleActionSuccess, isSuccess]);

  // Phase 6 Story Demo State
  const [isStoryTagged, setIsStoryTagged] = useState(false);

  const guideStoryMemory: Composition = useMemo(() => ({
    id: 999997,
    textContent: 'Archival chapters organize life into permanent narratives. Road trips, seasons, and projects.',
    createdAt: Date.now() - 7200000,
    mediaElements: [],
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 18,
    storyIds: isStoryTagged ? [1] : [],
  }), [isStoryTagged]);

  const handleToggleStoryTag = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsStoryTagged(true);
    if (phaseRef.current === 6 && !isSuccess) {
      handleActionSuccess();
    }
  }, [handleActionSuccess, isSuccess]);

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

  const renderInstruction = (text: string, compact = false) => {
    if (isSuccess) {
      return (
        <Animated.View style={animatedTextStyle}>
          <ThemedText
            style={[
              compact ? styles.instructionCompact : styles.instruction,
              { color: accent, fontFamily: 'JetBrainsMono-Bold' },
            ]}
          >
            [ CAPTURED ]
          </ThemedText>
        </Animated.View>
      );
    }
    return (
      <Animated.View style={animatedTextStyle}>
        <ThemedText
          style={[compact ? styles.instructionCompact : styles.instruction, { color: fg }]}
        >
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
    { num: 5, id: 'stickers' as const, label: '05' },
    { num: 6, id: 'stories' as const, label: '06' },
    { num: 7, id: 'ready' as const, label: '07' },
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
        <View style={styles.textContainer}>
          {phase === 1 && (
            <Animated.View
              key="phase1"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={[styles.phaseBlock, { justifyContent: 'center', marginTop: -100 }]}
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
            >
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>
                PHASE 2
              </ThemedText>
              {renderInstruction('press and hold to capture your voice.')}
            </Animated.View>
          )}

          {phase === 3 && (
            <Animated.View
              key="phase3"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={[styles.phaseBlock, { justifyContent: 'center', marginTop: -80 }]}
            >
              <ThemedText style={[styles.phaseTitle, { color: isSuccess ? accent : fg }]}>
                PHASE 3
              </ThemedText>
              {renderInstruction('swipe up orange trigger for photo capture.')}

              {/* Hardware Shutter Spec Diagram */}
              <View style={{ marginTop: 24, alignItems: 'center' }}>
                <Animated.View
                  entering={FadeIn.delay(350).duration(400)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: accent,
                      backgroundColor: theme.backgroundElement,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Camera size={18} color={accent} strokeWidth={2} />
                  </View>
                  <View>
                    <ThemedText
                      style={{
                        fontFamily: 'JetBrainsMono-Bold',
                        fontSize: 12,
                        color: theme.text,
                        letterSpacing: 3,
                      }}
                    >
                      HARDWARE SHUTTER
                    </ThemedText>
                    <ThemedText
                      style={{
                        fontFamily: 'JetBrainsMono-Regular',
                        fontSize: 10,
                        color: theme.textMuted,
                        letterSpacing: 1,
                        marginTop: 2,
                      }}
                    >
                      swipe past notch for instant camera
                    </ThemedText>
                  </View>
                </Animated.View>

                {/* Upward Guide Indicator */}
                <Animated.View
                  entering={FadeIn.delay(650).duration(500)}
                  style={{ alignItems: 'center', marginTop: 16 }}
                >
                  <View
                    style={{
                      width: 1,
                      height: 24,
                      borderLeftWidth: 1.5,
                      borderColor: theme.border,
                      borderStyle: 'dashed',
                      opacity: 0.6,
                      marginBottom: 8,
                    }}
                  />
                  <ThemedText
                    style={{
                      fontFamily: 'JetBrainsMono-Regular',
                      fontSize: 11,
                      color: theme.textMuted,
                      letterSpacing: 3,
                      opacity: 0.8,
                    }}
                  >
                    ↑  NOTCH TRIGGER (-110MM)
                  </ThemedText>
                </Animated.View>
              </View>
            </Animated.View>
          )}

          {phase === 4 && (
            <Animated.View
              key="phase4"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={styles.phaseBlockCompact}
            >
              <ThemedText style={[styles.phaseTitleCompact, { color: isSuccess ? accent : fg }]}>
                PHASE 4
              </ThemedText>
              {renderInstruction('double tap memory to inspect full record.', true)}
            </Animated.View>
          )}

          {phase === 5 && (
            <Animated.View
              key="phase5"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={styles.phaseBlockCompact}
            >
              <ThemedText style={[styles.phaseTitleCompact, { color: isSuccess ? accent : fg }]}>
                PHASE 5
              </ThemedText>
              {renderInstruction('hold to lift. drag & pinch to scale.', true)}
            </Animated.View>
          )}

          {phase === 6 && (
            <Animated.View
              key="phase6"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={styles.phaseBlockCompact}
            >
              <ThemedText style={[styles.phaseTitleCompact, { color: isSuccess ? accent : fg }]}>
                PHASE 6
              </ThemedText>
              {renderInstruction('tap [📖] to tag into an archival chapter.', true)}
            </Animated.View>
          )}

          {phase === 7 && (
            <Animated.View
              key="phase7"
              entering={SlideInRight}
              style={[styles.phaseBlock, { justifyContent: 'center', marginTop: -60, gap: 14 }]}
            >
              <ThemedText style={[styles.phaseTitle, { color: accent }]}>
                FIELD GUIDE COMPLETE
              </ThemedText>
              <ThemedText style={[styles.instruction, { color: fg, textAlign: 'center', lineHeight: 22 }]}>
                {'all hardware gestures calibrated.\nevery memory, every voice, every moment.\nfold keeps it all.'}
              </ThemedText>

              {/* Hardware Spec Recap */}
              <View style={styles.recapList}>
                <View style={styles.recapItem}>
                  <Check size={13} color={accent} strokeWidth={2.5} />
                  <ThemedText style={[styles.recapText, { color: fg }]}>01 COMPOSE · TAP TRIGGER</ThemedText>
                </View>
                <View style={styles.recapItem}>
                  <Check size={13} color={accent} strokeWidth={2.5} />
                  <ThemedText style={[styles.recapText, { color: fg }]}>02 VOICE · HOLD TP-7 RECORD</ThemedText>
                </View>
                <View style={styles.recapItem}>
                  <Check size={13} color={accent} strokeWidth={2.5} />
                  <ThemedText style={[styles.recapText, { color: fg }]}>03 PHOTO · SWIPE NOTCH SHUTTER</ThemedText>
                </View>
                <View style={styles.recapItem}>
                  <Check size={13} color={accent} strokeWidth={2.5} />
                  <ThemedText style={[styles.recapText, { color: fg }]}>04 INSPECT · DOUBLE TAP & EXPORT</ThemedText>
                </View>
                <View style={styles.recapItem}>
                  <Check size={13} color={accent} strokeWidth={2.5} />
                  <ThemedText style={[styles.recapText, { color: fg }]}>05 STICKERS · LIFT, DRAG & PINCH</ThemedText>
                </View>
                <View style={styles.recapItem}>
                  <Check size={13} color={accent} strokeWidth={2.5} />
                  <ThemedText style={[styles.recapText, { color: fg }]}>06 STORIES · ARCHIVAL CHAPTERS</ThemedText>
                </View>
              </View>
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
          ) : phase === 7 ? (
            <Animated.View entering={FadeInUp.duration(500).springify()}>
              <ActionLink
                text="RETURN TO JOURNAL"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

        {/* Full-size memory card for phases 4, 5 & 6 */}
        {phase >= 4 && phase <= 6 && (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={[
              {
                position: 'absolute',
                bottom: Math.max(insets.bottom, 12),
                left: 21,
                right: 21,
                height: cardHeight,
                zIndex: 50,
              },
              cardAnimatedStyle,
            ]}
          >
            {phase === 4 && (
              <Pressable
                onPressIn={() => {
                  pressedScale.value = withTiming(0.96, { duration: 150 });
                }}
                onPressOut={() => {
                  pressedScale.value = withTiming(1, { duration: 150 });
                }}
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

            {phase === 5 && (
              <View style={{ flex: 1, width: '100%', height: '100%' }}>
                <MemoryCard
                  item={guideStickerMemory}
                  height={cardHeight}
                  onUpdatePositions={handleStickerUpdatePositions}
                  isExporting={false}
                />
              </View>
            )}

            {phase === 6 && (
              <View style={{ flex: 1, width: '100%', height: '100%' }}>
                <MemoryCard
                  item={guideStoryMemory}
                  height={cardHeight}
                  onUpdatePositions={() => {}}
                  isExporting={false}
                />
                {/* Interactive Story Tag Button */}
                <View style={styles.storyTagOverlay}>
                  <Pressable
                    onPress={handleToggleStoryTag}
                    style={({ pressed }) => [
                      styles.storyTagBtn,
                      {
                        backgroundColor: isStoryTagged ? theme.text : theme.backgroundElement,
                        borderColor: isStoryTagged ? theme.text : theme.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Book size={14} color={isStoryTagged ? theme.background : theme.accentWarm} strokeWidth={2} />
                    <ThemedText
                      style={[
                        styles.storyTagBtnText,
                        { color: isStoryTagged ? theme.background : theme.text },
                      ]}
                    >
                      {isStoryTagged ? 'CHAPTER 01 · ARCHIVED' : '+ TAG TO CHAPTER 01'}
                    </ThemedText>
                  </Pressable>
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
    gap: 6,
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 4,
  },
  phaseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  phaseChipText: {
    fontSize: 10,
    letterSpacing: 1,
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
    marginBottom: 4,
    opacity: 0.5,
  },
  phaseTitleCompact: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 16,
    letterSpacing: 4,
    marginBottom: 4,
    opacity: 0.5,
  },
  instruction: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  instructionCompact: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
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
  recapList: {
    gap: 8,
    marginTop: 8,
    alignSelf: 'stretch',
    paddingHorizontal: 20,
  },
  recapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  recapText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    letterSpacing: 1,
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
