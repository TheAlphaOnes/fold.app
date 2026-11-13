/**
 * Recently Deleted — deleted memories wait here for 30 days before they are
 * removed for good.
 *
 * Layout: a count summary, then a two-column grid of the deleted memories in
 * the Story Board card style (cover, countdown badge, caption below), and a
 * fixed action bar with RESTORE ALL and EMPTY BIN. Tapping a card offers
 * Restore or Delete forever. Anything permanent asks first.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { AsciiArt } from '@/components/ascii-art';
import { BalancedText } from '@/components/balanced-text';
import { GrainBackground } from '@/components/grain-background';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { TrashActionBar } from '@/components/trash/trash-action-bar';
import { TrashTile } from '@/components/trash/trash-tile';
import { BIN_ART } from '@/constants/ascii-art';
import { fadeIn, riseIn } from '@/constants/motion';
import { BALANCED_TEXT, Type } from '@/constants/theme';
import { getTrashedCompositions } from '@/db/journal-repository';
import { useJournalStore } from '@/hooks/use-journal';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { TRASH_DAYS, daysLeftInTrash, emptyTrash, purgeMemories } from '@/services/trash.service';
import { trashSections } from '@/utils/trash-groups';
import type { Composition } from '@/types/journal';

const GUTTER = 16;
const GAP = 8;
const COLUMNS = 3;

function titleOf(memory: Composition): string {
  const firstLine = memory.textContent.trim().split('\n')[0];
  if (firstLine) return firstLine;
  const music = memory.mediaElements.find((m) => m.type === 'audio' && m.metadata);
  if (music?.metadata) return music.metadata.title;
  if (memory.mediaElements.some((m) => m.type === 'video')) return 'Video';
  if (memory.mediaElements.some((m) => m.type === 'image')) return 'Photo';
  return 'Voice note';
}

type Row = { key: string; kind: 'header'; title: string; count: number } | { key: string; kind: 'row'; items: Composition[]; order: number };

export default function TrashScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const tile = Math.floor((screenWidth - GUTTER * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const restoreComposition = useJournalStore((state) => state.restoreComposition);
  const restoreAll = useJournalStore((state) => state.restoreAllCompositions);
  const [items, setItems] = useState<Composition[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  const reload = useCallback(async () => {
    try {
      const trashed = await getTrashedCompositions();
      setNow(Date.now());
      setItems(trashed);
    } catch (error) {
      console.error('Failed to load Recently Deleted', error);
      setItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const without = (ids: Set<number>) => setItems((current) => current?.filter((m) => !ids.has(m.id)) ?? null);

  const toggle = useCallback((id: number) => {
    haptic.select();
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const picked = () => (items ?? []).filter((m) => selected.has(m.id));

  const restoreSelected = async () => {
    const memories = picked();
    haptic.press();
    without(selected);
    setSelected(new Set());
    try {
      for (const memory of memories) await restoreComposition(memory.id);
      haptic.success();
    } catch (error) {
      console.error('Failed to restore memories', error);
      haptic.error();
      Alert.alert("COULDN'T RESTORE", 'Please try again.');
      reload();
    }
  };

  const deleteSelected = () => {
    const memories = picked();
    haptic.warning();
    Alert.alert(
      'DELETE FOREVER?',
      `${memories.length === 1 ? 'This memory' : `These ${memories.length} memories`} and their photos and audio will be gone. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            without(new Set(memories.map((m) => m.id)));
            setSelected(new Set());
            try {
              await purgeMemories(memories);
            } catch (error) {
              console.error('Failed to delete memories permanently', error);
              Alert.alert("COULDN'T DELETE", 'Please try again.');
              reload();
            }
          },
        },
      ],
    );
  };

  const confirmRestoreAll = async () => {
    haptic.press();
    setItems([]);
    try {
      await restoreAll();
      haptic.success();
    } catch (error) {
      console.error('Failed to restore all memories', error);
      Alert.alert("COULDN'T RESTORE", 'Please try again.');
      reload();
    }
  };

  const confirmEmpty = () => {
    haptic.warning();
    const count = items?.length ?? 0;
    Alert.alert(
      'EMPTY RECENTLY DELETED?',
      `${count === 1 ? 'This memory' : `All ${count} memories`} and their photos and audio will be gone for good. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty',
          style: 'destructive',
          onPress: async () => {
            setItems([]);
            try {
              await emptyTrash();
            } catch (error) {
              console.error('Failed to empty Recently Deleted', error);
              Alert.alert("COULDN'T EMPTY", 'Please try again.');
              reload();
            }
          },
        },
      ],
    );
  };

  const count = items?.length ?? 0;
  const rows = useMemo<Row[]>(() => {
    const sections = trashSections(items ?? [], now, COLUMNS);
    // Entrance order runs across sections, so the stagger continues down the page.
    const starts = sections.map((_, i) => sections.slice(0, i).reduce((n, sec) => n + sec.rows.flat().length, 0));
    return sections.flatMap((section, si) => [
      { key: `h-${section.title}`, kind: 'header' as const, title: section.title, count: section.rows.flat().length },
      ...section.rows.map((r, ri) => ({ key: `r-${r[0].id}`, kind: 'row' as const, items: r, order: starts[si] + ri * COLUMNS })),
    ]);
  }, [items, now]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground />
      <ScreenHeader title="Recently Deleted" />

      {items === null ? null : count > 0 ? (
        <>
          <Animated.FlatList
            data={rows}
            keyExtractor={(row) => row.key}
            renderItem={({ item: row }) =>
              row.kind === 'header' ? (
                <View style={styles.sectionHead}>
                  <ThemedText style={[Type.rail, { color: theme.text }]} numberOfLines={1}>{row.title}</ThemedText>
                  <ThemedText style={[Type.rail, { color: theme.textMuted }]} numberOfLines={1}>{String(row.count).padStart(2, '0')}</ThemedText>
                </View>
              ) : (
                <View style={styles.row}>
                  {row.items.map((memory, i) => (
                    <TrashTile
                      key={memory.id}
                      memory={memory}
                      size={tile}
                      daysLeft={daysLeftInTrash(memory.deletedAt ?? now, now)}
                      selected={selected.has(memory.id)}
                      order={row.order + i}
                      label={titleOf(memory)}
                      onToggle={toggle}
                    />
                  ))}
                </View>
              )
            }
            ListHeaderComponent={
              <Animated.View entering={fadeIn(260)} style={styles.intro}>
                <BalancedText style={[styles.introText, { color: theme.textMuted }]}>
                  {`each one waits ${TRASH_DAYS} days, then it's gone. tap to pick.`}
                </BalancedText>
              </Animated.View>
            }
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
          />

          <TrashActionBar
            selected={selected.size}
            bottomInset={insets.bottom}
            width={screenWidth}
            onRestore={selected.size > 0 ? restoreSelected : confirmRestoreAll}
            onDelete={selected.size > 0 ? deleteSelected : confirmEmpty}
          />
        </>
      ) : (
        <View style={styles.empty}>
          <Animated.View entering={fadeIn(400)} style={styles.emptyArt}>
            <AsciiArt art={BIN_ART} color={theme.textMuted} fontSize={12} />
          </Animated.View>
          <Animated.View entering={riseIn(300, 80)}>
            <ThemedText {...BALANCED_TEXT} style={[styles.emptyText, { color: theme.textSecondary }]}>
              {`nothing here.\nwhat you delete waits ${TRASH_DAYS} days.`}
            </ThemedText>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: GUTTER, paddingTop: 4 },
  intro: { paddingTop: 4, paddingBottom: 4, paddingHorizontal: 24, alignItems: 'center' },
  introText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, paddingBottom: 10 },
  row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32, paddingBottom: 80 },
  emptyArt: { opacity: 0.6 },
  emptyText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
