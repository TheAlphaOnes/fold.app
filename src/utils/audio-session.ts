import { AudioModule } from 'expo-audio';

/**
 * Return the audio session to plain playback after a recording.
 *
 * Recording switches iOS to the play-and-record category, and iOS mutes
 * haptics (and system sounds) in that category. Leaving it set after a take
 * silenced every haptic in the app until restart, so each recording path
 * calls this when it ends — on success, cancel or failure.
 */
export async function endRecordingSession(): Promise<void> {
  try {
    await AudioModule.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  } catch (error) {
    console.error('Failed to reset the audio session after recording', error);
  }
}
