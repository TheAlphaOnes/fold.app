/**
 * Fold — Root Layout
 *
 * Initializes the local database on mount, sets up the light theme provider,
 * and renders the navigation stack with an animated splash overlay.
 * Fold is always light — a calm, soft-white app.
 *
 * All data stays on-device. Nothing is transmitted anywhere.
 */

import { DefaultTheme, DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { getDatabase } from '@/db';
import { AppThemeProvider, useThemeContext } from '@/hooks/use-theme';
import { AnimatedSplashScreen } from '@/components/splash-screen';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const [dbReady, setDbReady] = useState(false);
  const { isDark, colors } = useThemeContext();
  
  const BaseTheme = isDark ? DarkTheme : DefaultTheme;
  const FoldTheme = {
    ...BaseTheme,
    colors: {
      ...BaseTheme.colors,
      background: colors.background,
      text: colors.text,
      border: colors.border,
      card: colors.backgroundElement,
      primary: colors.accent,
    },
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    }
  }, []);

  useEffect(() => {
    getDatabase()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error('Database initialization failed:', err);
        setDbReady(true);
      });
  }, []);

  return (
    <ThemeProvider value={FoldTheme}>
      <AnimatedSplashScreen isAppReady={dbReady}>
        <StatusBar hidden />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </AnimatedSplashScreen>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <RootLayoutNav />
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

