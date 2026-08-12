/**
 * Compose Screen — full-page memory editor.
 *
 * Inspired by Google Journal's layout hierarchy:
 *   toolbar → date metadata → body text
 *
 * Adapted into Fold's Teenage Engineering aesthetic:
 *   monospace metadata, flat industrial UI, golden ratio spacing.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { useJournal } from '@/hooks/use-journal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GrainBackground } from '@/components/grain-background';
import { X } from 'lucide-react-native';

function formatComposeDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatComposeTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function ComposeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState('');
  const { addComposition } = useJournal();
  const [isSaving, setIsSaving] = useState(false);

  const now = useMemo(() => new Date(), []);
  const dateString = useMemo(() => formatComposeDate(now), [now]);
  const timeString = useMemo(() => formatComposeTime(now), [now]);

  const canSave = body.trim().length > 0 && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      await addComposition({ textContent: body.trim(), mediaElements: [] });
      router.back();
    } catch (error) {
      console.error('Failed to save composition:', error);
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <GrainBackground />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ─── Toolbar ─── */}
        <View style={[styles.toolbar, { paddingTop: insets.top + 8 }]}>
          {/* Close button — circular, industrial */}
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.closeButton,
              { borderColor: theme.border, opacity: pressed ? 0.5 : 1 },
            ]}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <X size={16} color={theme.text} />
          </Pressable>

          <View style={styles.toolbarSpacer} />

          {/* Save button — pill, only active when there's content */}
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: canSave ? '#000000' : '#E0E0E0',
                opacity: pressed && canSave ? 0.7 : 1,
              },
            ]}
            accessibilityLabel="Save memory"
            accessibilityRole="button"
          >
            <ThemedText
              style={[
                styles.saveText,
                { color: canSave ? '#FFFFFF' : '#A0A0A0' },
              ]}
            >
              {isSaving ? 'Saving' : 'Save'}
            </ThemedText>
          </Pressable>
        </View>

        {/* ─── Content ─── */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Date + time metadata — monospace, industrial readout */}
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaDate} themeColor="textMuted">
              {dateString}
            </ThemedText>
            <View style={styles.metaDot} />
            <ThemedText style={styles.metaTime} themeColor="textMuted">
              {timeString}
            </ThemedText>
          </View>

          {/* Divider — thin, quiet */}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Body text input — the main writing area */}
          <TextInput
            style={[styles.bodyInput, { color: theme.text }]}
            placeholder="What's on your mind?"
            placeholderTextColor="#C0C0C0"
            multiline
            autoFocus
            value={body}
            onChangeText={setBody}
            selectionColor={theme.accent}
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </ScrollView>

        {/* Bottom safe area pad */}
        <View style={{ height: insets.bottom }} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },

  // ─── Toolbar ───
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 21,
    paddingBottom: 13,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarSpacer: {
    flex: 1,
  },
  saveButton: {
    paddingHorizontal: 21,
    paddingVertical: 8,
    borderRadius: 34,
  },
  saveText: {
    fontFamily: 'JetBrainsMono-SemiBold',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // ─── Content ───
  scrollContent: {
    paddingHorizontal: 21,
    paddingTop: 8,
    flexGrow: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 13,
  },
  metaDate: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#C0C0C0',
  },
  metaTime: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.4,
    marginBottom: 21,
  },
  bodyInput: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 21,
    lineHeight: 34,
    minHeight: 200,
  },
});
