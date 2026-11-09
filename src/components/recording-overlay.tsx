import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Check, Pause, Play, X, type LucideIcon } from 'lucide-react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MOMENT_DIM_OPACITY, MOMENT_INK } from '@/components/moment-dim';
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
 * Full-screen recording overlay: the moment dim, the TP-7 wheel centred on
 * screen with the elapsed time under it, and the three voice-memo controls
 * near the bottom — Discard, Pause/Resume, Save. Only Save keeps
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
  const insets = useSafeAreaInsets();

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
      {/* The app's moment dim: black in both themes, so the wheel and the
          white controls read over any card or photo underneath. */}
      <Animated.View entering={fadeIn(240)} style={[StyleSheet.absoluteFill, styles.dim]} pointerEvents="none" />

      {/* Wheel and time are one block, centred in the space above the
          controls, so the screen balances instead of crowding the bottom. */}
      <View style={[styles.center, { paddingTop: insets.top }]} pointerEvents="none">
        <Animated.View entering={fadeIn(320, 60)}>
          <VinylRecord size={WHEEL} isRecording={!paused} />
        </Animated.View>
        <Animated.View entering={fadeIn(240, 180)} style={styles.readout}>
          <ThemedText style={styles.hint}>{paused ? 'PAUSED' : 'RECORDING'}</ThemedText>
          <ThemedText style={styles.timer}>{formatMillis(durationMillis)}</ThemedText>
        </Animated.View>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 40 }]}>
        <Animated.View entering={riseIn(260, 220, 10)}>
          <Control icon={X} label="DISCARD" onPress={confirmDiscard} />
        </Animated.View>
        <Animated.View entering={riseIn(300, 160, 12)}>
          <Control
            primary
            icon={paused ? Play : Pause}
            label={paused ? 'RESUME' : 'PAUSE'}
            onPress={paused ? onResume : onPause}
          />
        </Animated.View>
        <Animated.View entering={riseIn(260, 280, 10)}>
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
            primary ? styles.primary : styles.secondary,
            pressed && styles.pressed,
          ]}
        >
          <Icon size={primary ? 26 : 20} color={primary ? '#111111' : MOMENT_INK} fill={primary ? '#111111' : 'none'} />
        </Pressable>
      </View>
      <Animated.View entering={fadeIn(200, 320)}>
        <ThemedText style={styles.controlLabel}>{label}</ThemedText>
      </Animated.View>
    </View>
  );
}

const WHEEL = 300;
const PRIMARY = 72;
const SECONDARY = 52;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 99999,
    elevation: 99999,
  },
  dim: { backgroundColor: '#000', opacity: Math.min(0.75, MOMENT_DIM_OPACITY + 0.2) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  readout: { marginTop: 28, alignItems: 'center' },
  hint: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 2,
    color: '#FFFFFFA6',
  },
  timer: {
    marginTop: 10,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 24,
    letterSpacing: 2,
    color: MOMENT_INK,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 36,
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
  primary: { backgroundColor: MOMENT_INK, borderColor: MOMENT_INK },
  secondary: { backgroundColor: 'transparent', borderColor: '#FFFFFF66' },
  controlLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    letterSpacing: 2,
    color: '#FFFFFFA6',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.8,
  },
});
