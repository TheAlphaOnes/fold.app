import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSetting, setSetting as dbSetSetting, getAllSettings } from '@/db/settings-repository';
import type { ThemeMode } from './use-theme';

export interface UserSettings {
  name: string;
  dob: string;
  dataCollection: boolean;
  theme: ThemeMode;
  requireBiometrics: boolean;
  privacyScreen: boolean;
}

const defaultSettings: UserSettings = {
  name: '',
  dob: '',
  dataCollection: false,
  theme: 'light',
  requireBiometrics: false,
  privacyScreen: false,
};

interface SettingsContextValue {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const stored = await getAllSettings();
        setSettings({
          name: stored.name || '',
          dob: stored.dob || '',
          dataCollection: stored.dataCollection === 'true',
          theme: (stored.theme as ThemeMode) || 'light',
          requireBiometrics: stored.requireBiometrics === 'true',
          privacyScreen: stored.privacyScreen === 'true',
        });
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const updateSetting = useCallback(async <K extends keyof UserSettings,>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    const strValue = typeof value === 'boolean' ? String(value) : String(value);
    await dbSetSetting(key, strValue);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
