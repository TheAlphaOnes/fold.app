import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { X, Zap, ZapOff, Grid, SwitchCamera } from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setPendingCameraMedia } from "@/utils/pending-camera-media";
import { captureRef } from "react-native-view-shot";
import { Alert } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
  usePhotoOutput,
  useVideoOutput,
} from "react-native-vision-camera";

// ─── Rotating arc indicator — sweeps clockwise while recording ───
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function RotatingArc({ size }: { size: number }) {
  const rotation = useSharedValue(0);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.65;
  const gap = circumference - arcLength;

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1800, easing: Easing.linear }),
      -1,
      false,
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
        { justifyContent: "center", alignItems: "center" },
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
      <View
        style={[styles.gridLine, styles.gridVertical, { left: "33.33%" }]}
      />
      <View
        style={[styles.gridLine, styles.gridVertical, { left: "66.66%" }]}
      />
      <View
        style={[styles.gridLine, styles.gridHorizontal, { top: "33.33%" }]}
      />
      <View
        style={[styles.gridLine, styles.gridHorizontal, { top: "66.66%" }]}
      />
    </View>
  );
}

export default function CameraScreen() {
  const {
    hasPermission: hasCamPermission,
    requestPermission: requestCamPermission,
  } = useCameraPermission();
  const {
    hasPermission: hasMicPermission,
    requestPermission: requestMicPermission,
  } = useMicrophonePermission();

  const [cameraPosition, setCameraPosition] = useState<"back" | "front">(
    "back",
  );
  const device = useCameraDevice(cameraPosition);

  const [isRecording, setIsRecording] = useState(false);
  const [flash, setFlash] = useState<"on" | "off">("off");
  const [showGrid, setShowGrid] = useState(false);

  const photoOutput = usePhotoOutput();
  const videoOutput = useVideoOutput({ enableAudio: true });

  const cameraRef = useRef<any>(null);
  const containerRef = useRef<View>(null);
  const recorderRef = useRef<any>(null);
  const isCapturing = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const insets = useSafeAreaInsets();
  const buttonScale = useSharedValue(1);

  // ─── Focus state ───
  const focusPoint = useSharedValue({ x: 0, y: 0 });
  const focusOpacity = useSharedValue(0);
  const focusScale = useSharedValue(1.2);

  const handleFocus = useCallback(async (x: number, y: number) => {
    try {
      if (
        cameraRef.current &&
        typeof cameraRef.current.focusTo === "function"
      ) {
        await cameraRef.current.focusTo({ x, y });
      } else if (
        cameraRef.current &&
        typeof cameraRef.current.focus === "function"
      ) {
        await cameraRef.current.focus({ x, y });
      }
    } catch (e: any) {
      console.log("Focus error (non-fatal):", e?.message || e);
    }
  }, []);

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd((e) => {
        try {
          runOnJS(handleFocus)(e.x, e.y);
          focusPoint.value = { x: e.x, y: e.y };
          focusOpacity.value = 1;
          focusScale.value = 1.25;
          focusScale.value = withSpring(1, { damping: 12, stiffness: 220 });
          focusOpacity.value = withSequence(
            withTiming(1, { duration: 1200 }),
            withTiming(0, { duration: 300 }),
          );
        } catch (err) {
          console.log("Tap gesture error:", err);
        }
      }),
    [handleFocus],
  );

  const focusAnimStyle = useAnimatedStyle(() => ({
    opacity: focusOpacity.value,
    transform: [
      { translateX: focusPoint.value.x - 30 },
      { translateY: focusPoint.value.y - 30 },
      { scale: focusScale.value },
    ],
  }));

  useEffect(() => {
    if (!hasCamPermission) requestCamPermission();
    if (!hasMicPermission) requestMicPermission();
  }, [hasCamPermission, hasMicPermission]);

  // NOTE: useSkiaFrameProcessor was removed in Vision Camera v4/v5.
  // We cannot natively burn video frames in JS anymore. For now, video returns raw.
  const frameProcessor = undefined;

  // ── Photo capture ─────────────────────────────────────────────────────────
  const handleCapturePhoto = useCallback(async () => {
    if (isCapturing.current) return;
    isCapturing.current = true;

    buttonScale.value = withSequence(
      withTiming(0.88, { duration: 60 }),
      withSpring(1, { damping: 12 }),
    );

    try {
      if (!photoOutput) {
        console.warn("photoOutput not available, falling back to captureRef");
        if (containerRef.current) {
          const uri = await captureRef(containerRef, {
            format: "jpg",
            quality: 1,
          });
          await saveAndNavigate(uri, "image", 1080, 1920);
        } else {
          Alert.alert(
            "Not Supported",
            "Camera capture is not supported on this device or simulator.",
          );
        }
        return;
      }

      // V5 Photo Capture API — capturePhotoToFile(settings, callbacks)
      const photoFile = await photoOutput.capturePhotoToFile(
        { flashMode: flash === "on" ? "on" : "off" },
        {},
      );

      // PhotoFile only exposes `filePath` (filesystem path, not file:// URL)
      let uri = photoFile.filePath;
      if (!uri.startsWith("file://")) uri = `file://${uri}`;

      await saveAndNavigate(uri, "image", 0, 0);
    } catch (e) {
      console.error("Photo capture failed:", e);
    } finally {
      isCapturing.current = false;
    }
  }, [flash, photoOutput]);

  // ── Video recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!videoOutput) {
      Alert.alert(
        "Not Supported",
        "Video recording is not supported on this device or simulator.",
      );
      return;
    }

    setIsRecording(true);
    buttonScale.value = withSpring(0.75, { damping: 14 });

    try {
      // V5 Video Recording API
      const recorder = await videoOutput.createRecorder({});
      recorderRef.current = recorder;

      await recorder.startRecording(
        (filePath: string, reason: string) => {
          let uri = filePath;
          if (!uri.startsWith("file://")) uri = `file://${uri}`;
          saveAndNavigate(uri, "video", 1080, 1920);
        },
        (error: Error) => {
          console.error("Video recording failed:", error);
          setIsRecording(false);
          buttonScale.value = withSpring(1);
        },
      );
    } catch (e) {
      console.error("Video start failed:", e);
      setIsRecording(false);
      buttonScale.value = withSpring(1);
    }
  }, [videoOutput]);

  const stopRecording = useCallback(async () => {
    if (!recorderRef.current || !isRecording) return;
    try {
      await recorderRef.current.stopRecording();
      recorderRef.current = null;
    } catch (e) {
      console.error("Stop recording error:", e);
    }
    setIsRecording(false);
    buttonScale.value = withSpring(1);
  }, [isRecording]);

  const handlePressOut = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  // ── File save + navigate ──────────────────────────────────────────────────
  const saveAndNavigate = async (
    uri: string,
    type: "image" | "video",
    w?: number,
    h?: number,
  ) => {
    const extMatch = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
    const ext = extMatch
      ? extMatch[1].toLowerCase()
      : type === "video"
        ? "mp4"
        : "jpg";
    const dest = `${FileSystem.documentDirectory}camera_${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    setPendingCameraMedia({
      uri: dest,
      type,
      width: w || 1080,
      height: h || 1920,
    });
    router.replace("/compose");
  };

  const animatedBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    backgroundColor: isRecording ? "#FF3B30" : "#FFFFFF",
    borderRadius: isRecording ? 12 : 40,
  }));

  // ─── Permission screens ───────────────────────────────────────────────────
  if (!hasCamPermission || !hasMicPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera & Mic access is needed to capture memories.
        </Text>
        <Pressable
          style={styles.permissionBtn}
          onPress={() => {
            requestCamPermission();
            requestMicPermission();
          }}
        >
          <Text style={styles.permissionBtnText}>Grant Access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {device ? (
        <View ref={containerRef} style={StyleSheet.absoluteFill}>
          <GestureDetector gesture={tapGesture}>
            <View style={StyleSheet.absoluteFill}>
              <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
                outputs={[photoOutput, videoOutput].filter(Boolean)}
              />
              <Animated.View
                style={[styles.focusSquare, focusAnimStyle]}
                pointerEvents="none"
              />
            </View>
          </GestureDetector>
        </View>
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "#111",
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <Text
            style={{
              color: "rgba(255,255,255,0.3)",
              fontFamily: "JetBrainsMono-Medium",
            }}
          >
            SIMULATOR: NO CAMERA DEVICE
          </Text>
        </View>
      )}

      {/* ─── UI Overlay (Outside CameraView to prevent remounts) ─── */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Grid */}
        {showGrid && <CameraGrid />}

        {/* Header controls */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <X size={20} color="#FFF" />
          </Pressable>

          <View style={styles.headerRight}>
            <Pressable
              style={[styles.iconBtn, flash !== "off" && styles.iconBtnActive]}
              onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
            >
              {flash === "off" ? (
                <ZapOff size={18} color="#FFF" />
              ) : (
                <Zap size={18} color="#FFD700" />
              )}
            </Pressable>

            <Pressable
              style={[styles.iconBtn, showGrid && styles.iconBtnActive]}
              onPress={() => setShowGrid((g) => !g)}
            >
              <Grid size={18} color={showGrid ? "#FF4B00" : "#FFF"} />
            </Pressable>

            <Pressable
              style={styles.iconBtn}
              onPress={() =>
                setCameraPosition((p) => (p === "back" ? "front" : "back"))
              }
            >
              <SwitchCamera size={18} color="#FFF" />
            </Pressable>
          </View>
        </View>

        {/* Mode hint */}
        <View style={styles.modeHint}>
          {isRecording ? (
            <View style={styles.recDot} />
          ) : (
            <Text style={styles.modeHintText}>TAP PHOTO · HOLD VIDEO</Text>
          )}
        </View>

        {/* Controls */}
        <View style={[styles.controls, { paddingBottom: insets.bottom + 40 }]}>
          <Pressable
            onPress={handleCapturePhoto}
            onLongPress={startRecording}
            onPressOut={handlePressOut}
            delayLongPress={300}
          >
            <View style={{ justifyContent: "center", alignItems: "center" }}>
              {isRecording && <RotatingArc size={OUTER_SIZE + 14} />}
              <View style={styles.captureOuter}>
                <Animated.View
                  style={[styles.captureInner, animatedBtnStyle]}
                />
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const CAPTURE_SIZE = 72;
const OUTER_SIZE = 90;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerRight: {
    flexDirection: "row",
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.4)",
  },
  modeHint: {
    alignSelf: "center",
    marginBottom: 0,
  },
  modeHintText: {
    fontFamily: "JetBrainsMono-Medium",
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 2,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
  },
  controls: {
    alignItems: "center",
    justifyContent: "center",
  },
  captureOuter: {
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    borderRadius: OUTER_SIZE / 2,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: CAPTURE_SIZE,
    height: CAPTURE_SIZE,
    borderRadius: CAPTURE_SIZE / 2,
    backgroundColor: "#FFF",
  },
  gridLine: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.25)",
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
  focusSquare: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 60,
    height: 60,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#FFD700",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 32,
  },
  permissionText: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "JetBrainsMono-Medium",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: "#FF4B00",
    borderRadius: 6,
  },
  permissionBtnText: {
    color: "#000",
    fontFamily: "JetBrainsMono-Bold",
    fontSize: 13,
  },
});
