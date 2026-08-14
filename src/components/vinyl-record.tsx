import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';

import { GrainBackground } from '@/components/grain-background';

import type { SharedValue } from 'react-native-reanimated';

interface VinylRecordProps {
  /** If true, the wheel spins and the orange dot pulses (recording mode). If false, it just spins (playback mode) */
  isRecording?: boolean;
  /** If true, the wheel is spinning. Otherwise it is stationary. */
  isPlaying?: boolean;
  /** Size of the wheel */
  size?: number;
  /** Optional offset applied to rotation (for scrubbing) */
  scrubOffset?: SharedValue<number>;
  /** Optional image URL to display as the center label of the record */
  imageUrl?: string;
}

/**
 * Redesigned from a classic vinyl to the Teenage Engineering TP-7 Field Recorder wheel.
 */
export function VinylRecord({ isRecording = false, isPlaying = false, size = 200, scrubOffset, imageUrl }: VinylRecordProps) {
  const theme = useTheme();
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  // Spin animation
  useEffect(() => {
    if (isPlaying || isRecording) {
      // Rotate clockwise if recording, counter-clockwise if just playing
      const targetRotation = isRecording ? 360 : -360;
      rotation.value = 0; // Reset before starting new loop to ensure correct direction
      rotation.value = withRepeat(
        withTiming(targetRotation, { duration: 3000, easing: Easing.linear }),
        -1, // Infinite
        false
      );
    } else {
      // Keep it at current rotation, just pause it
      rotation.value = rotation.value; 
    }
  }, [isPlaying, isRecording, rotation]);

  // Pulse animation for the recording dot
  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      pulse.value = 1;
    }
  }, [isRecording, pulse]);

  const spinStyle = useAnimatedStyle(() => {
    const offset = scrubOffset ? scrubOffset.value : 0;
    return {
      transform: [{ rotateZ: `${rotation.value + offset}deg` }],
    };
  });

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const centerHoleSize = size * 0.28;

  // The text scales nicely with the size of the wheel
  const fontSize = Math.max(8, size * 0.05);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* The TP-7 Motorized Wheel */}
      <Animated.View 
        style={[
          styles.wheel, 
          { width: size, height: size, borderRadius: size / 2 },
          spinStyle
        ]}
      >
        <GrainBackground />

        {/* Fine crosshair lines */}
        <View style={[styles.crosshair, { width: '100%', height: 1 }]} />
        <View style={[styles.crosshair, { width: 1, height: '100%' }]} />

        {/* Text Decals on the wheel */}
        <View style={{ position: 'absolute', top: size * 0.22, left: size * 0.22, transform: [{ rotate: '-45deg' }] }}>
           <Text style={[styles.wheelText, { fontSize }]}>96 / 24</Text>
        </View>
        <View style={{ position: 'absolute', bottom: size * 0.22, right: size * 0.22, transform: [{ rotate: '-45deg' }] }}>
           <Text style={[styles.wheelText, { fontSize }]}>3 ◯ M</Text>
        </View>

        {/* Center Metal Cap or Album Art */}
        <View style={[styles.centerCap, { width: centerHoleSize, height: centerHoleSize, borderRadius: centerHoleSize / 2, overflow: 'hidden' }]}>
          {imageUrl ? (
            <Image 
              source={{ uri: imageUrl }} 
              style={{ width: '100%', height: '100%' }}
              // Don't use expo-image if it's not imported in this file, use react-native Image
            />
          ) : (
            <View style={styles.capInner}>
               {/* 3 small mechanical divots/screws */}
               <View style={[styles.screw, { top: '15%' }]} />
               <View style={[styles.screw, { bottom: '20%', left: '20%' }]} />
               <View style={[styles.screw, { bottom: '20%', right: '20%' }]} />
            </View>
          )}
        </View>
      </Animated.View>

      {/* Recording Indicator Overlay (Flashing TE Orange Dot in center) */}
      {isRecording && (
        <Animated.View style={[styles.recordingIndicator, pulseStyle]}>
          <View style={styles.orangeDot} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 10,
  },
  wheel: {
    backgroundColor: '#D9DCDF', // Light metallic silver matching TP-7
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#B0B5BA',
  },
  crosshair: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  wheelText: {
    fontFamily: 'JetBrainsMono-Medium',
    color: 'rgba(0,0,0,0.3)',
    letterSpacing: 1,
  },
  centerCap: {
    backgroundColor: '#EDEDED',
    borderWidth: 1.5,
    borderColor: '#C0C0C0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  capInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  screw: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#888',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 0,
  },
  recordingIndicator: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  orangeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF4B00', // TE Orange
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FF4B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
});
