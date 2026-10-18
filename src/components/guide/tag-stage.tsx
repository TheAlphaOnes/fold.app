/**
 * TagStage — STORIES chapter, step 2 (file a memory into a chapter).
 *
 * Teaches the real path, not a shortcut: double tap the user's own newest
 * memory to open it (the same CarouselItem the home feed uses), then tap the
 * book in the memory's toolbar. A two-part legend under the card shows which
 * half is next. Filing succeeds when the memory returns from the detail
 * screen with a chapter it did not have when the step began.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from 'expo-router';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { Book } from 'lucide-react-native';

import { CarouselItem } from '@/components/carousel-item';
import { ThemedText } from '@/components/themed-text';
import { GestureHint } from '@/components/guide/gesture-hint';
import { GuideEmptyNote } from '@/components/guide/guide-empty-note';
import { useFullCardSize } from '@/components/guide/fitted-memory-card';
import type { GuideStageProps, LatestMemory } from '@/components/guide/types';
import { riseIn } from '@/constants/motion';
import { useJournalStore } from '@/hooks/use-journal';
import { useTheme } from '@/hooks/use-theme';

const LEGEND_HEIGHT = 64;
const STAGE_PADDING = 12;
const NOT_FILED_NUDGE = 'not filed yet. tap the book inside.';

type PartState = 'next' | 'done' | 'waiting';

function LegendPart({ index, label, state, icon }: { index: string; label: string; state: PartState; icon?: React.ReactNode }) {
  const theme = useTheme();
  const isNext = state === 'next';
  return (
    <View
      style={[
        styles.part,
        { borderColor: isNext ? theme.text : theme.border, opacity: state === 'waiting' ? 0.55 : 1 },
      ]}
    >
      <ThemedText style={[styles.partIndex, { color: state === 'done' ? theme.accentWarm : theme.textMuted }]}>
        {state === 'done' ? 'OK' : index}
      </ThemedText>
      {icon}
      <ThemedText style={[styles.partLabel, { color: isNext ? theme.text : theme.textMuted }]}>{label}</ThemedText>
    </View>
  );
}

interface TagStageProps extends GuideStageProps {
  latest: LatestMemory;
}

export function TagStage({ step, status, area, latest, onSuccess, onNudge, onGoToStep }: TagStageProps) {
  const theme = useTheme();
  const full = useFullCardSize();
  const updatePositions = useJournalStore((state) => state.updatePositions);
  const restingScroll = useSharedValue(0);
  const isActive = status === 'active';
  const memory = latest.memory;

  // Baseline: the chapters this memory already belonged to when the step began.
  const baseline = useRef<{ memoryId: number; storyIds: Set<number> } | null>(null);
  useEffect(() => {
    baseline.current = null;
  }, [step.id]);

  const storyKey = memory ? memory.storyIds.join(',') : '';
  useEffect(() => {
    if (!memory) return;
    if (!baseline.current || baseline.current.memoryId !== memory.id) {
      baseline.current = { memoryId: memory.id, storyIds: new Set(memory.storyIds) };
      return;
    }
    const known = baseline.current.storyIds;
    if (isActive && memory.storyIds.some((id) => !known.has(id))) {
      onSuccess();
    }
    // storyKey captures storyIds changes without depending on array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory?.id, storyKey, isActive, onSuccess]);

  // Part one is done once the memory has been opened from this step.
  const [openedId, setOpenedId] = useState<number | null>(null);
  const opened = memory !== null && openedId === memory.id;
  const pendingOpen = useRef(false);

  const handleOpen = useCallback(() => {
    if (!isActive || !memory) return;
    pendingOpen.current = true;
    setOpenedId(memory.id);
  }, [isActive, memory]);

  // On return from the memory: story links do not bump the journal's
  // hydration version, so re-read; if nothing was filed, say what is missing.
  const reloadRef = useRef(latest.reload);
  const nudgeRef = useRef(onNudge);
  useEffect(() => {
    reloadRef.current = latest.reload;
    nudgeRef.current = onNudge;
  }, [latest.reload, onNudge]);

  const navigation = useNavigation();
  useEffect(() => {
    return navigation.addListener('focus', async () => {
      if (!pendingOpen.current) return;
      pendingOpen.current = false;
      const fresh = await reloadRef.current();
      const base = baseline.current;
      const filed = !!fresh && !!base && fresh.id === base.memoryId && fresh.storyIds.some((id) => !base.storyIds.has(id));
      if (!filed) nudgeRef.current(NOT_FILED_NUDGE);
    });
  }, [navigation]);

  if (!latest.loaded) return null;

  if (!memory) {
    return (
      <GuideEmptyNote
        message={'chapters hold memories.\nmake one first.'}
        actionLabel="WRITE ONE NOW"
        onAction={() => onGoToStep('write')}
      />
    );
  }

  const filed = !isActive;
  const cardHeight = Math.max(220, Math.min(full.height, area.height - LEGEND_HEIGHT - STAGE_PADDING * 2));

  return (
    <View style={styles.container}>
      <View style={{ height: cardHeight, width: '100%' }}>
        <CarouselItem
          item={memory}
          itemOffset={0}
          snapInterval={cardHeight}
          cardHeight={cardHeight}
          scrollY={restingScroll}
          updatePositions={updatePositions}
          onOpen={handleOpen}
        />
        <GestureHint gesture={step.gesture} visible={isActive && !opened} />
      </View>

      <Animated.View entering={riseIn(280, 200)} style={styles.legend}>
        <LegendPart index="01" label="DOUBLE TAP" state={opened || filed ? 'done' : 'next'} />
        <ThemedText style={[styles.arrow, { color: theme.textMuted }]}>{'->'}</ThemedText>
        <LegendPart
          index="02"
          label="TAP THE BOOK"
          state={filed ? 'done' : opened ? 'next' : 'waiting'}
          icon={<Book size={12} color={opened && !filed ? theme.text : theme.textMuted} />}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  legend: {
    height: LEGEND_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  part: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  partIndex: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
  },
  partLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.6,
  },
  arrow: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    lineHeight: 14,
  },
});
