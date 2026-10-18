import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useGuideProgress } from '@/hooks/use-guide-progress';
import { useSettingsStore } from '@/hooks/use-settings';
import { EdgeTab } from '@/components/edge-tab';

// --- Ring geometry (sized to sit inside the 44px EdgeTab like the profile icon) ---
const RING_SIZE = 24;
const STROKE_WIDTH = 2.5;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// --- Count label ---
// A text box reserves descender space that digits never use, so flex-centering
// a <Text> leaves the digit optically high. Instead the count is drawn in SVG
// with its baseline placed so the digit's ink is centered: JetBrains Mono digits
// are cap-height tall (730/1000 em), so baseline = center + capHeight / 2.
const COUNT_FONT_SIZE = 10;
const CAP_HEIGHT_EM = 0.73;
const COUNT_BASELINE = RING_SIZE / 2 + (COUNT_FONT_SIZE * CAP_HEIGHT_EM) / 2;

/**
 * FieldGuideTab — the second shelf tab, below Profile, showing a small SVG
 * progress ring with the completed mission count centered inside.
 */
export function FieldGuideTab() {
  const theme = useTheme();
  const { completedCount, totalCount, isAllCompleted } = useGuideProgress();
  const guideDismissed = useSettingsStore((state) => state.settings.guideDismissed);

  if (isAllCompleted || guideDismissed) {
    return null;
  }

  const dashOffset = CIRCUMFERENCE * (1 - completedCount / totalCount);

  return (
    <EdgeTab
      slot={1}
      onPress={() => router.push('/guide')}
      accessibilityLabel={`Field guide, ${completedCount} of ${totalCount} complete`}
    >
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={theme.border}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            opacity={0.6}
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={theme.accentWarm}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
          <SvgText
            x={RING_SIZE / 2}
            y={COUNT_BASELINE}
            textAnchor="middle"
            fontFamily="JetBrainsMono-Bold"
            fontSize={COUNT_FONT_SIZE}
            fill={theme.text}
          >
            {completedCount}
          </SvgText>
        </Svg>
      </View>
    </EdgeTab>
  );
}

const styles = StyleSheet.create({
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
