import { create } from "zustand";
import {
  getSetting,
  setSetting as dbSetSetting,
  getAllSettings,
} from "@/db/settings-repository";
import type { ThemeMode } from "./use-theme";

export type TimelineMode = 'yearly' | 'monthly' | 'infinite';

export interface UserSettings {
  name: string;
  dob: string;
  dataCollection: boolean;
  theme: ThemeMode;
  requireBiometrics: boolean;
  privacyScreen: boolean;
  hasOnboarded: boolean;
  autoLocationTagging: boolean;
  autoPlayMusic: boolean;
  timelineMode: TimelineMode;
}

const defaultSettings: UserSettings = {
  name: "",
  dob: "",
  dataCollection: true,
  theme: "system",
  requireBiometrics: false,
  privacyScreen: false,
  hasOnboarded: false,
  autoLocationTagging: false,
  autoPlayMusic: false,
  timelineMode: 'yearly',
};

interface SettingsState {
  settings: UserSettings;
  loading: boolean;

  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  loading: true,

  loadSettings: async () => {
    try {
      set({ loading: true });
      const stored = await getAllSettings();
      set({
        settings: {
          name: stored.name || "",
          dob: stored.dob || "",
          dataCollection: stored.dataCollection === "true",
          theme: (stored.theme as ThemeMode) || "light",
          requireBiometrics: stored.requireBiometrics === "true",
          privacyScreen: stored.privacyScreen === "true",
          hasOnboarded: stored.hasOnboarded === "true",
          autoLocationTagging: stored.autoLocationTagging === "true",
          autoPlayMusic: stored.autoPlayMusic === "true",
          timelineMode: (stored.timelineMode as TimelineMode) || 'yearly',
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
    const strValue = typeof value === "boolean" ? String(value) : String(value);
    await dbSetSetting(key, strValue);
  },
}));

// Provide backward compatibility for existing imports during refactor
export function useSettings() {
  return useSettingsStore();
}
