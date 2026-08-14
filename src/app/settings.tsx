import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView, TextInput, Switch } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Share, Trash2, Moon, Sun, Smartphone } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';

import { useTheme, type ThemeMode } from '@/hooks/use-theme';
import { useJournalStore } from '@/hooks/use-journal';
import { useSettings } from '@/hooks/use-settings';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { compositions, removeAllCompositions } = useJournalStore();
  const { settings, updateSetting } = useSettings();
  
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

  const handleExport = async () => {
    await requireAuth('Authenticate to export your memories', async () => {
      try {
        const dataStr = JSON.stringify(compositions, null, 2);
        const fileUri = `${FileSystem.documentDirectory}fold_export.json`;
        await FileSystem.writeAsStringAsync(fileUri, dataStr);
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Export Error', 'Sharing is not available on this device');
        }
      } catch (e) {
        Alert.alert('Export Error', 'Failed to export data');
      }
    });
  };

  const handleDeleteAll = () => {
    requireAuth('Authenticate to wipe all device memory', () => {
      Alert.alert(
        'ERASE SYSTEM MEMORY',
        'Are you sure you want to permanently delete all compositions? This action cannot be undone.',
        [
          { text: 'CANCEL', style: 'cancel' },
          { 
            text: 'ERASE', 
            style: 'destructive',
            onPress: async () => {
              await removeAllCompositions();
              router.navigate('/');
            }
          }
        ]
      );
    });
  };

  const cycleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(settings.theme);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    updateSetting('theme', nextMode);
  };


  const handleDOBChange = (t: string) => {
    // Only allow numbers
    const cleaned = t.replace(/[^\d]/g, '');
    let formatted = cleaned;
    
    // Auto insert slashes
    if (cleaned.length > 2) {
      formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
    }
    if (cleaned.length > 4) {
      formatted = formatted.substring(0, 5) + '/' + cleaned.substring(4, 8);
    }
    
    updateSetting('dob', formatted);
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
        <ThemedText style={[styles.title, { color: theme.text }]}>SYS SETTINGS</ThemedText>
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
          <ThemedText style={styles.sectionTitle}>USER IDENTITY</ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.text }]} />
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>NAME</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              value={settings.name}
              onChangeText={(t) => updateSetting('name', t)}
              placeholder="ENTER NAME..."
              placeholderTextColor={theme.textMuted}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>DOB (DD/MM/YYYY)</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              value={settings.dob}
              onChangeText={handleDOBChange}
              placeholder="--/--/----"
              placeholderTextColor={theme.textMuted}
              keyboardType="number-pad"
              maxLength={10}
            />
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
            <View style={[styles.settingRowLeft, { flexDirection: 'column', alignItems: 'flex-start', gap: 4, flex: 1, paddingRight: 16 }]}>
              <ThemedText style={[styles.settingText, { color: theme.text }]}>AUTO-PLAY MUSIC</ThemedText>
              <ThemedText style={[styles.settingSubtext, { color: theme.textMuted }]}>
                Play audio cards automatically when they appear on screen.
              </ThemedText>
            </View>
            <Switch
              value={settings.autoPlayMusic}
              onValueChange={(val) => updateSetting('autoPlayMusic', val)}
              trackColor={{ false: theme.border, true: theme.text }}
              thumbColor={settings.autoPlayMusic ? theme.background : theme.text}
              ios_backgroundColor={theme.border}
            />
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: theme.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <ThemedText style={[styles.settingText, { color: theme.text }]}>ANALYTICS OPT-IN</ThemedText>
            </View>
            <Switch
              value={settings.dataCollection}
              onValueChange={(val) => updateSetting('dataCollection', val)}
              trackColor={{ false: theme.border, true: '#FF4B00' }}
              thumbColor={theme.background}
            />
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: theme.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <ThemedText style={[styles.settingText, { color: theme.text }]}>AUTO LOCATION TAGGING</ThemedText>
            </View>
            <Switch
              value={settings.autoLocationTagging}
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
              trackColor={{ false: theme.border, true: '#FF4B00' }}
              thumbColor={theme.background}
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
            <Switch
              value={settings.requireBiometrics}
              onValueChange={(val) => handleToggleSecurity('requireBiometrics', val)}
              trackColor={{ false: theme.border, true: theme.accentWarm }}
              thumbColor={theme.background}
            />
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: theme.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <ThemedText style={[styles.settingText, { color: theme.text }]}>PRIVACY SCREEN (APP SWITCHER)</ThemedText>
            </View>
            <Switch
              value={settings.privacyScreen}
              onValueChange={(val) => handleToggleSecurity('privacyScreen', val)}
              trackColor={{ false: theme.border, true: theme.accentWarm }}
              thumbColor={theme.background}
            />
          </View>
        </View>

        {/* System Actions Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>SYSTEM OPERATIONS</ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.text }]} />
          
          <Pressable 
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.6 : 1 }]}
            onPress={handleExport}
          >
            <View style={styles.settingRowLeft}>
              <Share size={16} color={theme.text} />
              <ThemedText style={[styles.settingText, { color: theme.text }]}>EXPORT JSON DATA</ThemedText>
            </View>
          </Pressable>

          <View style={[styles.hairlineDivider, { backgroundColor: theme.border }]} />

          <Pressable 
            style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.6 : 1 }]}
            onPress={async () => {
              await updateSetting('hasOnboarded', false);
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
            onPress={handleDeleteAll}
          >
            <View style={styles.settingRowLeft}>
              <Trash2 size={16} color="#FF3B30" />
              <ThemedText style={[styles.settingText, { color: '#FF3B30' }]}>WIPE DEVICE MEMORY</ThemedText>
            </View>
          </Pressable>
        </View>

        {/* ASCII System Core Mascot */}
        <View style={styles.mascotContainer}>
          <ThemedText style={[styles.mascotText, { color: theme.textMuted }]}>
{`.================.
| .--.      .-.  |
| |__|      |_|  |
|                |
|  .----------.  |
|  |          |  |
'=='=========='=='`}
          </ThemedText>
          <ThemedText style={styles.mascotSubtitle}>SYS.CORE</ThemedText>
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
    fontSize: 18,
    letterSpacing: 2,
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
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    letterSpacing: 2,
    color: '#878787',
    marginBottom: 8,
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
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  mascotText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'left',
  },
  mascotSubtitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    color: '#FF4B00',
    marginTop: 8,
    letterSpacing: 2,
  }
});
