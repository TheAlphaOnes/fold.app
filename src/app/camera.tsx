import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, Text, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraMode, type FlashMode } from 'expo-camera';
import { router } from 'expo-router';
import { X, Zap, ZapOff, Grid } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setPendingCameraMedia } from '@/utils/pending-camera-media';

// ─── Rotating arc indicator — sweeps clockwise while recording ───
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function RotatingArc({ size }: { size: number }) {
  const rotation = useSharedValue(0);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc covers ~65% of the circle
  const arcLength = circumference * 0.65;
  const gap = circumference - arcLength;

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1800, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(rotation);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { justifyContent: 'center', alignItems: 'center' },
        animStyle,
      ]}
      pointerEvents="none"
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#FF3B30"
          strokeWidth={3}
          fill="none"
          strokeDasharray={`${arcLength} ${gap}`}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

// ─── Camera Grid overlay ───
function CameraGrid() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Vertical lines */}
      <View style={[styles.gridLine, styles.gridVertical, { left: '33.33%' }]} />
      <View style={[styles.gridLine, styles.gridVertical, { left: '66.66%' }]} />
      {/* Horizontal lines */}
      <View style={[styles.gridLine, styles.gridHorizontal, { top: '33.33%' }]} />
      <View style={[styles.gridLine, styles.gridHorizontal, { top: '66.66%' }]} />
    </View>
  );
}

export default function CameraScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<CameraMode>('picture');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [showGrid, setShowGrid] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const isCapturing = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Capture button scale animation
  const buttonScale = useSharedValue(1);
  const buttonBg = useSharedValue(1);

  useEffect(() => {
    if (!cameraPermission?.granted) requestCameraPermission();
    if (!micPermission?.granted) requestMicPermission();
  }, [cameraPermission, micPermission]);

  // ── Photo capture ─────────────────────────────────────────────────────────
  const handleCapturePhoto = useCallback(async () => {
    if (!cameraRef.current || isCapturing.current) return;
    if (mode !== 'picture') return;
    isCapturing.current = true;

    // Shutter flash animation
    buttonScale.value = withSequence(
      withTiming(0.88, { duration: 60 }),
      withSpring(1, { damping: 12 })
    );

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (photo) await saveAndNavigate(photo.uri, 'image', photo.width, photo.height);
    } catch (e) {
      console.error('Photo capture failed:', e);
    } finally {
      isCapturing.current = false;
    }
  }, [mode]);

  // ── Video recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!cameraRef.current) return;
    setMode('video');
    setIsRecording(true);
    buttonScale.value = withSpring(0.75, { damping: 14 });

    // Small delay to let mode switch settle before recording
    await new Promise(r => setTimeout(r, 150));
    try {
      const video = await cameraRef.current.recordAsync();
      if (video) await saveAndNavigate(video.uri, 'video');
    } catch (e) {
      console.error('Video record failed:', e);
    } finally {
      setIsRecording(false);
      setMode('picture');
      buttonScale.value = withSpring(1);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!cameraRef.current || !isRecording) return;
    cameraRef.current.stopRecording();
  }, [isRecording]);

  // ── Press handling (short = photo, long = video) ──────────────────────────
  const handlePressIn = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      startRecording();
    }, 350);
  }, [startRecording]);

  const handlePressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isRecording) {
      stopRecording();
    } else {
      handleCapturePhoto();
    }
  }, [isRecording, stopRecording, handleCapturePhoto]);

  // ── File save + navigate ──────────────────────────────────────────────────
  const saveAndNavigate = async (
    uri: string,
    type: 'image' | 'video',
    w?: number,
    h?: number
  ) => {
    const extMatch = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : type === 'video' ? 'mp4' : 'jpg';
    const dest = `${FileSystem.documentDirectory}camera_${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    setPendingCameraMedia({ uri: dest, type, width: w || 1080, height: h || 1920 });
    router.replace('/compose');
  };

  const animatedBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    backgroundColor: isRecording ? '#FF3B30' : '#FFFFFF',
    borderRadius: isRecording ? 12 : 40,
  }));

  // ─── Permission screens ───────────────────────────────────────────────────
  if (!cameraPermission || !micPermission) {
    return <View style={styles.container} />;
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access is needed to capture memories.</Text>
        <Pressable style={styles.permissionBtn} onPress={requestCameraPermission}>
          <Text style={styles.permissionBtnText}>Grant Access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mode={mode}
        flash={flash}
        zoom={0}
      >
        {/* Grid */}
        {showGrid && <CameraGrid />}

        {/* Header controls */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <X size={20} color="#FFF" />
          </Pressable>

          <View style={styles.headerRight}>
            {/* Flash toggle */}
            <Pressable
              style={[styles.iconBtn, flash !== 'off' && styles.iconBtnActive]}
              onPress={() => setFlash(f => (f === 'off' ? 'on' : 'off'))}
            >
              {flash === 'off'
                ? <ZapOff size={18} color="#FFF" />
                : <Zap size={18} color="#FFD700" />
              }
            </Pressable>

            {/* Grid toggle */}
            <Pressable
              style={[styles.iconBtn, showGrid && styles.iconBtnActive]}
              onPress={() => setShowGrid(g => !g)}
            >
              <Grid size={18} color={showGrid ? '#FF4B00' : '#FFF'} />
            </Pressable>
          </View>
        </View>

        {/* Mode hint */}
        <View style={styles.modeHint}>
          {isRecording
            ? <View style={styles.recDot} />
            : <Text style={styles.modeHintText}>TAP  PHOTO  ·  HOLD  VIDEO</Text>
          }
        </View>

        {/* Controls */}
        <View style={[styles.controls, { paddingBottom: insets.bottom + 40 }]}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <View style={styles.captureOuter}>
              {/* Rotating arc sweep when recording */}
              {isRecording && <RotatingArc size={OUTER_SIZE + 14} />}
              <Animated.View style={[styles.captureInner, animatedBtnStyle]} />
            </View>
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
}

const CAPTURE_SIZE = 72;
const OUTER_SIZE = 90;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1, justifyContent: 'space-between' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.4)',
  },

  // Mode hint
  modeHint: {
    alignSelf: 'center',
    marginBottom: 0,
  },
  modeHintText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },

  // Controls
  controls: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureOuter: {
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    borderRadius: OUTER_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: CAPTURE_SIZE,
    height: CAPTURE_SIZE,
    borderRadius: CAPTURE_SIZE / 2,
    backgroundColor: '#FFF',
  },

  // Ripple rings
  ripple: {
    position: 'absolute',
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    borderRadius: OUTER_SIZE / 2,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },

  // Grid overlay
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  gridVertical: {
    width: 1,
    top: 0,
    bottom: 0,
  },
  gridHorizontal: {
    height: 1,
    left: 0,
    right: 0,
  },

  // Permissions
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 32,
  },
  permissionText: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'JetBrainsMono-Medium',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#FF4B00',
    borderRadius: 6,
  },
  permissionBtnText: {
    color: '#000',
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 13,
  },
});
