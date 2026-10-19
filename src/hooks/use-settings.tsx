import { create } from "zustand";
import {
  getSetting,
  setSetting as dbSetSetting,
  getAllSettings,
} from "@/db/settings-repository";
import { track } from "@/services/analytics";
import type { ThemeMode } from "./use-theme";

export type TimelineMode = 'yearly' | 'monthly' | 'infinite';

export interface GuideProgress {
  write: boolean;
  voice: boolean;
  capture: boolean;
  inspect: boolean;
  share: boolean;
  stickers: boolean;
  stories: boolean;
  /** The HABIT chapter: ink and the daily reminders. */
  rhythm: boolean;
}

export const defaultGuideProgress: GuideProgress = {
  write: false,
  voice: false,
  capture: false,
  inspect: false,
  share: false,
  stickers: false,
  stories: false,
  rhythm: false,
};

export interface UserSettings {
  name: string;
  dob: string;
  /** Profile photo in app storage; empty string shows the default orange disc. */
  avatarUri: string;
  theme: ThemeMode;
  requireBiometrics: boolean;
  privacyScreen: boolean;
  hasOnboarded: boolean;
  autoLocationTagging: boolean;
  autoPlayMusic: boolean;
  /** Touch feedback across the app. On by default. */
  hapticsEnabled: boolean;
  /** Strength of the home feed's photo backdrop, 0 (off) to 1. */
  backdropIntensity: number;
  timelineMode: TimelineMode;
  guideProgress: GuideProgress;
  guideDismissed: boolean;
  /** Epoch ms of the last guide restart. Only memories made after it auto-credit missions. */
  guideResetAt: number;
  /** The first-launch permission prompts have run. */
  startupPermissionsAsked: boolean;
}

/**
 * Settings whose changes are reported to analytics, by their event name.
 * Personal ones (name, date of birth, photo) and internal state are never sent.
 */
const TRACKED_SETTINGS: Partial<Record<keyof UserSettings, string>> = {
  theme: 'theme',
  requireBiometrics: 'require_biometrics',
  privacyScreen: 'privacy_screen',
  autoLocationTagging: 'auto_location',
  autoPlayMusic: 'autoplay_audio',
  hapticsEnabled: 'haptics',
  backdropIntensity: 'photo_glow',
  timelineMode: 'timeline_mode',
};

const defaultSettings: UserSettings = {
  name: "",
  dob: "",
  avatarUri: "",
  theme: "system",
  requireBiometrics: false,
  privacyScreen: false,
  hasOnboarded: false,
  autoLocationTagging: false,
  autoPlayMusic: false,
  hapticsEnabled: true,
  backdropIntensity: 0.6,
  timelineMode: 'yearly',
  guideProgress: defaultGuideProgress,
  guideDismissed: false,
  guideResetAt: 0,
  startupPermissionsAsked: false,
};

interface SettingsState {
  settings: UserSettings;
  loading: boolean;

  loadSettings: () => Promise<void>;
  /** Applies the value immediately; resolves false (and reverts) if it could not be stored. */
  updateSetting: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => Promise<boolean>;
  completeGuideStep: (step: keyof GuideProgress) => Promise<void>;
  /** Clears all mission progress and re-shows the field guide tab. */
  resetGuide: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  loading: true,

  loadSettings: async () => {
    try {
      set({ loading: true });
      const stored = await getAllSettings();
      let parsedGuideProgress = defaultGuideProgress;
      if (stored.guideProgress) {
        try {
          parsedGuideProgress = { ...defaultGuideProgress, ...JSON.parse(stored.guideProgress) };
        } catch {
          parsedGuideProgress = defaultGuideProgress;
        }
      }

      set({
        settings: {
          name: stored.name || "",
          dob: stored.dob || "",
          avatarUri: stored.avatarUri || "",
          theme: (stored.theme as ThemeMode) || defaultSettings.theme,
          requireBiometrics: stored.requireBiometrics === "true",
          privacyScreen: stored.privacyScreen === "true",
          hasOnboarded: stored.hasOnboarded === "true",
          autoLocationTagging: stored.autoLocationTagging === "true",
          autoPlayMusic: stored.autoPlayMusic === "true",
          hapticsEnabled: stored.hapticsEnabled !== "false",
          backdropIntensity:
            stored.backdropIntensity !== undefined && !Number.isNaN(Number(stored.backdropIntensity))
              ? Math.min(1, Math.max(0, Number(stored.backdropIntensity)))
              : defaultSettings.backdropIntensity,
          timelineMode: (stored.timelineMode as TimelineMode) || 'yearly',
          guideProgress: parsedGuideProgress,
          guideDismissed: stored.guideDismissed === "true",
          guideResetAt: Number(stored.guideResetAt) || 0,
          startupPermissionsAsked: stored.startupPermissionsAsked === "true",
        },
        loading: false,
      });
    } catch (err) {
      console.error("Failed to load settings", err);
      set({ loading: false });
    }
  },

  updateSetting: async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => {
    const previous = get().settings[key];

    // Optimistic UI update
    set((state) => ({
      settings: {
        ...state.settings,
        [key]: value,
      },
    }));

    // Persist to SQLite. If the write fails, put the old value back so the
    // screen never shows a setting that will be gone on the next launch.
    const strValue = typeof value === "object" ? JSON.stringify(value) : String(value);
    try {
      await dbSetSetting(key, strValue);
      const trackedAs = TRACKED_SETTINGS[key];
      if (trackedAs && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")) {
        track("setting_changed", { setting: trackedAs, value: typeof value === "number" ? Math.round(value * 100) / 100 : value });
      }
      return true;
    } catch (error) {
      console.error(`Failed to save setting "${String(key)}"`, error);
      set((state) => ({
        settings: {
          ...state.settings,
          [key]: previous,
        },
      }));
      return false;
    }
  },

  completeGuideStep: async (step: keyof GuideProgress) => {
    const current = get().settings.guideProgress;
    if (current[step]) return;
    const updated = { ...current, [step]: true };
    if (await get().updateSetting('guideProgress', updated)) {
      track('guide_step_completed', {
        step,
        completed_count: Object.values(updated).filter(Boolean).length,
      });
    }
  },

  resetGuide: async () => {
    const { updateSetting } = get();
    await updateSetting('guideProgress', defaultGuideProgress);
    await updateSetting('guideDismissed', false);
    await updateSetting('guideResetAt', Date.now());
    track('guide_reset', {});
  },
}));

// Provide backward compatibility for existing imports during refactor
export function useSettings() {
  return useSettingsStore();
}
