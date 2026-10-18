/**
 * StoryBoardControls — search plus a visible, labelled sort.
 *
 * Replaces two icon buttons that cycled through hidden states. Every option
 * is on screen, the active one is filled, and one tap reaches any of them.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { STORY_SORTS, type StorySort } from '@/utils/story-meta';

interface StoryBoardControlsProps {
  query: string;
  onQueryChange: (query: string) => void;
  sort: StorySort;
  onSortChange: (sort: StorySort) => void;
}

export function StoryBoardControls({ query, onQueryChange, sort, onSortChange }: StoryBoardControlsProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.search, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        <Search size={14} color={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="search chapters"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text }]}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          cursorColor={theme.accentWarm}
          selectionColor={theme.accentWarm}
          accessibilityLabel="Search chapters"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => {
              haptic.tap();
              onQueryChange('');
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <X size={14} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        accessibilityRole="radiogroup"
        accessibilityLabel="Sort chapters"
      >
        {STORY_SORTS.map((option) => {
          const selected = option.id === sort;
          return (
            <Pressable
              key={option.id}
              onPress={() => {
                if (selected) return;
                haptic.select();
                onSortChange(option.id);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.chip,
                selected
                  ? { backgroundColor: theme.text, borderColor: theme.text }
                  : { borderColor: theme.border },
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <ThemedText style={[styles.chipText, { color: selected ? theme.background : theme.textMuted }]}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // No fixed height on the input: JetBrains Mono's tall ascender pushes text
  // low in a fixed-height box on iOS. The row owns the height; the input
  // centres within it.
  input: {
    flex: 1,
    alignSelf: 'stretch',
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
  },
});
