import React, { createContext, useContext, useState } from 'react';
import { Colors } from '@/constants/theme';
import { useColorScheme as useSystemColorScheme } from '@/hooks/use-color-scheme';

import { useSettings } from './use-settings';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  isDark: boolean;
  colors: typeof Colors.light | typeof Colors.dark;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, loading } = useSettings();
  const systemScheme = useSystemColorScheme() ?? 'light';
  
  // Wait for settings to load before deciding theme to prevent flicker, though
  // during loading it will default to light from defaultSettings
  const mode = settings.theme;
  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within AppThemeProvider');
  }
  return context;
}

// For backwards compatibility with existing components
export function useTheme() {
  return useThemeContext().colors;
}
