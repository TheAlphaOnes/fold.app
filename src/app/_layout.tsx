/**
 * Fold — Root Layout
 *
 * Initializes the local database on mount, sets up the light theme provider,
 * and renders the navigation stack with an animated splash overlay.
 * Fold is always light — a calm, soft-white app.
 *
 * All data stays on-device. Nothing is transmitted anywhere.
 */

import {
  DefaultTheme,
  DarkTheme,
  Stack,
  ThemeProvider,
  useSegments,
  router,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect, useState } from "react";
import { Platform, LogBox } from "react-native";

LogBox.ignoreLogs([
  'PostHogFetchNetworkError',
  'Error while flushing PostHog',
  'Network error while fetching PostHog'
]);
import { ProgressionSync } from "@/components/progression-sync";
import { configureNotifications } from "@/services/reminders.service";
import { useProgressionStore } from "@/hooks/use-progression";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular_Italic,
} from "@expo-google-fonts/playfair-display";
import {
  ComicNeue_400Regular,
  ComicNeue_700Bold,
  ComicNeue_400Regular_Italic,
} from "@expo-google-fonts/comic-neue";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  Caveat_400Regular,
  Caveat_600SemiBold,
  Caveat_700Bold,
} from "@expo-google-fonts/caveat";
import { DancingScript_400Regular } from "@expo-google-fonts/dancing-script";
import { Righteous_400Regular } from "@expo-google-fonts/righteous";
import { EBGaramond_400Regular } from "@expo-google-fonts/eb-garamond";
import {
  AmaticSC_400Regular,
  AmaticSC_700Bold,
} from "@expo-google-fonts/amatic-sc";
import { Pacifico_400Regular } from "@expo-google-fonts/pacifico";
import { PressStart2P_400Regular } from "@expo-google-fonts/press-start-2p";
import { PermanentMarker_400Regular } from "@expo-google-fonts/permanent-marker";

import { getDatabase } from "@/db";
import { purgeExpiredTrash } from "@/services/trash.service";
import { AppThemeProvider, useThemeContext } from "@/hooks/use-theme";
import { useSettingsStore } from "@/hooks/use-settings";
import { AnimatedSplashScreen } from "@/components/splash-screen";
import { PostHogProvider } from "posthog-react-native";
import { posthog } from "@/services/analytics";
import { AnalyticsSync } from "@/components/analytics-sync";
import { useStartupPermissions } from "@/hooks/use-startup-permissions";
import { usePhonePortraitLock } from "@/hooks/use-phone-portrait-lock";

SplashScreen.preventAutoHideAsync();

// Moment reminders that arrive while Fold is open still show as a banner.
configureNotifications();

function RootLayoutNav() {
  const [dbReady, setDbReady] = useState(false);
  const { isDark, colors } = useThemeContext();
  const { settings, loading: settingsLoading } = useSettingsStore();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    "JetBrainsMono-Light": require("../../assets/fonts/JetBrainsMono-Light.ttf"),
    "JetBrainsMono-Regular": require("../../assets/fonts/JetBrainsMono-Regular.ttf"),
    "JetBrainsMono-Medium": require("../../assets/fonts/JetBrainsMono-Medium.ttf"),
    "JetBrainsMono-SemiBold": require("../../assets/fonts/JetBrainsMono-SemiBold.ttf"),
    "JetBrainsMono-Bold": require("../../assets/fonts/JetBrainsMono-Bold.ttf"),
    "JetBrainsMono-Italic": require("../../assets/fonts/JetBrainsMono-Italic.ttf"),
    "BitcountGridDouble-Thin": require("../../assets/fonts/BitcountGridDouble-Thin.ttf"),
    "BitcountGridDouble-ExtraLight": require("../../assets/fonts/BitcountGridDouble-ExtraLight.ttf"),
    "BitcountGridDouble-Light": require("../../assets/fonts/BitcountGridDouble-Light.ttf"),
    "BitcountGridDouble-Regular": require("../../assets/fonts/BitcountGridDouble-Regular.ttf"),
    "BitcountGridDouble-Medium": require("../../assets/fonts/BitcountGridDouble-Medium.ttf"),
    "BitcountGridDouble-SemiBold": require("../../assets/fonts/BitcountGridDouble-SemiBold.ttf"),
    "BitcountGridDouble-Bold": require("../../assets/fonts/BitcountGridDouble-Bold.ttf"),
    "RockSalt-Regular": require("../../assets/fonts/RockSalt-Regular.ttf"),
    "BigelowRules-Regular": require("../../assets/fonts/BigelowRules-Regular.ttf"),
    "RubikGlitchPop-Regular": require("../../assets/fonts/RubikGlitchPop-Regular.ttf"),
    "Ewert-Regular": require("../../assets/fonts/Ewert-Regular.ttf"),
    "RubikDoodleShadow-Regular": require("../../assets/fonts/RubikDoodleShadow-Regular.ttf"),
    "Cookiemonster-gv11": require("../../assets/fonts/Cookiemonster-gv11.ttf"),
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
    AmaticSC_400Regular,
    AmaticSC_700Bold,
    Pacifico_400Regular,
    PressStart2P_400Regular,
    PermanentMarker_400Regular,
  });

  const isAppReady = dbReady && fontsLoaded && !settingsLoading;
  usePhonePortraitLock();
  // Not during the Field Guide: its first steps would sit under the prompts.
  useStartupPermissions(isAppReady && segments[0] !== "guide");

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
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("hidden").catch(() => {});
    }
  }, []);

  useEffect(() => {
    getDatabase()
      .then(async () => {
        await useSettingsStore.getState().loadSettings();
        // Ink and the streak, before the profile first reads them.
        await useProgressionStore.getState().refresh();
        setDbReady(true);
        // Recently Deleted keeps memories for 30 days; clear out the expired
        // ones in the background so startup never waits on file cleanup.
        purgeExpiredTrash().catch((err) => console.error('Failed to purge expired memories', err));
      })
      .catch((err) => {
        console.error("Initialization failed:", err);
        setDbReady(true);
      });
  }, []);

  useEffect(() => {
    if (isAppReady) {
      const inOnboarding = segments[0] === "onboarding";
      const isAllowedDuringOnboarding = inOnboarding || segments[0] === "compose" || segments[0] === "memory" || segments[0] === "guide";
      
      if (!settings.hasOnboarded && !isAllowedDuringOnboarding) {
        setTimeout(() => {
          router.replace("/onboarding");
        }, 0);
      } else if (settings.hasOnboarded && inOnboarding) {
        setTimeout(() => {
          router.replace("/");
        }, 0);
      }
    }
  }, [isAppReady, settings.hasOnboarded, segments]);

  return (
    <PostHogProvider
      client={posthog}
      // Screens are tracked by route template in AnalyticsSync; touches never.
      autocapture={{ captureScreens: false, captureTouches: false }}
    >
      <ThemeProvider value={FoldTheme}>
        <AnalyticsSync />
        <BiometricGate>
          <AnimatedSplashScreen isAppReady={isAppReady}>
            <StatusBar hidden />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen
                name="guide"
                options={{
                  headerShown: false,
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="compose"
                options={{
                  headerShown: false,
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="archive"
                options={{
                  headerShown: false,
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="time-machine"
                options={{
                  headerShown: false,
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="memory/[id]"
                options={{
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="trash"
                options={{
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="stories/index"
                options={{
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="stories/[id]"
                options={{
                  animation: "slide_from_right",
                }}
              />
            </Stack>
            <ProgressionSync />
          </AnimatedSplashScreen>
        </BiometricGate>
      </ThemeProvider>
    </PostHogProvider>
  );
}

import { BiometricGate } from "@/components/biometric-gate";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <RootLayoutNav />
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}
