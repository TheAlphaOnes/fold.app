import React, { createContext, useContext, useState } from 'react';
import { Colors } from '@/constants/theme';
import { useColorScheme as useSystemColorScheme } from '@/hooks/use-color-scheme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: typeof Colors.light | typeof Colors.dark;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to light manually, not automatic system theme
  const [mode, setMode] = useState<ThemeMode>('light');
  const systemScheme = useSystemColorScheme() ?? 'light';
  
  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark, colors }}>
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
