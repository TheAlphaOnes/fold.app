import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, Alert, Platform, useWindowDimensions, Pressable, ScrollView, Modal, Image as RNImage } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withRepeat,
  Easing,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { X, Book, BookPlus, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AudioModule, useAudioRecorder, useAudioRecorderState, RecordingPresets } from 'expo-audio';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/hooks/use-settings';
import { useJournalStore } from '@/hooks/use-journal';
import { useStoriesStore } from '@/hooks/use-stories';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { AddButton } from '@/components/add-button';
import { RecordingOverlay } from '@/components/recording-overlay';
import { MemoryCard } from '@/components/memory-card';
import { LogoUploadFlight } from '@/components/logo-upload-flight';
import { ActionLink } from '@/components/action-link';
import { setPendingCameraMedia } from '@/utils/pending-camera-media';
import { AsciiArt } from '@/components/ascii-art';
import { SYS_READY_ART, COFFEE_ART } from '@/constants/ascii-art';
import { CreateStoryTray } from '@/components/create-story-tray';
import type { Composition, MediaElement } from '@/types/journal';

export default function FieldGuideScreen() {
  const params = useLocalSearchParams();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Exact same formula as home screen (src/app/index.tsx line 80)
  const cardHeight = Math.min(screenWidth * 1.618, screenHeight * 0.78);
  const cardWidth = screenWidth - 42;

  const { settings, completeGuideStep, updateSetting } = useSettingsStore();
  const { compositions, addComposition } = useJournalStore();
  const { stories = [], refreshStories } = useStoriesStore();
  const initialStoryCount = useRef(stories?.length ?? 0);
  const [showCreateStoryTray, setShowCreateStoryTray] = useState(false);
  const rawProgress = settings.guideProgress;

  // Determine initial phase based on param or first uncompleted step
  const getInitialPhase = () => {
    if (params.phase) {
      const parsed = parseInt(params.phase as string, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) return parsed;
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
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
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
    // Phase 6 (drag) and Phase 7 (pinch) are both part of stickers —
    // mark done as soon as the user drags in Phase 6 so the dot lights up immediately.
    if (phaseNum === 6 || phaseNum === 7) completeGuideStep('stickers');
    // phases 8-11 are all part of the stories curriculum
    if (phaseNum === 11 || phaseNum === 12) completeGuideStep('stories');
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
      setPhase((prev) => {
        const next = prev < 12 ? prev + 1 : 12;
        phaseRef.current = next;
        return next;
      });
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

  // Phase 9: Detect when user creates a story and returns to guide
  useFocusEffect(
    useCallback(() => {
      if (isSuccess || phaseRef.current !== 9) return;
      refreshStories();
    }, [isSuccess, refreshStories])
  );

  useEffect(() => {
    if (phase !== 9 || isSuccess) return;
    const count = stories?.length ?? 0;
    if (count > initialStoryCount.current) {
      initialStoryCount.current = count;
      handleActionSuccess();
    }
  }, [phase, stories, isSuccess, handleActionSuccess]);

  // Phase 10: Detect when user has added first memory to a story
  useFocusEffect(
    useCallback(() => {
      if (isSuccess || phaseRef.current !== 10) return;
      // Re-read from store on focus to catch changes made in /memory/[id]
      const latestCompositions = useJournalStore.getState().allCompositions;
      const anyTagged = latestCompositions.some(c => c.storyIds && c.storyIds.length > 0);
      if (anyTagged) {
        handleActionSuccess();
      }
    }, [isSuccess, handleActionSuccess])
  );

  // Phase 11: Detect when user visits the stories archive and returns
  const hasVisitedStoriesRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (isSuccess || phaseRef.current !== 11) return;
      if (hasVisitedStoriesRef.current) {
        hasVisitedStoriesRef.current = false;
        handleActionSuccess();
      }
    }, [isSuccess, handleActionSuccess])
  );

  // Phase 12: Mark all guide steps complete and dismiss guide
  useEffect(() => {
    if (phase === 12) {
      updateSetting('guideProgress', {
        write: true,
        voice: true,
        capture: true,
        inspect: true,
        share: true,
        stickers: true,
        stories: true,
      });
      updateSetting('guideDismissed', true);
    }
  }, [phase, updateSetting]);

  const handleFinishGuide = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await updateSetting('guideProgress', {
      write: true,
      voice: true,
      capture: true,
      inspect: true,
      share: true,
      stickers: true,
      stories: true,
    });
    await updateSetting('guideDismissed', true);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [updateSetting]);

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

  // Phase 6 & 7 Sticker Demo State — 2 local sample images packed with the app
  const initialStickerElements = useMemo<MediaElement[]>(() => {
    let sample1Uri = '';
    let sample2Uri = '';
    try {
      sample1Uri = RNImage.resolveAssetSource(require('../../assets/images/guide-sample-1.jpg'))?.uri || '';
      sample2Uri = RNImage.resolveAssetSource(require('../../assets/images/guide-sample-2.jpg'))?.uri || '';
    } catch {
      // fallback
    }
    return [
      {
        id: 'guide-sticker-1',
        uri: sample1Uri,
        type: 'image',
        x_pos: 20,
        y_pos: 24,
        scale: 1,
        width: 100,
        height: 120,
      },
      {
        id: 'guide-sticker-2',
        uri: sample2Uri,
        type: 'image',
        x_pos: Math.max(120, cardWidth - 140),
        y_pos: 150,
        scale: 1,
        width: 120,
        height: 110,
      },
    ];
  }, [cardWidth]);

  const [guideStickers, setGuideStickers] = useState<MediaElement[]>(initialStickerElements);

  // Snapshot refs to isolate Phase 6 (drag) from Phase 7 (pinch)
  const phase6StartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const phase7StartScalesRef = useRef<Map<string, number>>(new Map());

  // Snapshot positions when entering Phase 6
  useEffect(() => {
    if (phase === 6) {
      const map = new Map<string, { x: number; y: number }>();
      guideStickers.forEach(s => map.set(s.id, { x: s.x_pos, y: s.y_pos }));
      phase6StartPositionsRef.current = map;
    }
  }, [phase]);

  // Snapshot scales when entering Phase 7
  useEffect(() => {
    if (phase === 7) {
      const map = new Map<string, number>();
      guideStickers.forEach(s => map.set(s.id, s.scale ?? 1));
      phase7StartScalesRef.current = map;
    }
  }, [phase]);

  const guideStickerMemory: Composition = useMemo(() => ({
    id: 999998,
    textContent: 'Pacific Coast Highway.\nSalt air, quiet roads, and afternoon light.',
    createdAt: Date.now() - 3600000,
    mediaElements: guideStickers,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 17,
    storyIds: [],
  }), [guideStickers]);

  // Phase 10: Add memory to story — track story assignment on first memory
  const firstMemoryRef = useRef(compositions[0]);
  useEffect(() => {
    firstMemoryRef.current = compositions[0];
  }, [compositions]);

  const handleStickerUpdatePositions = useCallback((_id: number, updatedMedia: MediaElement[]) => {
    setGuideStickers(updatedMedia);
    if (isSuccess) return;

    const currentPhase = phaseRef.current;
    if (currentPhase === 6) {
      // If Phase 6 baseline is not yet initialized, set it and return without advancing
      if (phase6StartPositionsRef.current.size === 0) {
        updatedMedia.forEach(s => phase6StartPositionsRef.current.set(s.id, { x: s.x_pos, y: s.y_pos }));
        return;
      }
      // Phase 6: only drag counts (position moved > 15px from Phase 6 baseline)
      const positionMoved = updatedMedia.some(u => {
        const start = phase6StartPositionsRef.current.get(u.id);
        if (!start) return false;
        return Math.hypot(u.x_pos - start.x, u.y_pos - start.y) > 15;
      });
      if (positionMoved) {
        handleActionSuccess();
      }
    } else if (currentPhase === 7) {
      // If Phase 7 baseline scale is not yet initialized, set it and return without advancing
      if (phase7StartScalesRef.current.size === 0) {
        updatedMedia.forEach(s => phase7StartScalesRef.current.set(s.id, s.scale ?? 1.0));
        return;
      }
      // Phase 7: only pinch scale counts (scale changed >= 15% from Phase 7 baseline)
      const scaleChanged = updatedMedia.some(u => {
        const baseScale = phase7StartScalesRef.current.get(u.id) ?? 1.0;
        const currentScale = u.scale ?? 1.0;
        return Math.abs(currentScale - baseScale) >= 0.15;
      });
      if (scaleChanged) {
        handleActionSuccess();
      }
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
    { num: 9, id: 'stories' as const, label: '09' },
    { num: 10, id: 'stories' as const, label: '10' },
    { num: 11, id: 'stories' as const, label: '11' },
    { num: 12, id: 'ready' as const, label: '12' },
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
              style={styles.phaseBlockCompact}
              pointerEvents="box-none"
            >
              <ThemedText style={[styles.phaseTitleCompact, { color: isSuccess ? accent : fg }]}>
                PHASE 8
              </ThemedText>
              {renderInstruction('stories are chapters of your memories.')}
            </Animated.View>
          )}

          {phase === 9 && (
            <Animated.View
              key="phase9"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={styles.phaseBlockCompact}
              pointerEvents="box-none"
            >
              <ThemedText style={[styles.phaseTitleCompact, { color: isSuccess ? accent : fg }]}>
                PHASE 9
              </ThemedText>
              {renderInstruction('create your first story chapter.')}
            </Animated.View>
          )}

          {phase === 10 && (
            <Animated.View
              key="phase10"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={styles.phaseBlockCompact}
              pointerEvents="box-none"
            >
              <ThemedText style={[styles.phaseTitleCompact, { color: isSuccess ? accent : fg }]}>
                PHASE 10
              </ThemedText>
              {renderInstruction('open in gallery and tag to a story.')}
            </Animated.View>
          )}

          {phase === 11 && (
            <Animated.View
              key="phase11"
              entering={SlideInRight}
              exiting={SlideOutLeft}
              style={styles.phaseBlockCompact}
              pointerEvents="box-none"
            >
              <ThemedText style={[styles.phaseTitleCompact, { color: isSuccess ? accent : fg }]}>
                PHASE 11
              </ThemedText>
              {renderInstruction('visit your stories in the chapter feed.')}
            </Animated.View>
          )}

          {phase === 12 && (
            <Animated.View
              key="phase12"
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

        {/* Action Area — AddButton for phases 1-3, ActionLinks for 8-12 */}
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
                text="CONTINUE TO CREATE"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPhase(9);
                }}
              />
            </Animated.View>
          ) : phase === 9 ? (
            <Animated.View entering={FadeInUp.duration(500).springify()}>
              <ActionLink
                text="OPEN STORY TRAY"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowCreateStoryTray(true);
                }}
              />
            </Animated.View>
          ) : phase === 10 ? (
            <Animated.View entering={FadeInUp.duration(500).springify()}>
              <ActionLink
                text="OPEN IN GALLERY"
                onPress={() => {
                  const targetId = compositions[0]?.id || guideTextMemory.id;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/memory/${targetId}`);
                }}
              />
            </Animated.View>
          ) : phase === 11 ? (
            <Animated.View entering={FadeInUp.duration(500).springify()}>
              <ActionLink
                text="VISIT STORY ARCHIVE"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  hasVisitedStoriesRef.current = true;
                  router.push('/stories');
                }}
              />
            </Animated.View>
          ) : phase === 12 ? (
            <Animated.View entering={FadeInUp.duration(500).springify()}>
              <ActionLink
                text="OPEN JOURNAL"
                onPress={handleFinishGuide}
              />
            </Animated.View>
          ) : null}
        </Animated.View>

        {/* Full-size card area for phases 4–11 */}
        {phase >= 4 && phase <= 11 && (
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
              </View>
            )}

            {/* Phase 8: Story Concept & Explain Card */}
            {phase === 8 && (
              <View style={[styles.explainCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <View style={styles.explainHeader}>
                  <Book size={18} color={accent} />
                  <ThemedText style={[styles.explainTitle, { color: fg }]}>STORY CHAPTERS</ThemedText>
                </View>
                <View style={[styles.explainDivider, { backgroundColor: theme.border }]} />
                <ThemedText style={[styles.explainBody, { color: fg }]}>
                  Stories are chapters of your memories grouped together into permanent collections.
                </ThemedText>
                <ThemedText style={[styles.explainSubBody, { color: theme.textSecondary }]}>
                  Curate road trips, seasons, creative projects, or cherished moments into living archives.
                </ThemedText>
                <View style={styles.storyPillRow}>
                  <View style={[styles.samplePill, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <ThemedText style={[styles.samplePillText, { color: theme.textMuted }]}>ROAD TRIP 2026</ThemedText>
                  </View>
                  <View style={[styles.samplePill, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <ThemedText style={[styles.samplePillText, { color: theme.textMuted }]}>PACIFIC COAST</ThemedText>
                  </View>
                </View>
              </View>
            )}

            {/* Phase 9: Story Creation Prompt Card */}
            {phase === 9 && (
              <View style={[styles.explainCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <View style={styles.explainHeader}>
                  <BookPlus size={18} color={accent} />
                  <ThemedText style={[styles.explainTitle, { color: fg }]}>CREATE A CHAPTER</ThemedText>
                </View>
                <View style={[styles.explainDivider, { backgroundColor: theme.border }]} />
                <ThemedText style={[styles.explainBody, { color: fg }]}>
                  Name your new story using the real Fold story drawer.
                </ThemedText>
                <View style={{ alignItems: 'center', marginVertical: 20, opacity: 0.35 }}>
                  <AsciiArt art={COFFEE_ART} color={theme.textMuted} fontSize={9} />
                </View>
                <ThemedText style={[styles.explainSubBody, { color: theme.textSecondary, textAlign: 'center' }]}>
                  tap OPEN STORY TRAY below to create.
                </ThemedText>
              </View>
            )}

            {/* Phase 10: Interactive Memory Card to Tag */}
            {phase === 10 && (
              <Pressable
                onPressIn={() => { pressedScale.value = withTiming(0.96, { duration: 150 }); }}
                onPressOut={() => { pressedScale.value = withTiming(1, { duration: 150 }); }}
                onPress={() => {
                  const targetId = compositions[0]?.id || guideTextMemory.id;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/memory/${targetId}`);
                }}
                style={{ flex: 1, width: '100%', height: '100%' }}
              >
                <MemoryCard
                  item={compositions[0] || guideTextMemory}
                  height={cardHeight}
                  onUpdatePositions={() => {}}
                  isExporting={false}
                />
              </Pressable>
            )}

            {/* Phase 11: Story Board Archive Showcase Card */}
            {phase === 11 && (
              <View style={[styles.explainCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <View style={styles.explainHeader}>
                  <Book size={18} color={accent} />
                  <ThemedText style={[styles.explainTitle, { color: fg }]}>STORY ARCHIVE</ThemedText>
                </View>
                <View style={[styles.explainDivider, { backgroundColor: theme.border }]} />
                <ThemedText style={[styles.explainBody, { color: fg }]}>
                  Revisit your stories in the dedicated story board.
                </ThemedText>
                <ThemedText style={[styles.explainSubBody, { color: theme.textSecondary }]}>
                  Browse memories in a smooth, continuous timeline feed.
                </ThemedText>
                <View style={{ alignItems: 'center', marginTop: 24, opacity: 0.4 }}>
                  <ThemedText style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 13, letterSpacing: 2, color: accent }}>
                    [ TAP VISIT STORY ARCHIVE ]
                  </ThemedText>
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

      {/* Real Fold Story Tray for Phase 9 */}
      {showCreateStoryTray && (
        <CreateStoryTray
          onClose={() => setShowCreateStoryTray(false)}
          navigateOnCreate={false}
          onSuccess={() => {
            handleActionSuccess();
          }}
        />
      )}

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
    justifyContent: 'center',
    height: 64,
    paddingHorizontal: 20,
    zIndex: 600,
  },
  phaseTitle: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 15,
    letterSpacing: 3,
    marginBottom: 4,
    opacity: 0.5,
  },
  phaseTitleCompact: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 15,
    letterSpacing: 3,
    marginBottom: 4,
    opacity: 0.5,
  },
  instruction: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  instructionCompact: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  instructionSubtle: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    opacity: 0.8,
    letterSpacing: 0.2,
  },
  explainCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    justifyContent: 'center',
  },
  explainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  explainTitle: {
    fontFamily: 'BitcountGridDouble-Light',
    fontSize: 16,
    letterSpacing: 3,
  },
  explainDivider: {
    height: 1,
    width: '100%',
    marginBottom: 20,
    opacity: 0.5,
  },
  explainBody: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  explainSubBody: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  storyPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 24,
  },
  samplePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  samplePillText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
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
