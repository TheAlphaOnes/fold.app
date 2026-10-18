import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Trash2, Moon, Sun, Smartphone, Calendar, CalendarDays, Infinity, Compass } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import { haptic } from '@/services/haptics';

import { useTheme, type ThemeMode } from '@/hooks/use-theme';
import { useJournalStore } from '@/hooks/use-journal';
import { useSettingsStore } from '@/hooks/use-settings';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { ToggleSwitch } from '@/components/toggle-switch';
import { AsciiArt } from '@/components/ascii-art';
import { SYS_CORE_ART } from '@/constants/ascii-art';
import { formatDobInput, isValidDob } from '@/utils/dob';

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { compositions, removeAllCompositions } = useJournalStore();
  const { settings, updateSetting, resetGuide } = useSettingsStore();
  
  const [easterEggActive, setEasterEggActive] = useState(false);

  // Shared helper — calls the action only after successful biometric auth.
  // Falls back gracefully when hardware is absent (e.g. simulators).
  const requireAuth = async (promptMessage: string, action: () => void) => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      // No biometrics available — run the action anyway (device has no lock).
      action();
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      disableDeviceFallback: false,
    });

    if (result.success) {
      action();
    }
  };


  const handleDeleteAll = () => {
    requireAuth('Authenticate to clear all memories', () => {
      Alert.alert(
        'CLEAR ALL MEMORIES',
        'Are you sure you want to permanently delete all journal entries? This action cannot be undone.',
        [
          { text: 'CANCEL', style: 'cancel' },
          { 
            text: 'DELETE ALL', 
            style: 'destructive',
            onPress: async () => {
              try {
                await removeAllCompositions();
              } catch {
                Alert.alert("COULDN'T CLEAR", 'Your memories are still saved. Please try again.');
                return;
              }
              router.navigate('/');
            }
          }
        ]
      );
    });
  };

  const cycleTheme = async () => {
    haptic.select();
    const modes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(settings.theme);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    await updateSetting('theme', nextMode);
  };

  const cycleTimelineMode = async () => {
    haptic.select();
    const modes = ['yearly', 'monthly', 'infinite'] as const;
    const currentIndex = modes.indexOf(settings.timelineMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    await updateSetting('timelineMode', nextMode);
  };


  const handleDOBChange = (t: string) => {
    // Canonical dot format, shared with the onboarding DOB screen
    updateSetting('dob', formatDobInput(t));
  };

  const handleToggleSecurity = async (key: 'requireBiometrics' | 'privacyScreen', newValue: boolean) => {
    // If they are turning security OFF, or if they are turning Privacy ON (which we protect),
    // require biometric auth first.
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (!hasHardware || !isEnrolled) {
      Alert.alert("Biometrics Unavailable", "Your device does not support or have biometrics set up.");
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to change security settings',
      disableDeviceFallback: false,
    });

    if (result.success) {
      updateSetting(key, newValue);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <ThemedText style={[styles.title, { color: theme.text }]}>SETTINGS</ThemedText>
        <Pressable 
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.closeBtn, 
            { borderColor: theme.border, opacity: pressed ? 0.5 : 1 }
          ]}
        >
          <X size={16} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Data Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>PROFILE</ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.text }]} />
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>NAME</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              value={settings.name}
              onChangeText={(t) => updateSetting('name', t)}
              placeholder="YOUR NAME..."
              placeholderTextColor={theme.textMuted}
              autoCapitalize="characters"
              maxLength={12}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>DOB (DD.MM.YYYY)</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              value={settings.dob}
              onChangeText={handleDOBChange}
              placeholder="--.--.----"
              placeholderTextColor={theme.textMuted}
              keyboardType="number-pad"
              maxLength={10}
            />
            {settings.dob.length > 0 && !isValidDob(settings.dob) && (
              <ThemedText style={[styles.inputError, { color: '#FF3B30' }]}>
                INVALID DATE - FORMAT DD.MM.YYYY
              </ThemedText>
            )}
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>PREFERENCES</ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.text }]} />
          
          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <ThemedText style={[styles.settingText, { color: theme.text }]}>THEME MODE</ThemedText>
            </View>
            <Pressable 
              onPress={cycleTheme}
              style={[styles.themeBtn, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            >
              {settings.theme === 'light' && <Sun size={14} color={theme.text} />}
              {settings.theme === 'dark' && <Moon size={14} color={theme.text} />}
              {settings.theme === 'system' && <Smartphone size={14} color={theme.text} />}
              <ThemedText style={[styles.themeBtnText, { color: theme.text }]}>
                {settings.theme.toUpperCase()}
              </ThemedText>
            </Pressable>
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: theme.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <ThemedText style={[styles.settingText, { color: theme.text }]}>TIMELINE VIEW</ThemedText>
            </View>
            <Pressable 
              onPress={cycleTimelineMode}
              style={[styles.themeBtn, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            >
              {settings.timelineMode === 'yearly' && <Calendar size={14} color={theme.text} />}
              {settings.timelineMode === 'monthly' && <CalendarDays size={14} color={theme.text} />}
              {settings.timelineMode === 'infinite' && <Infinity size={14} color={theme.text} />}
              <ThemedText style={[styles.themeBtnText, { color: theme.text }]}>
                {settings.timelineMode.toUpperCase()}
              </ThemedText>
            </Pressable>
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: theme.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <ThemedText style={[styles.settingText, { color: theme.text }]}>AUTO-PLAY AUDIO</ThemedText>
            </View>
            <ToggleSwitch
              value={settings.autoPlayMusic}
              onValueChange={(val) => updateSetting('autoPlayMusic', val)}
              accessibilityLabel="Auto-play audio"
            />
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: theme.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <ThemedText style={[styles.settingText, { color: theme.text }]}>HAPTICS</ThemedText>
            </View>
            <ToggleSwitch
              value={settings.hapticsEnabled}
              accessibilityLabel="Haptics"
              onValueChange={async (val) => {
                await updateSetting('hapticsEnabled', val);
                // Turning haptics on: confirm with the first tick it now allows.
                if (val) haptic.toggle(true);
              }}
            />
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: theme.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <ThemedText style={[styles.settingText, { color: theme.text }]}>AUTO LOCATION TAGGING</ThemedText>
            </View>
            <ToggleSwitch
              value={settings.autoLocationTagging}
              accessibilityLabel="Auto location tagging"
              onValueChange={async (val) => {
                if (val) {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Location permission is required for auto tagging.');
                    return;
                  }
                }
                updateSetting('autoLocationTagging', val);
              }}
            />
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>SECURITY</ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.text }]} />
          
          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <ThemedText style={[styles.settingText, { color: theme.text }]}>REQUIRE BIOMETRICS</ThemedText>
            </View>
            <ToggleSwitch
              value={settings.requireBiometrics}
              onValueChange={(val) => handleToggleSecurity('requireBiometrics', val)}
              accessibilityLabel="Require biometrics"
            />
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: theme.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <ThemedText style={[styles.settingText, { color: theme.text }]}>PRIVACY SCREEN</ThemedText>
            </View>
            <ToggleSwitch
              value={settings.privacyScreen}
              onValueChange={(val) => handleToggleSecurity('privacyScreen', val)}
              accessibilityLabel="Privacy screen"
            />
          </View>
        </View>

        {/* System Actions Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>STORAGE & DATA</ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.text }]} />
          

          <Pressable 
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.6 : 1 }]}
            onPress={async () => {
              haptic.press();
              await updateSetting('hasOnboarded', false);
              await resetGuide();
              router.replace('/onboarding');
            }}
          >
            <View style={styles.settingRowLeft}>
              <Smartphone size={16} color={theme.text} />
              <ThemedText style={[styles.settingText, { color: theme.text }]}>RESTART ONBOARDING</ThemedText>
            </View>
          </Pressable>

          <View style={[styles.hairlineDivider, { backgroundColor: theme.border }]} />

          <Pressable 
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.6 : 1 }]}
            onPress={async () => {
              haptic.press();
              await resetGuide();
              router.push({ pathname: '/guide', params: { step: 'write' } });
            }}
          >
            <View style={styles.settingRowLeft}>
              <Compass size={16} color={theme.text} />
              <ThemedText style={[styles.settingText, { color: theme.text }]}>RESTART FIELD GUIDE</ThemedText>
            </View>
          </Pressable>

          <View style={[styles.hairlineDivider, { backgroundColor: theme.border }]} />

          <Pressable 
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.6 : 1 }]}
            onPress={handleDeleteAll}
          >
            <View style={styles.settingRowLeft}>
              <Trash2 size={16} color="#FF3B30" />
              <ThemedText style={[styles.settingText, { color: '#FF3B30' }]}>CLEAR ALL MEMORIES</ThemedText>
            </View>
          </Pressable>
        </View>

        {/* About & Support Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>ABOUT & SUPPORT</ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.text }]} />

          <Pressable 
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.push('/feedback' as any)}
          >
            <ThemedText style={[styles.settingText, { color: theme.text }]}>SUBMIT FEEDBACK</ThemedText>
          </Pressable>
          <View style={[styles.hairlineDivider, { backgroundColor: theme.border }]} />

          <Pressable 
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.push('/faq' as any)}
          >
            <ThemedText style={[styles.settingText, { color: theme.text }]}>FAQ & GESTURES</ThemedText>
          </Pressable>
          <View style={[styles.hairlineDivider, { backgroundColor: theme.border }]} />

          <Pressable 
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.push('/privacy' as any)}
          >
            <ThemedText style={[styles.settingText, { color: theme.text }]}>PRIVACY POLICY</ThemedText>
          </Pressable>
          <View style={[styles.hairlineDivider, { backgroundColor: theme.border }]} />

          <Pressable 
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.push('/legal' as any)}
          >
            <ThemedText style={[styles.settingText, { color: theme.text }]}>LEGAL TERMS</ThemedText>
          </Pressable>
        </View>


        {/* ASCII Mascot */}
        <View style={styles.mascotContainer}>
          <AsciiArt art={SYS_CORE_ART} color={theme.textMuted} fontSize={10} />
          <ThemedText style={styles.mascotSubtitle}>FOLD JOURNAL</ThemedText>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 21,
    paddingBottom: 21,
  },
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 21,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    letterSpacing: 2,
    color: '#878787',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  divider: {
    height: 2,
    marginBottom: 16,
  },
  hairlineDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    letterSpacing: 1,
    color: '#878787',
    marginBottom: 6,
  },
  inputError: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 6,
  },
  input: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 16,
    letterSpacing: -0.3,
  },
  settingSubtext: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    letterSpacing: -0.2,
    marginTop: 4,
  },
  themeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    paddingVertical: 8,
    width: 110,
  },
  themeBtnText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    letterSpacing: 1,
  },
  mascotContainer: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
    opacity: 0.5,
  },
  mascotSubtitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    color: '#FF4B00',
    marginTop: 8,
    letterSpacing: 2,
  }
});
