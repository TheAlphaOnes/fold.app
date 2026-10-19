/**
 * Capture requests — a tapped moment reminder asks for the camera; the home
 * screen opens it once the app is visible and unlocked.
 */

import { useContext, useEffect } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { create } from 'zustand';

import { BiometricContext } from '@/components/biometric-gate';
import { useJournalStore } from '@/hooks/use-journal';
import { useSettingsStore } from '@/hooks/use-settings';
import { isMomentNotification } from '@/services/reminders.service';
import { noteReminderTap, track } from '@/services/analytics';

interface CaptureRequestState {
  photoRequested: boolean;
  requestPhoto: () => void;
  clear: () => void;
}

export const useCaptureRequest = create<CaptureRequestState>((set) => ({
  photoRequested: false,
  requestPhoto: () => set({ photoRequested: true }),
  clear: () => set({ photoRequested: false }),
}));

/** Turns a tap on a moment reminder (warm or cold start) into a photo request on home. */
export function useMomentReminderTaps(): void {
  const response = Notifications.useLastNotificationResponse();
  const hasOnboarded = useSettingsStore((state) => state.settings.hasOnboarded);

  useEffect(() => {
    if (!response || !hasOnboarded) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const data = response.notification.request.content.data;
    if (!isMomentNotification(data)) return;

    // Cleared first so the same tap is not handled again on the next launch.
    Notifications.clearLastNotificationResponseAsync().catch((error) =>
      console.error('Failed to clear notification response', error),
    );
    // Reminders scheduled before wordings were tagged carry no nudge.
    const nudge = data.nudge ?? 'unknown';
    track('reminder_opened', { moment: data.moment, nudge, tone: data.tone ?? 'plain' });
    noteReminderTap(nudge);
    router.navigate('/');
    useCaptureRequest.getState().requestPhoto();
  }, [response, hasOnboarded]);
}

/** On home: opens the camera for a pending request once the journal is on screen and unlocked. */
export function useFulfilPhotoRequest(capturePhoto: () => Promise<unknown>): void {
  const photoRequested = useCaptureRequest((state) => state.photoRequested);
  const appVisible = useJournalStore((state) => state.isAppVisible);
  const { isLocked } = useContext(BiometricContext);

  useEffect(() => {
    if (!photoRequested || !appVisible || isLocked) return;
    useCaptureRequest.getState().clear();
    void capturePhoto();
  }, [photoRequested, appVisible, isLocked, capturePhoto]);
}
