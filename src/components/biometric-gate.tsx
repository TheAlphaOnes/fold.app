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
import { AsciiArt } from '@/components/ascii-art';
import { haptic } from '@/services/haptics';
import { SYS_CORE_ART, CAT_ART } from '@/constants/ascii-art';

interface BiometricGateProps {
  children: React.ReactNode;
}

/** Short, human reason for a failed unlock. */
function failureCopy(error: LocalAuthentication.LocalAuthenticationError | undefined): string {
  switch (error) {
    case 'user_cancel':
    case 'system_cancel':
    case 'app_cancel':
      return 'unlock cancelled.';
    case 'lockout':
      return 'too many attempts. use your passcode to unlock.';
    case 'authentication_failed':
      return "that didn't match. try again.";
    case 'passcode_not_set':
      return 'set a device passcode to use the lock.';
    default:
      return "couldn't unlock. try again.";
  }
}

export const BiometricContext = React.createContext({ isLocked: false });

export function BiometricGate({ children }: BiometricGateProps) {
  const { settings, loading } = useSettings();
  const { colors } = useThemeContext();
  const appState = useRef(AppState.currentState);

  const [isLocked, setIsLocked] = useState(() => settings.requireBiometrics);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'authenticating' | 'success'>('idle');
  const initialMount = useRef(true);

  // Debounce re-lock after system dialogs (permission prompts, Face ID, etc.)
  const lastUnlockTime = useRef(0);
  const RELOCK_DEBOUNCE_MS = 1500;

  // Reanimated values
  const overlayOpacity = useSharedValue(1);
  const coreScale = useSharedValue(1);
  const coreOpacity = useSharedValue(1);

  const handleSuccess = () => {
    setAuthStatus('success');
    lastUnlockTime.current = Date.now();
    
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

  // Why the last attempt did not unlock, shown above the retry button.
  const [failure, setFailure] = useState<string | null>(null);
  // In-flight guard as a ref: state read inside listeners can be stale, which
  // either blocked retries or let two prompts start at once.
  const inFlight = useRef(false);

  const authenticate = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setFailure(null);
    setAuthStatus('authenticating');
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        handleSuccess();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock your journal',
        disableDeviceFallback: false,
      });

      if (result.success) {
        handleSuccess();
      } else {
        setAuthStatus('idle');
        setFailure(failureCopy(result.error));
        haptic.warning();
      }
    } catch (error) {
      console.error('Biometric unlock failed to start', error);
      setAuthStatus('idle');
      setFailure("couldn't start unlock. try again.");
    } finally {
      inFlight.current = false;
    }
  };

  // Listeners always call the latest authenticate, never a stale closure.
  const authenticateRef = useRef(authenticate);
  useEffect(() => {
    authenticateRef.current = authenticate;
  });

  useEffect(() => {
    if (!loading && initialMount.current) {
      initialMount.current = false;
      if (settings.requireBiometrics) {
        setIsLocked(true);
        authenticateRef.current();
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
      const prev = appState.current;

      // Only re-lock when returning from genuine background, NOT from
      // 'inactive' which is just a system dialog overlay (permission
      // prompts, Face ID, share sheets). This prevents the biometric
      // gate from firing when the user is mid-interaction.
      if (prev === 'background' && nextAppState === 'active') {
        setShowPrivacy(false);
        // A prompt that was open when the app left is gone; never let it
        // leave the gate stuck in "authenticating" with no way to retry.
        inFlight.current = false;
        const elapsed = Date.now() - lastUnlockTime.current;
        if (settings.requireBiometrics && !initialMount.current && elapsed > RELOCK_DEBOUNCE_MS) {
          setIsLocked(true);
          resetAnimation();
          authenticateRef.current();
        } else {
          setAuthStatus((status) => (status === 'authenticating' ? 'idle' : status));
        }
      } 
      // Show privacy screen when going to background (not inactive)
      else if (prev === 'active' && nextAppState === 'background') {
        // Close any open prompt so it cannot resolve into a stale state.
        LocalAuthentication.cancelAuthenticate().catch(() => {});
        if (settings.privacyScreen) {
          setShowPrivacy(true);
        }
        if (settings.requireBiometrics) {
          setIsLocked(true);
          resetAnimation();
        }
      }
      // Handle inactive for privacy screen only (app switcher preview)
      else if (prev === 'active' && nextAppState === 'inactive') {
        if (settings.privacyScreen) {
          setShowPrivacy(true);
        }
      }
      else if (prev === 'inactive' && nextAppState === 'active') {
        setShowPrivacy(false);
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

  return (
    <View style={styles.container}>
      <BiometricContext.Provider value={{ isLocked }}>
        {children}
      </BiometricContext.Provider>

      {showPrivacy && (
        <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.background }]}>
          <GrainBackground />
          <View style={styles.center}>
            <AsciiArt art={SYS_CORE_ART} color={colors.textMuted} fontSize={14} />
            <ThemedText style={[styles.subtitle, { color: colors.textMuted }]}>JOURNAL LOCKED</ThemedText>
          </View>
        </View>
      )}

      {isLocked && !showPrivacy && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.background }, animatedOverlayStyle]}>
          <GrainBackground />
          <Animated.View style={[styles.center, animatedCoreStyle]}>
            <AsciiArt art={CAT_ART} color={colors.text} fontSize={14} />
            
            {authStatus === 'success' ? (
              <ThemedText style={[styles.subtitle, { color: colors.text }]}>
                UNLOCKED
              </ThemedText>
            ) : (
              <>
                <ThemedText style={[styles.subtitle, { color: colors.textMuted }]}>
                  {authStatus === 'authenticating' ? 'UNLOCKING…' : 'AUTHENTICATE TO OPEN'}
                </ThemedText>
                {failure && authStatus === 'idle' && (
                  <ThemedText style={[styles.failure, { color: colors.accentWarm }]}>{failure}</ThemedText>
                )}
                {authStatus === 'idle' && (
                  <Pressable
                    onPress={() => {
                      haptic.tap();
                      authenticate();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Try unlocking again"
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.retryBtn,
                      { borderColor: colors.text, opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
                    ]}
                  >
                    <ThemedText style={[styles.retryText, { color: colors.text }]}>TRY AGAIN</ThemedText>
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
  subtitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 24,
  },
  failure: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 28,
    minHeight: 44,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 22,
  },
  retryText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    letterSpacing: 2,
  },
});
