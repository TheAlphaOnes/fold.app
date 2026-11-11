/**
 * Compose — the one place memories are made and edited.
 *
 * A single creative screen, built on habits people already have from
 * Instagram Stories / WhatsApp Status: the 9:16 canvas fills the middle,
 * tools sit top right (text, stickers), templates and media sit under it,
 * Save bottom right. It opens ready to write; adding photos turns it into a
 * Story or a grid as you go; nothing feels like a mode change.
 *
 * This file only resolves what's being composed (new, edit, shared,
 * camera); ComposerBody runs the screen.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ComposerBody } from '@/components/compose/composer-body';
import { isTemplateId } from '@/templates/registry';
import { GrainBackground } from '@/components/grain-background';
import { useJournalStore } from '@/hooks/use-journal';
import { useTheme } from '@/hooks/use-theme';

export default function ComposeScreen() {
  const theme = useTheme();
  const { sharedText, storyId, editId, dateTimestamp, template } = useLocalSearchParams<{
    sharedText?: string;
    /** Start a new memory in this template (e.g. picked on today's page). */
    template?: string;
    storyId?: string;
    editId?: string;
    dateTimestamp?: string;
  }>();

  const numericEditId = editId ? Number(editId) : null;
  const existing = useJournalStore((state) =>
    numericEditId
      ? state.hydratedById[numericEditId] ??
        state.allCompositions.find((c) => c.id === numericEditId) ??
        state.compositions.find((c) => c.id === numericEditId) ??
        null
      : null,
  );

  // Editing waits for the memory to load, then the composer starts from it once.
  if (numericEditId && !existing) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <GrainBackground />
      </View>
    );
  }

  const parsedDate = dateTimestamp ? parseInt(dateTimestamp, 10) : NaN;
  return (
    <ComposerBody
      key={numericEditId ?? 'new'}
      existing={existing}
      sharedText={sharedText}
      storyId={storyId ? Number(storyId) : undefined}
      template={isTemplateId(template) ? template : undefined}
      createdAt={existing?.createdAt ?? (Number.isNaN(parsedDate) ? undefined : parsedDate)}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
