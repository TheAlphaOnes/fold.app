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
import { 
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import { PlayfairDisplay_400Regular, PlayfairDisplay_500Medium, PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display';
import { ComicNeue_400Regular, ComicNeue_700Bold, ComicNeue_400Regular_Italic } from '@expo-google-fonts/comic-neue';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Caveat_400Regular, Caveat_600SemiBold, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { DancingScript_400Regular } from '@expo-google-fonts/dancing-script';
import { Righteous_400Regular } from '@expo-google-fonts/righteous';
import { EBGaramond_400Regular } from '@expo-google-fonts/eb-garamond';

import { getDatabase } from '@/db';
import { AppThemeProvider, useThemeContext } from '@/hooks/use-theme';
import { SettingsProvider } from '@/hooks/use-settings';
import { AnimatedSplashScreen } from '@/components/splash-screen';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const [dbReady, setDbReady] = useState(false);
  const { isDark, colors } = useThemeContext();

  const [fontsLoaded] = useFonts({
    'JetBrainsMono-Light': require('../../assets/fonts/JetBrainsMono-Light.ttf'),
    'JetBrainsMono-Regular': require('../../assets/fonts/JetBrainsMono-Regular.ttf'),
    'JetBrainsMono-Medium': require('../../assets/fonts/JetBrainsMono-Medium.ttf'),
    'JetBrainsMono-SemiBold': require('../../assets/fonts/JetBrainsMono-SemiBold.ttf'),
    'JetBrainsMono-Bold': require('../../assets/fonts/JetBrainsMono-Bold.ttf'),
    'JetBrainsMono-Italic': require('../../assets/fonts/JetBrainsMono-Italic.ttf'),
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular_Italic,
    ComicNeue_400Regular,
    ComicNeue_700Bold,
    ComicNeue_400Regular_Italic,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    BebasNeue_400Regular,
    Caveat_400Regular,
    Caveat_600SemiBold,
    Caveat_700Bold,
    DancingScript_400Regular,
    Righteous_400Regular,
    EBGaramond_400Regular,
  });

  const isAppReady = dbReady && fontsLoaded;
  
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
      <AnimatedSplashScreen isAppReady={isAppReady}>
        <StatusBar hidden />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen 
            name="compose" 
            options={{ 
              headerShown: false,
              animation: 'slide_from_right'
            }} 
          />
        </Stack>
      </AnimatedSplashScreen>
    </ThemeProvider>
  );
}

import { BiometricGate } from '@/components/biometric-gate';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <AppThemeProvider>
          <BiometricGate>
            <RootLayoutNav />
          </BiometricGate>
        </AppThemeProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}

