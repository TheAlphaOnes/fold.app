/**
 * LaunchStage — a guide step done in the real app. It shows what the step
 * is about and one button that opens the screen it happens on (a new page
 * in the composer, the newest memory, stamps, the map). The app marks the
 * mission when it's actually used there; coming back to the guide, the step
 * is already done and plays its success beat.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ArrowUpRight, BookOpen, Map as MapIcon, PenLine, Stamp as StampIcon, type LucideIcon } from 'lucide-react-native';

import type { GuideStageProps, LatestMemory } from '@/components/guide/types';
import { ThemedText } from '@/components/themed-text';
import type { GuideLaunch } from '@/constants/guide';
import { fadeIn, riseIn } from '@/constants/motion';
import { useSettingsStore } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';
import { navigate } from '@/utils/navigation';

const ICONS: Record<GuideLaunch, LucideIcon> = {
  compose: PenLine,
  'latest-memory': BookOpen,
  stamps: StampIcon,
  'stamps-map': MapIcon,
};

interface LaunchStageProps extends GuideStageProps {
  latest: LatestMemory;
}

export function LaunchStage({ step, status, onSuccess, onNudge, latest }: LaunchStageProps) {
  const theme = useTheme();
  const done = useSettingsStore((s) => s.settings.guideProgress[step.mission]);

  // Done in the app (now or before): play the success beat once.
  useEffect(() => {
    if (done && status === 'active') onSuccess();
  }, [done, status, onSuccess]);

  const launch = step.launch ?? 'compose';
  const Icon = ICONS[launch];

  const open = () => {
    haptic.tap();
    if (launch === 'compose') navigate.push('/compose');
    else if (launch === 'stamps') navigate.push('/stamps');
    else if (launch === 'stamps-map') navigate.push('/stamps/map');
    else if (latest.memory) navigate.push(`/memory/${latest.memory.id}`);
    else onNudge('keep a memory first, then come back.');
  };

  return (
    <View style={styles.root}>
      <Animated.View entering={fadeIn(260, 80)} style={[styles.badge, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        <Icon size={34} color={theme.text} strokeWidth={1.5} />
      </Animated.View>
      <Animated.View entering={riseIn(320, 200, 10)}>
        <Pressable
          onPress={open}
          disabled={status !== 'active'}
          accessibilityRole="button"
          accessibilityLabel={step.action ?? 'Open'}
          style={({ pressed }) => [styles.cta, { backgroundColor: theme.text, opacity: pressed ? 0.75 : 1 }]}
        >
          <ThemedText style={[styles.ctaText, { color: theme.background }]}>{step.action ?? 'OPEN'}</ThemedText>
          <ArrowUpRight size={16} color={theme.background} />
        </Pressable>
      </Animated.View>
      <Animated.View entering={fadeIn(260, 320)}>
        <ThemedText style={[styles.note, { color: theme.textMuted }]}>do it there, then come back</ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, paddingBottom: 40 },
  badge: { width: 96, height: 96, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cta: { height: 48, paddingHorizontal: 24, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaText: { fontFamily: 'JetBrainsMono-Bold', fontSize: 12, letterSpacing: 2 },
  note: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, letterSpacing: 0.5 },
});
