/**
 * useQuickCapture — the orange key's two shortcut gestures, shared by the
 * home screen and the field guide so both behave identically.
 *
 *   hold      → start a voice take; it keeps recording after release, can
 *               be paused, and on Save opens in the compose screen as a
 *               voice disc (or is thrown away on Discard)
 *   swipe up  → open the app's camera; the photo or video starts a new memory
 */

import { useCallback, useRef } from 'react';

import * as FileSystem from 'expo-file-system/legacy';
import { Camera } from 'expo-camera';

import { setPendingCameraMedia } from '@/utils/pending-camera-media';
import { useVoiceTake, type CaptureStartResult } from '@/hooks/use-voice-take';
import { trackError } from '@/services/analytics';
import { navigate } from '@/utils/navigation';

export type { CaptureStartResult };
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
  const take = useVoiceTake();
  const isCameraOpenRef = useRef(false);

  /**
   * Ends the take and opens it in the compose screen as a voice disc, so it
   * can be framed, written around and saved there (nothing lands on the
   * timeline by itself). Resolves true when the composer was opened.
   */
  const saveRecording = useCallback(async (): Promise<boolean> => {
    try {
      const uri = await take.finish();
      if (!uri) return false;
      const dest = await persistCapture(uri, 'audio', 'm4a');
      setPendingCameraMedia({ uri: dest, type: 'audio' });
      navigate.push('/compose');
      return true;
    } catch (error) {
      console.error('Failed to keep quick record', error);
      trackError(error, 'quick_voice_save');
      return false;
    }
  }, [take]);

  /**
   * Opens the app's camera (/capture); a photo or video taken there continues
   * into the compose screen. Asks for camera access first, so callers can
   * explain a refusal where the gesture happened.
   */
  const capturePhoto = useCallback(async (): Promise<PhotoCaptureResult> => {
    if (isCameraOpenRef.current) return 'busy';
    isCameraOpenRef.current = true;
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') return 'denied';
      navigate.push('/capture');
      return 'opened';
    } catch (error) {
      trackError(error, 'quick_capture_camera');
      return 'failed';
    } finally {
      isCameraOpenRef.current = false;
    }
  }, []);

  return {
    /** A voice take is in progress (recording or paused). */
    isRecording: take.isActive,
    isPaused: take.isPaused,
    durationMillis: take.durationMillis,
    startRecording: take.start,
    pauseRecording: take.pause,
    resumeRecording: take.resume,
    saveRecording,
    discardRecording: take.discard,
    capturePhoto,
  };
}
