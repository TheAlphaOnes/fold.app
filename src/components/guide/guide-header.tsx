/**
 * GuideHeader — close, mission progress, skip.
 *
 * Progress is shown as one tick per mission (the same 7 the home edge-tab
 * ring counts), grouped by chapter. A tick fills from the left when its
 * mission completes, and half-fills when one of a two-step mission's steps
 * is done. Ticks double as navigation.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolateColor } from 'react-native-reanimated';
import { X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { EASE_OUT } from '@/constants/motion';
import { GUIDE_CHAPTERS, type GuideMissionId } from '@/constants/guide';
import type { MissionState } from '@/hooks/use-guide-flow';

const TICK_WIDTH = 18;
const TICK_HEIGHT = 4;
const HIT = 40;

interface MissionTickProps {
  state: MissionState;
  isCurrent: boolean;
  label: string;
  onPress: () => void;
}

function MissionTick({ state, isCurrent, label, onPress }: MissionTickProps) {
  const theme = useTheme();
  const fill = useSharedValue(state === 'done' ? 1 : state === 'partial' ? 0.5 : 0);
  const focus = useSharedValue(isCurrent ? 1 : 0);

  // Two segments at different rates: the fill sweeps slower than the
  // track's focus colour settles, so a completed tick reads as "drawn in".
  useEffect(() => {
    const target = state === 'done' ? 1 : state === 'partial' ? 0.5 : 0;
    fill.value = withTiming(target, { duration: 260, easing: EASE_OUT });
  }, [state, fill]);

  useEffect(() => {
    focus.value = withTiming(isCurrent ? 1 : 0, { duration: 180, easing: EASE_OUT });
  }, [isCurrent, focus]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(focus.value, [0, 1], [theme.border, theme.text]),
    opacity: 0.35 + focus.value * 0.35,
  }));

  const stateLabel = state === 'done' ? 'done' : state === 'partial' ? 'in progress' : 'not started';

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: (HIT - TICK_HEIGHT) / 2, bottom: (HIT - TICK_HEIGHT) / 2, left: 2, right: 2 }}
      accessibilityRole="tab"
      accessibilityLabel={`${label}, ${stateLabel}`}
      accessibilityState={{ selected: isCurrent }}
      style={styles.tick}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.tickTrack, trackStyle]} />
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.tickFill, { backgroundColor: theme.accentWarm }, fillStyle]}
      />
    </Pressable>
  );
}

interface GuideHeaderProps {
  currentMission: GuideMissionId | null;
  missionState: (mission: GuideMissionId) => MissionState;
  onSelectMission: (mission: GuideMissionId) => void;
  onClose: () => void;
  /** Hidden on the completion screen, where there is nothing left to skip. */
  onSkip?: () => void;
}

export function GuideHeader({ currentMission, missionState, onSelectMission, onClose, onSkip }: GuideHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close field guide"
        style={({ pressed }) => [
          styles.close,
          {
            borderColor: theme.border,
            backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
      >
        <X size={16} color={theme.text} strokeWidth={2} />
      </Pressable>

      <View style={styles.ticks} accessibilityRole="tablist">
        {GUIDE_CHAPTERS.map((chapter) => (
          <View key={chapter.id} style={styles.chapterGroup}>
            {chapter.missions.map((mission) => (
              <MissionTick
                key={mission}
                state={missionState(mission)}
                isCurrent={mission === currentMission}
                label={`${chapter.label.toLowerCase()} mission`}
                onPress={() => onSelectMission(mission)}
              />
            ))}
          </View>
        ))}
      </View>

      {onSkip ? (
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip this step"
          style={({ pressed }) => [styles.skip, { opacity: pressed ? 0.5 : 1 }]}
        >
          <ThemedText style={[styles.skipText, { color: theme.textMuted }]}>SKIP</ThemedText>
        </Pressable>
      ) : (
        <View style={styles.skip} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
    zIndex: 200,
  },
  close: {
    width: HIT,
    height: HIT,
    borderRadius: HIT / 2,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  chapterGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  tick: {
    width: TICK_WIDTH,
    height: TICK_HEIGHT,
  },
  tickTrack: {
    borderRadius: TICK_HEIGHT / 2,
  },
  tickFill: {
    borderRadius: TICK_HEIGHT / 2,
    transformOrigin: 'left',
  },
  skip: {
    minWidth: HIT,
    height: HIT,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  skipText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2,
  },
});
