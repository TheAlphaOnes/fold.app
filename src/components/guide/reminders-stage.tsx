/**
 * RemindersStage — HABIT chapter, step 2. Shows what a moment reminder is
 * and what it does: the three windows a day, a real-looking banner worded
 * for right now, and what happens on tap (the camera opens) or when a
 * moment is already captured (no reminder).
 *
 * The action follows the notification permission: ask if undecided, send
 * to Settings if refused, otherwise just carry on.
 *
 * Segments: the windows rise in turn, the banner drops in from the top
 * (opacity resolves before the slide), then the two outcomes, then the action.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Camera, CheckCheck } from 'lucide-react-native';

import { ActionLink } from '@/components/action-link';
import { ThemedText } from '@/components/themed-text';
import { MOMENTS, momentAt } from '@/constants/progression';
import { fadeIn, fadeOut, riseIn } from '@/constants/motion';
import { useProgressionStore } from '@/hooks/use-progression';
import { useTheme } from '@/hooks/use-theme';
import type { NotificationPermission } from '@/services/analytics';
import { getNotificationPermission, requestReminderPermission } from '@/services/reminders.service';
import type { GuideStageProps } from './types';

const APP_ICON = require('../../../assets/images/ios-icon.png');

/** 8 → "8am", 13 → "1pm". */
function formatHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? 'am' : 'pm'}`;
}

function usePermission(): [NotificationPermission | null, () => Promise<boolean>] {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    getNotificationPermission()
      .then(setPermission)
      .catch((error) => console.error('Failed to read notification permission', error));
  }, []);

  const ask = async () => {
    const granted = await requestReminderPermission();
    setPermission(granted ? 'granted' : 'denied');
    // Newly allowed: schedule today's reminders now rather than on the next refresh.
    if (granted) await useProgressionStore.getState().refresh();
    return granted;
  };

  return [permission, ask];
}

export function RemindersStage({ status, onSuccess }: Pick<GuideStageProps, 'status' | 'onSuccess'>) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion() ?? false;
  const [permission, askPermission] = usePermission();
  const enter = (duration: number, delay: number, distance?: number) =>
    reduceMotion ? undefined : riseIn(duration, delay, distance);

  // The sample is worded for the part of the day it is now, like the real ones.
  const now = useMemo(() => momentAt(new Date()), []);
  const sample = now.nudges[0];

  const action =
    permission === 'undetermined'
      ? { text: 'ALLOW REMINDERS', onPress: () => void askPermission().then(onSuccess) }
      : permission === 'denied'
        ? {
            text: 'TURN ON IN SETTINGS',
            onPress: () => {
              void Linking.openSettings();
              onSuccess();
            },
          }
        : { text: 'GOT IT', onPress: onSuccess };

  return (
    <View style={styles.container}>
      <View style={styles.windows}>
        {MOMENTS.map((moment, i) => (
          <Animated.View
            key={moment.id}
            entering={enter(260, i * 80, 10)}
            style={[
              styles.window,
              { borderColor: moment.id === now.id ? theme.text : theme.border, backgroundColor: theme.backgroundElement },
            ]}
          >
            <ThemedText style={[styles.windowLabel, { color: moment.id === now.id ? theme.text : theme.textMuted }]}>
              {moment.id.toUpperCase()}
            </ThemedText>
            <ThemedText style={[styles.windowTime, { color: theme.textMuted }]}>
              {`${formatHour(moment.nudgeFromHour)}–${formatHour(moment.nudgeToHour)}`}
            </ThemedText>
          </Animated.View>
        ))}
      </View>

      <Animated.View
        entering={reduceMotion ? undefined : riseIn(420, 320, -18)}
        style={[styles.banner, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        accessible
        accessibilityLabel={`Example reminder: ${sample.title}. ${sample.body}`}
      >
        <Image source={APP_ICON} style={styles.icon} contentFit="cover" />
        <View style={styles.bannerText}>
          <View style={styles.bannerTop}>
            <ThemedText style={[styles.bannerApp, { color: theme.text }]}>Fold</ThemedText>
            <ThemedText style={[styles.bannerTime, { color: theme.textMuted }]}>now</ThemedText>
          </View>
          <ThemedText style={[styles.bannerTitle, { color: theme.text }]} numberOfLines={1}>
            {sample.title}
          </ThemedText>
          <ThemedText style={[styles.bannerBody, { color: theme.textSecondary }]} numberOfLines={2}>
            {sample.body}
          </ThemedText>
        </View>
      </Animated.View>

      <View style={styles.outcomes}>
        <Animated.View entering={enter(280, 620, 8)} style={styles.outcome}>
          <Camera size={16} color={theme.accentWarm} />
          <ThemedText style={[styles.outcomeText, { color: theme.text }]}>
            tap it and the camera opens. snap what you're doing.
          </ThemedText>
        </Animated.View>
        <Animated.View entering={enter(280, 720, 8)} style={styles.outcome}>
          <CheckCheck size={16} color={theme.textMuted} />
          <ThemedText style={[styles.outcomeText, { color: theme.textMuted }]}>
            already captured that part of the day? its reminder is skipped.
          </ThemedText>
        </Animated.View>
      </View>

      <View style={styles.action}>
        {status === 'active' && permission !== null && (
          <Animated.View entering={reduceMotion ? undefined : fadeIn(260, 860)} exiting={fadeOut()}>
            <ActionLink text={action.text} onPress={action.onPress} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 21,
    gap: 22,
  },
  windows: {
    flexDirection: 'row',
    gap: 8,
  },
  window: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  windowLabel: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    lineHeight: 13,
  },
  windowTime: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    lineHeight: 14,
  },
  banner: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 9,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  bannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bannerApp: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  bannerTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  bannerTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 19,
  },
  bannerBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  outcomes: {
    gap: 12,
  },
  outcome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  outcomeText: {
    flex: 1,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  action: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
