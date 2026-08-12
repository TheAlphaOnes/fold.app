import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ArrowRight } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { TECalendar } from '@/components/te-calendar';

export default function ArchivePickerScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(new Date());

  const handleConfirm = () => {
    // Pass timestamp to archive screen
    router.push(`/archive?ts=${date.getTime()}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, borderColor: theme.border }]}>
        <ThemedText style={[styles.title, { color: theme.text }]}>Time Machine</ThemedText>
        <Pressable 
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconBtn, 
            { borderColor: theme.border, opacity: pressed ? 0.5 : 1 }
          ]}
        >
          <X size={16} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <ThemedText style={[styles.subtitle, { color: theme.textMuted }]}>
          Select a destination date.
        </ThemedText>

        <View style={styles.pickerContainer}>
          <TECalendar value={date} onChange={setDate} />
        </View>

        <Pressable 
          style={({ pressed }) => [
            styles.confirmBtn,
            { backgroundColor: theme.text, opacity: pressed ? 0.8 : 1 }
          ]}
          onPress={handleConfirm}
        >
          <ThemedText style={[styles.confirmText, { color: theme.background }]}>ENGAGE</ThemedText>
          <ArrowRight size={16} color={theme.background} />
        </Pressable>
      </View>
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
  },
  pickerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    maxWidth: 340,
  },
  confirmText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
    letterSpacing: 2,
  }
});
