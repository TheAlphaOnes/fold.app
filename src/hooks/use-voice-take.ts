/**
 * useVoiceTake — one voice recording from start to finish, shared by every
 * place that records (the orange key's hold, compose's mic) so pause,
 * resume, save and discard behave the same everywhere.
 *
 *   idle → start() → recording ⇄ pause()/resume() → finish() or discard() → idle
 *
 * finish() hands back the recorded file for the caller to keep; discard()
 * deletes it. Nothing is saved as a memory here — that's the caller's call.
 */

import { useCallback, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { AudioModule, RecordingPresets, useAudioRecorder, useAudioRecorderState } from 'expo-audio';

import { endRecordingSession } from '@/utils/audio-session';

export type TakeState = 'idle' | 'recording' | 'paused';
export type CaptureStartResult = 'started' | 'denied' | 'released' | 'failed';

export function useVoiceTake() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const status = useAudioRecorderState(recorder, 100);
  const [state, setState] = useState<TakeState>('idle');

  // A finish/discard can land while permissions/prepare are still resolving;
  // the start then backs out instead of recording with nothing to end it.
  const intentRef = useRef(false);
  // Two quick taps on Save or Discard must only end the take once.
  const endingRef = useRef(false);

  const start = useCallback(async (): Promise<CaptureStartResult> => {
    intentRef.current = true;
    try {
      const { status: permission } = await AudioModule.requestRecordingPermissionsAsync();
      if (permission !== 'granted') return 'denied';

      await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();

      if (!intentRef.current) {
        await endRecordingSession();
        return 'released';
      }
      recorder.record();
      setState('recording');
      return 'started';
    } catch (error) {
      console.error('Failed to start recording', error);
      await endRecordingSession();
      return 'failed';
    }
  }, [recorder]);

  const pause = useCallback(() => {
    if (state !== 'recording') return;
    recorder.pause();
    setState('paused');
  }, [recorder, state]);

  const resume = useCallback(() => {
    if (state !== 'paused') return;
    recorder.record();
    setState('recording');
  }, [recorder, state]);

  /** Stops and returns the recorded file, or null if there's nothing usable. */
  const finish = useCallback(async (): Promise<string | null> => {
    intentRef.current = false;
    if (endingRef.current || state === 'idle') return null;
    endingRef.current = true;
    try {
      await recorder.stop();
      // Leave record mode right away: iOS mutes haptics while it is active.
      await endRecordingSession();
      const uri = recorder.uri;
      if (!uri) return null;
      const info = await FileSystem.getInfoAsync(uri);
      return info.exists && (info.size === undefined || info.size > 0) ? uri : null;
    } finally {
      setState('idle');
      endingRef.current = false;
    }
  }, [recorder, state]);

  /** Stops and throws the take away; nothing is kept. */
  const discard = useCallback(async (): Promise<void> => {
    intentRef.current = false;
    if (endingRef.current || state === 'idle') return;
    endingRef.current = true;
    try {
      await recorder.stop();
      await endRecordingSession();
      if (recorder.uri) await FileSystem.deleteAsync(recorder.uri, { idempotent: true });
    } catch (error) {
      console.warn('Failed to discard recording', error);
    } finally {
      setState('idle');
      endingRef.current = false;
    }
  }, [recorder, state]);

  return {
    state,
    /** A take is in progress, recording or paused. */
    isActive: state !== 'idle',
    isPaused: state === 'paused',
    durationMillis: status.durationMillis,
    start,
    pause,
    resume,
    finish,
    discard,
  };
}
