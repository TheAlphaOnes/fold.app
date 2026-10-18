/**
 * useQuickCapture — the orange key's two shortcut gestures, shared by the
 * home screen and the field guide so both behave identically.
 *
 *   hold      → record a voice take, saved instantly as its own memory
 *   swipe up  → open the camera, then hand the photo to the compose screen
 */

import { useCallback, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { useJournalStore } from '@/hooks/use-journal';
import { setPendingCameraMedia } from '@/utils/pending-camera-media';
import { endRecordingSession } from '@/utils/audio-session';
import type { MediaElement } from '@/types/journal';

export type CaptureStartResult = 'started' | 'denied' | 'released' | 'failed';
export type PhotoCaptureResult = 'opened' | 'denied' | 'cancelled' | 'busy' | 'failed';

/** Copies a temp capture into the documents directory so it survives reinstalls. */
async function persistCapture(uri: string, prefix: string, fallbackExt: string): Promise<string> {
  const extMatch = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : fallbackExt;
  const dest = `${FileSystem.documentDirectory}${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export function useQuickCapture() {
  const { width, height } = useWindowDimensions();
  const addComposition = useJournalStore((state) => state.addComposition);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);

  // The finger can lift while permissions/prepare are still resolving.
  const recordIntentRef = useRef(false);
  // Release and the overlay's tap-to-stop can both fire; only one may save.
  const isStoppingRef = useRef(false);
  const isCameraOpenRef = useRef(false);

  const startRecording = useCallback(async (): Promise<CaptureStartResult> => {
    recordIntentRef.current = true;
    try {
      const { status } = await AudioModule.requestRecordingPermissionsAsync();
      if (status !== 'granted') return 'denied';

      await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();

      if (!recordIntentRef.current) {
        await endRecordingSession();
        return 'released';
      }
      await recorder.record();
      return 'started';
    } catch (error) {
      console.error('Failed to start quick record', error);
      await endRecordingSession();
      return 'failed';
    }
  }, [recorder]);

  /** Stops the take and saves it as a memory. Resolves true when a memory was saved. */
  const stopRecording = useCallback(async (): Promise<boolean> => {
    recordIntentRef.current = false;
    if (isStoppingRef.current) return false;
    if (!recorder.isRecording && !recorder.uri) return false;

    isStoppingRef.current = true;
    try {
      await recorder.stop();
      // Leave record mode right away: iOS mutes haptics while it is active.
      await endRecordingSession();
      const uri = recorder.uri;
      if (!uri) return false;

      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists || (info.size !== undefined && info.size === 0)) return false;

      const dest = await persistCapture(uri, 'audio', 'm4a');
      const media: MediaElement = {
        id: Math.random().toString(36).substring(2, 9),
        uri: dest,
        type: 'audio',
        x_pos: 30 + Math.random() * (width - 150),
        y_pos: 30 + Math.random() * (height - 200),
      };

      await addComposition({
        textContent: '',
        mediaElements: [media],
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 16,
      });
      return true;
    } catch (error) {
      console.error('Failed to save quick record', error);
      return false;
    } finally {
      isStoppingRef.current = false;
    }
  }, [recorder, addComposition, width, height]);

  /** Opens the camera; a taken photo continues into the compose screen. */
  const capturePhoto = useCallback(async (): Promise<PhotoCaptureResult> => {
    if (isCameraOpenRef.current) return 'busy';
    isCameraOpenRef.current = true;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return 'denied';

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
      });
      if (result.canceled) return 'cancelled';

      const asset = result.assets[0];
      const dest = await persistCapture(asset.uri, 'camera', 'jpg');
      setPendingCameraMedia({ uri: dest, type: 'image', width: asset.width, height: asset.height });
      router.push('/compose');
      return 'opened';
    } catch (error) {
      console.error('Failed to launch camera', error);
      return 'failed';
    } finally {
      isCameraOpenRef.current = false;
    }
  }, []);

  return {
    isRecording: recorderState.isRecording,
    durationMillis: recorderState.durationMillis,
    startRecording,
    stopRecording,
    capturePhoto,
  };
}
