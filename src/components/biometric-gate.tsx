import React, { useEffect, useState, useRef } from 'react';
import { AppState, View, StyleSheet, Pressable } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  withSequence, 
  withDelay,
  runOnJS 
} from 'react-native-reanimated';

import { useSettings } from '@/hooks/use-settings';
import { useThemeContext } from '@/hooks/use-theme';
import { GrainBackground } from './grain-background';
import { ThemedText } from './themed-text';

interface BiometricGateProps {
  children: React.ReactNode;
}

export function BiometricGate({ children }: BiometricGateProps) {
  const { settings, loading } = useSettings();
  const { colors } = useThemeContext();
  const appState = useRef(AppState.currentState);

  const [isLocked, setIsLocked] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'authenticating' | 'success'>('idle');
  const initialMount = useRef(true);

  // Reanimated values
  const overlayOpacity = useSharedValue(1);
  const coreScale = useSharedValue(1);
  const coreOpacity = useSharedValue(1);

  const authenticate = async () => {
    if (authStatus === 'authenticating' || authStatus === 'success') return;
    setAuthStatus('authenticating');
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        handleSuccess();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'SYS.AUTH REQUIRED',
        disableDeviceFallback: false,
      });

      if (result.success) {
        handleSuccess();
      } else {
        setAuthStatus('idle');
      }
    } catch {
      setAuthStatus('idle');
    }
  };

  const handleSuccess = () => {
    setAuthStatus('success');
    
    // Smooth fade out without bouncing
    coreOpacity.value = withTiming(0, { duration: 300 });
    overlayOpacity.value = withDelay(200, withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(setIsLocked)(false);
        runOnJS(resetAnimation)();
      }
    }));
  };

  const resetAnimation = () => {
    setAuthStatus('idle');
    overlayOpacity.value = 1;
    coreOpacity.value = 1;
  };

  useEffect(() => {
    if (!loading && initialMount.current) {
      initialMount.current = false;
      if (settings.requireBiometrics) {
        setIsLocked(true);
        authenticate();
      }
    }
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    
    if (settings.privacyScreen) {
      ScreenCapture.preventScreenCaptureAsync().catch(console.warn);
    } else {
      ScreenCapture.allowScreenCaptureAsync().catch(console.warn);
    }

    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(console.warn);
    };
  }, [settings.privacyScreen, loading]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        setShowPrivacy(false);
        if (settings.requireBiometrics && !initialMount.current) {
          setIsLocked(true);
          resetAnimation();
          authenticate();
        }
      } 
      else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (settings.privacyScreen) {
          setShowPrivacy(true);
        }
        if (settings.requireBiometrics) {
          setIsLocked(true);
          resetAnimation();
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [settings.requireBiometrics, settings.privacyScreen, loading]);

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const animatedCoreStyle = useAnimatedStyle(() => ({
    opacity: coreOpacity.value,
  }));

  const CAT_ASCII = 
`    /\\_/\\
   (=o.o=)
 .-(     )-.
(           )
 '---------'`;

  return (
    <View style={styles.container}>
      {children}

      {showPrivacy && (
        <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.background }]}>
          <GrainBackground />
          <View style={styles.center}>
            <ThemedText style={[styles.ascii, { color: colors.textMuted }]}>
{`.================.
| .--.      .-.  |
| |__|      |_|  |
|                |
|  .----------.  |
|  |          |  |
'=='=========='=='`}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textMuted }]}>SYSTEM SECURED</ThemedText>
          </View>
        </View>
      )}

      {isLocked && !showPrivacy && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.background }, animatedOverlayStyle]}>
          <GrainBackground />
          <Animated.View style={[styles.center, animatedCoreStyle]}>
            <ThemedText style={[styles.ascii, { color: colors.text }]}>
              {CAT_ASCII}
            </ThemedText>
            
            {authStatus === 'success' ? (
              <ThemedText style={[styles.subtitle, { color: colors.text }]}>
                ACCESS GRANTED
              </ThemedText>
            ) : (
              <>
                <ThemedText style={[styles.subtitle, { color: colors.textMuted }]}>
                  AWAITING BIOMETRICS
                </ThemedText>
                {authStatus === 'idle' && (
                  <Pressable onPress={authenticate} style={[styles.retryBtn, { borderColor: colors.border }]}>
                    <ThemedText style={[styles.retryText, { color: colors.text }]}>RETRY</ThemedText>
                  </Pressable>
                )}
              </>
            )}
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    zIndex: 9999,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ascii: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'left',
  },
  subtitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 24,
  },
  retryBtn: {
    marginTop: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 4,
  },
  retryText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    letterSpacing: 2,
  },
});
