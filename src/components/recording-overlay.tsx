import React from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
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
 * The single recording overlay used everywhere (home quick-record and the
 * compose record chip): vignette, TP-7 wheel spinning with the pulsing
 * recording dot, elapsed time, tap anywhere to stop.
 */
export function RecordingOverlay({ visible, durationMillis, onStop }: RecordingOverlayProps) {
  const theme = useTheme();
  const vignetteColor = theme.background === '#FFFFFF' ? '#FFFFFF' : '#000000';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStop}>
      <Pressable
        style={styles.overlay}
        onPress={onStop}
        onPressOut={onStop}
        accessibilityRole="button"
        accessibilityLabel="Stop recording"
      >
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

        <VinylRecord size={300} isRecording />
        <ThemedText style={styles.hint}>TAP TO STOP</ThemedText>
        <ThemedText style={[styles.timer, { color: theme.text }]}>
          {formatMillis(durationMillis)}
        </ThemedText>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
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
