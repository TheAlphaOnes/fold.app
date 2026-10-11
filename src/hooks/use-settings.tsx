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
  timelineMode: TimelineMode;
  guideProgress: GuideProgress;
  guideDismissed: boolean;
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
  timelineMode: 'yearly',
  guideProgress: defaultGuideProgress,
  guideDismissed: false,
};

interface SettingsState {
  settings: UserSettings;
  loading: boolean;

  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => Promise<void>;
  completeGuideStep: (step: keyof GuideProgress) => Promise<void>;
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
          theme: (stored.theme as ThemeMode) || "light",
          requireBiometrics: stored.requireBiometrics === "true",
          privacyScreen: stored.privacyScreen === "true",
          hasOnboarded: stored.hasOnboarded === "true",
          autoLocationTagging: stored.autoLocationTagging === "true",
          autoPlayMusic: stored.autoPlayMusic === "true",
          timelineMode: (stored.timelineMode as TimelineMode) || 'yearly',
          guideProgress: parsedGuideProgress,
          guideDismissed: stored.guideDismissed === "true",
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
    // Optimistic UI update
    set((state) => ({
      settings: {
        ...state.settings,
        [key]: value,
      },
    }));

    // Persist to SQLite
    const strValue = typeof value === "object" ? JSON.stringify(value) : String(value);
    await dbSetSetting(key, strValue);
  },

  completeGuideStep: async (step: keyof GuideProgress) => {
    const current = get().settings.guideProgress;
    if (current[step]) return;
    const updated = { ...current, [step]: true };
    await get().updateSetting('guideProgress', updated);
  },
}));

// Provide backward compatibility for existing imports during refactor
export function useSettings() {
  return useSettingsStore();
}
