import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { Check, Pause, Play, X, type LucideIcon } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { VinylRecord } from '@/components/vinyl-record';
import { fadeIn, riseIn } from '@/constants/motion';
import { haptic } from '@/services/haptics';
import { formatMillis } from '@/utils/format-date';

interface RecordingOverlayProps {
  /** A take is in progress (recording or paused). */
  visible: boolean;
  paused: boolean;
  /** Live take duration; holds still while paused. */
  durationMillis: number;
  onPause: () => void;
  onResume: () => void;
  /** Stop and keep the take. */
  onSave: () => void;
  /** Stop and throw the take away (after confirming). */
  onDiscard: () => void;
}

/**
 * Full-screen recording overlay: vignette, TP-7 wheel, elapsed time, and the
 * three voice-memo controls — Discard, Pause/Resume, Save. Only Save keeps
 * the take, so a stray tap can no longer add a recording nobody wanted.
 *
 * The wheel spins and the dot pulses while recording; both rest while paused.
 * The controls rise in on their own short delays (discard, main, save).
 *
 * **Architecture note:** an absolutely positioned View, not a Modal. The
 * overlay appears mid-hold on the orange key, and a Modal's separate native
 * hierarchy would rip the active touch away from the key's gesture handler.
 * The full-screen backdrop absorbs touches so nothing underneath is hit;
 * only the three buttons act.
 */
export function RecordingOverlay({
  visible,
  paused,
  durationMillis,
  onPause,
  onResume,
  onSave,
  onDiscard,
}: RecordingOverlayProps) {
  const theme = useTheme();
  const vignetteColor = theme.background === '#FFFFFF' ? '#FFFFFF' : '#000000';

  if (!visible) return null;

  const confirmDiscard = () => {
    // Pause first so the take doesn't keep growing behind the question.
    if (!paused) onPause();
    Alert.alert('Discard recording?', 'It won’t be saved.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onDiscard },
    ]);
  };

  return (
    <View style={styles.container} pointerEvents="auto">
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="recordingVignette" cx="50%" cy="50%" rx="70%" ry="70%" fx="50%" fy="50%">
              <Stop offset="0%" stopColor={vignetteColor} stopOpacity="0.4" />
              <Stop offset="40%" stopColor={vignetteColor} stopOpacity="0.7" />
              <Stop offset="100%" stopColor={vignetteColor} stopOpacity="0.95" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#recordingVignette)" />
        </Svg>
      </View>

      <View pointerEvents="none" style={styles.center}>
        <VinylRecord size={300} isRecording={!paused} />
        <ThemedText style={[styles.hint, { color: theme.textMuted }]}>{paused ? 'PAUSED' : 'RECORDING'}</ThemedText>
        <ThemedText style={[styles.timer, { color: theme.text }]}>{formatMillis(durationMillis)}</ThemedText>
      </View>

      <View style={styles.controls}>
        <Animated.View entering={riseIn(260, 80, 10)}>
          <Control icon={X} label="DISCARD" onPress={confirmDiscard} />
        </Animated.View>
        <Animated.View entering={riseIn(300, 0, 12)}>
          <Control
            primary
            icon={paused ? Play : Pause}
            label={paused ? 'RESUME' : 'PAUSE'}
            onPress={paused ? onResume : onPause}
          />
        </Animated.View>
        <Animated.View entering={riseIn(260, 140, 10)}>
          <Control icon={Check} label="SAVE" onPress={onSave} />
        </Animated.View>
      </View>
    </View>
  );
}

function Control({
  icon: Icon,
  label,
  onPress,
  primary,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const theme = useTheme();
  const size = primary ? PRIMARY : SECONDARY;
  return (
    <View style={styles.control}>
      {/* Every button sits in the primary's height, so the labels line up. */}
      <View style={styles.buttonSlot}>
        <Pressable
          onPress={() => {
            haptic.tap();
            onPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={label.toLowerCase()}
          hitSlop={8}
          style={({ pressed }) => [
            styles.button,
            { width: size, height: size, borderRadius: size / 2 },
            primary
              ? { backgroundColor: theme.text, borderColor: theme.text }
              : {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
            pressed && styles.pressed,
          ]}
        >
          <Icon
            size={primary ? 26 : 20}
            color={primary ? theme.background : theme.text}
            fill={primary ? theme.background : 'none'}
          />
        </Pressable>
      </View>
      <Animated.View entering={fadeIn(200, 200)}>
        <ThemedText style={[styles.controlLabel, { color: theme.textMuted }]}>{label}</ThemedText>
      </Animated.View>
    </View>
  );
}

const PRIMARY = 72;
const SECONDARY = 52;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 99999,
    elevation: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    // Absorbs touches so nothing underneath reacts; near-invisible so
    // absolute views still capture them on every RN version.
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  center: {
    alignItems: 'center',
  },
  hint: {
    marginTop: 40,
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 2,
  },
  timer: {
    marginTop: 12,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 24,
    letterSpacing: 2,
    opacity: 0.8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 36,
    marginTop: 40,
  },
  control: {
    alignItems: 'center',
    gap: 10,
    minWidth: PRIMARY,
  },
  buttonSlot: {
    height: PRIMARY,
    justifyContent: 'center',
  },
  button: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    letterSpacing: 2,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.8,
  },
});
