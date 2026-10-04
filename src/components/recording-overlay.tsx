import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { VinylRecord } from '@/components/vinyl-record';
import { formatMillis } from '@/utils/format-date';

interface RecordingOverlayProps {
  /** Binds to recorderState.isRecording — the overlay only shows mid-take. */
  visible: boolean;
  /** Live take duration from useAudioRecorderState. */
  durationMillis: number;
  /** Fired when the user taps anywhere on the overlay (or presses back). */
  onStop: () => void;
}

/**
 * Full-screen recording overlay: vignette, TP-7 wheel, elapsed time.
 *
 * **Architecture note:** This intentionally uses an absolutely positioned View
 * instead of a Modal. A Modal creates a separate native view hierarchy which
 * rips the active touch away from gesture handlers (GestureDetector). When the
 * AddButton's LongPress gesture starts recording and this overlay appears
 * mid-hold, a Modal would steal the touch — the gesture's onFinalize would
 * never fire, and the user couldn't stop recording by releasing.
 *
 * With an absolute View in the same tree, the gesture handler keeps tracking
 * the original touch. Releasing the finger fires onFinalize → stops recording.
 * Tapping the overlay also works because the Pressable is the sole interactive
 * element (all visuals are pointerEvents="none").
 */
export function RecordingOverlay({ visible, durationMillis, onStop }: RecordingOverlayProps) {
  const theme = useTheme();
  const vignetteColor = theme.background === '#FFFFFF' ? '#FFFFFF' : '#000000';

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Pressable
        style={styles.overlay}
        onPress={onStop}
        pointerEvents="auto"
        accessibilityRole="button"
        accessibilityLabel="Stop recording"
      >
        {/* Vignette background — pointerEvents="none" so taps pass to Pressable */}
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

        {/* Content — also non-interactive so taps pass through */}
        <View pointerEvents="none" style={{ alignItems: 'center' }}>
          <VinylRecord size={300} isRecording />
          <ThemedText style={styles.hint}>TAP TO STOP</ThemedText>
          <ThemedText style={[styles.timer, { color: theme.text }]}>
            {formatMillis(durationMillis)}
          </ThemedText>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...(StyleSheet.absoluteFill as any),
    zIndex: 99999, // Super high z-index
    elevation: 99999,
  },
  overlay: {
    ...(StyleSheet.absoluteFill as any), // Force full screen
    justifyContent: 'center',
    alignItems: 'center',
    // In some RN versions, transparent won't capture touches on absolute views. Use near-invisible color.
    backgroundColor: 'rgba(0,0,0,0.01)', 
  },
  hint: {
    marginTop: 40,
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#878787',
  },
  timer: {
    marginTop: 12,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 24,
    letterSpacing: 2,
    opacity: 0.8,
  },
});
