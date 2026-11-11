/**
 * CameraSurface — the live camera view, always inside its own native
 * container. Use it instead of a bare <CameraView> anywhere in the app.
 *
 * Why the container: tools that stream a camera into the iOS Simulator
 * (RocketSim's Simulator Camera) attach their own subview next to the camera
 * preview, inside its parent. If that parent is a screen React also manages,
 * React's view indices no longer match the native children and closing the
 * screen aborts the app (RCTViewComponentView unmountChildComponentView).
 * A dedicated, non-collapsible container gives such views a place of their
 * own that React only ever removes as a whole.
 *
 * `containerRef` is the container itself (e.g. for a snapshot of what the
 * viewfinder showed); `cameraRef` is the CameraView for taking pictures.
 */

import React, { type Ref } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { CameraView, type CameraViewProps } from 'expo-camera';

interface CameraSurfaceProps extends Omit<CameraViewProps, 'ref' | 'style'> {
  cameraRef: Ref<CameraView>;
  containerRef?: Ref<View>;
  style?: StyleProp<ViewStyle>;
}

export function CameraSurface({ cameraRef, containerRef, style, ...camera }: CameraSurfaceProps) {
  return (
    <View ref={containerRef} collapsable={false} style={[StyleSheet.absoluteFill, style]}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} {...camera} />
    </View>
  );
}
