/**
 * AnalyticsSync — renders nothing. Keeps PostHog in step with the app:
 *
 *   - opt-in follows the "Share usage data" setting;
 *   - every event carries where the device is set to (region, language,
 *     timezone). PostHog's GeoIP adds country and city from the IP on top;
 *   - the anonymous person carries preferences and an age bracket, for
 *     cohorts and retention breakdowns;
 *   - screen views are named by route template ("/memory/[id]"), so one
 *     screen is one row however many memories were opened.
 */

import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useSegments } from 'expo-router';
import * as Localization from 'expo-localization';

import { useSettingsStore } from '@/hooks/use-settings';
import {
  registerSuperProperties,
  setAnalyticsEnabled,
  setPersonProperties,
  trackScreen,
} from '@/services/analytics';
import { getNotificationPermission } from '@/services/reminders.service';
import { getAgeRange } from '@/utils/dob';

function deviceLocale() {
  const locale = Localization.getLocales()[0];
  const timezone =
    Localization.getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    device_region: locale?.regionCode ?? null,
    device_language: locale?.languageCode ?? null,
    device_timezone: timezone ?? null,
    device_currency: locale?.currencyCode ?? null,
    uses_metric: locale?.measurementSystem ? locale.measurementSystem === 'metric' : null,
  };
}

/** Where the device is set to; on every event and on the person. */
function useLocaleProperties(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    try {
      const locale = deviceLocale();
      registerSuperProperties(locale);
      setPersonProperties(locale);
    } catch (error) {
      console.error('Failed to read device locale for analytics', error);
    }
  }, [enabled]);
}

/** Preferences and an age bracket on the person. Never the name or birth date. */
function usePreferenceProperties(enabled: boolean) {
  const settings = useSettingsStore((state) => state.settings);

  useEffect(() => {
    if (!enabled) return;
    const completed = Object.values(settings.guideProgress).filter(Boolean).length;
    setPersonProperties({
      platform: Platform.OS,
      has_name: settings.name.length > 0,
      has_photo: settings.avatarUri.length > 0,
      age_range: getAgeRange(settings.dob),
      onboarded: settings.hasOnboarded,
      theme: settings.theme,
      timeline_mode: settings.timelineMode,
      haptics: settings.hapticsEnabled,
      require_biometrics: settings.requireBiometrics,
      privacy_screen: settings.privacyScreen,
      auto_location: settings.autoLocationTagging,
      autoplay_audio: settings.autoPlayMusic,
      photo_glow: Math.round(settings.backdropIntensity * 100) / 100,
      guide_completed: completed,
    });
  }, [enabled, settings]);
}

/** Notification permission can change in system Settings; re-read on every return. */
function useNotificationProperty(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const report = () => {
      getNotificationPermission()
        .then((permission) => setPersonProperties({ notifications: permission }))
        .catch((error) => console.error('Failed to read notification permission', error));
    };
    report();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') report();
    });
    return () => subscription.remove();
  }, [enabled]);
}

function useScreenViews(enabled: boolean) {
  const segments = useSegments();
  const route = `/${segments.join('/')}`;

  useEffect(() => {
    if (enabled) trackScreen(route);
  }, [enabled, route]);
}

export function AnalyticsSync() {
  const enabled = useSettingsStore((state) => state.settings.analyticsEnabled);
  const loading = useSettingsStore((state) => state.loading);
  // Until settings load, the stored choice is unknown; hold everything.
  const active = !loading && enabled;

  useEffect(() => {
    if (!loading) setAnalyticsEnabled(enabled);
  }, [enabled, loading]);

  useLocaleProperties(active);
  usePreferenceProperties(active);
  useNotificationProperty(active);
  useScreenViews(active);
  return null;
}
