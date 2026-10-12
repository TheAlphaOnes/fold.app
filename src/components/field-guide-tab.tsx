import React from 'react';
import {
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useGuideProgress } from '@/hooks/use-guide-progress';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';

// --- Ring geometry ---
const RING_SIZE = 28;
const STROKE_WIDTH = 2.5;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * FieldGuideTab — a right-docked shelf-tab (identical shape to the Profile tab)
 * containing a small SVG progress ring with the completed count centered inside.
 * No animations, no glow — just clean data.
 */
export function FieldGuideTab() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { completedCount, totalCount, isAllCompleted } = useGuideProgress();

  if (isAllCompleted) {
    return null;
  }

  const progressFraction = completedCount / totalCount;
  const dashOffset = CIRCUMFERENCE * (1 - progressFraction);

  // Position: exactly 8px below the 44px-tall profile tab
  const topOffset = Math.max(insets.top, 20) + 44 + 8;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/guide');
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={{ top: 4, bottom: 4, left: 8, right: 0 }}
      style={({ pressed }) => [
        styles.tab,
        {
          top: topOffset,
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}
    >
      {/* SVG progress ring */}
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Background track */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={theme.border}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            opacity={0.6}
          />
          {/* Progress arc */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={isAllCompleted ? theme.textMuted : theme.accentWarm}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>

        {/* Center number */}
        <View style={styles.centerLabel}>
          <ThemedText
            style={[
              styles.countText,
              { color: isAllCompleted ? theme.textMuted : theme.text },
            ]}
          >
            {completedCount}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    position: 'absolute',
    right: 0,
    zIndex: 100,
    width: 58,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderWidth: 1,
    borderRightWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
});
