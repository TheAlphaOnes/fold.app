import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS 
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { useStoriesStore } from '@/hooks/use-stories';
import { useRouter } from 'expo-router';

// Match the Maya design system spring values used in ShareTray and StoryPicker
const SPRING_IN = { damping: 22, stiffness: 280, mass: 0.8 };
const TIMING_OUT = { duration: 180 };

interface CreateStoryTrayProps {
  onClose: () => void;
}

export function CreateStoryTray({ onClose }: CreateStoryTrayProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const { addStory } = useStoriesStore();
  const [mounted, setMounted] = useState(true);
  
  const translateY = useSharedValue(500);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, SPRING_IN);
    overlayOpacity.value = withTiming(1, { duration: 250 });
  }, [translateY, overlayOpacity]);

  const handleClose = () => {
    Keyboard.dismiss();
    translateY.value = withTiming(500, TIMING_OUT);
    overlayOpacity.value = withTiming(0, TIMING_OUT, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  };

  useEffect(() => {
    if (!mounted) {
      onClose();
    }
  }, [mounted, onClose]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      const newStory = await addStory({ title: title.trim() });
      handleClose();
      // Wait for animation to finish before navigating
      setTimeout(() => {
        router.push(`/stories/${newStory.id}`);
      }, 200);
    } catch (err) {
      console.error('Failed to create story:', err);
    }
  };

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
      {/* Backdrop — absolutely positioned tap target */}
      <Animated.View style={[StyleSheet.absoluteFill, useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
        backgroundColor: 'rgba(0,0,0,0.6)',
      }))]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Content — flex-based so KeyboardAvoidingView works */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
        pointerEvents="box-none"
        keyboardVerticalOffset={0}
      >
        <View style={{ flex: 1 }} pointerEvents="none" />

        <Animated.View style={[
          styles.modalContent, 
          useAnimatedStyle(() => ({
            transform: [{ translateY: translateY.value }]
          })), 
          { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 24) }
        ]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <View style={styles.header}>
            <ThemedText style={[styles.sectionLabel, { color: theme.textMuted }]}>NEW STORY</ThemedText>
            <View style={styles.headerActions}>
              <Pressable
                onPress={handleCreate}
                disabled={!title.trim()}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.closeBtn,
                  {
                    borderColor: title.trim() ? theme.text : theme.border,
                    backgroundColor: pressed && title.trim() ? theme.backgroundElement : 'transparent',
                    opacity: title.trim() ? 1 : 0.5,
                  },
                ]}
              >
                <Check size={16} color={title.trim() ? theme.text : theme.textMuted} />
              </Pressable>
              
              <Pressable
                onPress={handleClose}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.closeBtn,
                  {
                    borderColor: theme.border,
                    backgroundColor: pressed ? theme.backgroundElement : 'transparent',
                  },
                ]}
              >
                <X size={16} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.createContainer}>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              placeholder="STORY.TITLE..."
              autoCapitalize="characters"
              placeholderTextColor={theme.textMuted}
              value={title}
              onChangeText={setTitle}
              cursorColor={theme.text}
              selectionColor={theme.text}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    letterSpacing: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  input: {
    fontFamily: 'JetBrainsMono-Bold',
    textTransform: 'uppercase',
    fontSize: 14,
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});
