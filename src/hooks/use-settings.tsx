import { create } from "zustand";
import {
  getSetting,
  setSetting as dbSetSetting,
  getAllSettings,
} from "@/db/settings-repository";
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
}

export const defaultGuideProgress: GuideProgress = {
  write: false,
  voice: false,
  capture: false,
  inspect: false,
  share: false,
  stickers: false,
  stories: false,
};

export interface UserSettings {
  name: string;
  dob: string;
  theme: ThemeMode;
  requireBiometrics: boolean;
  privacyScreen: boolean;
  hasOnboarded: boolean;
  autoLocationTagging: boolean;
  autoPlayMusic: boolean;
  /** Touch feedback across the app. On by default. */
  hapticsEnabled: boolean;
  timelineMode: TimelineMode;
  guideProgress: GuideProgress;
  guideDismissed: boolean;
  /** Epoch ms of the last guide restart. Only memories made after it auto-credit missions. */
  guideResetAt: number;
}

const defaultSettings: UserSettings = {
  name: "",
  dob: "",
  theme: "system",
  requireBiometrics: false,
  privacyScreen: false,
  hasOnboarded: false,
  autoLocationTagging: false,
  autoPlayMusic: false,
  hapticsEnabled: true,
  timelineMode: 'yearly',
  guideProgress: defaultGuideProgress,
  guideDismissed: false,
  guideResetAt: 0,
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
          theme: (stored.theme as ThemeMode) || defaultSettings.theme,
          requireBiometrics: stored.requireBiometrics === "true",
          privacyScreen: stored.privacyScreen === "true",
          hasOnboarded: stored.hasOnboarded === "true",
          autoLocationTagging: stored.autoLocationTagging === "true",
          autoPlayMusic: stored.autoPlayMusic === "true",
          hapticsEnabled: stored.hapticsEnabled !== "false",
          timelineMode: (stored.timelineMode as TimelineMode) || 'yearly',
          guideProgress: parsedGuideProgress,
          guideDismissed: stored.guideDismissed === "true",
          guideResetAt: Number(stored.guideResetAt) || 0,
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
    await get().updateSetting('guideProgress', updated);
  },

  resetGuide: async () => {
    const { updateSetting } = get();
    await updateSetting('guideProgress', defaultGuideProgress);
    await updateSetting('guideDismissed', false);
    await updateSetting('guideResetAt', Date.now());
  },
}));

// Provide backward compatibility for existing imports during refactor
export function useSettings() {
  return useSettingsStore();
}
