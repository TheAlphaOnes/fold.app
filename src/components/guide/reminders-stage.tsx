/**
 * RemindersStage — HABIT chapter, step 2. Shows a reminder as a picture
 * rather than prose: the day as a track with the three reminder windows on
 * it, a banner worded for right now, and what a tap does — drawn as a
 * line from the banner down to the camera. The skip rule is one caption.
 *
 * The action follows the notification permission: ask if undecided, send
 * to Settings if refused, otherwise just carry on.
 *
 * Segments: the track's windows fill in turn, the banner drops in from the
 * top, the connector draws down, the camera tile rises, the caption and
 * action arrive last — each on its own delay and duration.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';

import { ActionLink } from '@/components/action-link';
import { ThemedText } from '@/components/themed-text';
import { MOMENTS, momentAt } from '@/constants/progression';
import { EASE_OUT, fadeIn, fadeOut, riseIn } from '@/constants/motion';
import { useProgressionStore } from '@/hooks/use-progression';
import { useTheme } from '@/hooks/use-theme';
import type { NotificationPermission } from '@/services/analytics';
import { getNotificationPermission, requestReminderPermission } from '@/services/reminders.service';
import type { GuideStageProps } from './types';

const APP_ICON = require('../../../assets/images/ios-icon.png');

/** The track shows waking hours: 6am to midnight. */
const TRACK_FROM_HOUR = 6;
const TRACK_TO_HOUR = 24;
const CONNECTOR_HEIGHT = 34;

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

/** The day as one bar, with each reminder window marked where it falls. */
function DayTrack({ currentId, reduceMotion }: { currentId: string; reduceMotion: boolean }) {
  const theme = useTheme();
  const span = TRACK_TO_HOUR - TRACK_FROM_HOUR;
  const at = (hour: number) => `${((hour - TRACK_FROM_HOUR) / span) * 100}%` as const;

  return (
    <View accessible accessibilityLabel={`Reminders arrive ${MOMENTS.map((m) => `${m.id} ${formatHour(m.nudgeFromHour)} to ${formatHour(m.nudgeToHour)}`).join(', ')}.`}>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        {MOMENTS.map((moment, i) => {
          const isNow = moment.id === currentId;
          return (
            // The fade lives on the outer view; the inner one keeps its own opacity.
            <Animated.View
              key={moment.id}
              entering={reduceMotion ? undefined : fadeIn(240, 80 + i * 110)}
              style={[
                styles.segment,
                {
                  left: at(moment.nudgeFromHour),
                  width: at(TRACK_FROM_HOUR + moment.nudgeToHour - moment.nudgeFromHour),
                },
              ]}
            >
              <View
                style={[
                  StyleSheet.absoluteFill,
                  styles.segmentFill,
                  { backgroundColor: isNow ? theme.accentWarm : theme.textMuted, opacity: isNow ? 1 : 0.55 },
                ]}
              />
            </Animated.View>
          );
        })}
      </View>
      <View style={styles.trackLabels}>
        {MOMENTS.map((moment, i) => {
          const isNow = moment.id === currentId;
          const centre = (moment.nudgeFromHour + moment.nudgeToHour) / 2;
          return (
            <Animated.View
              key={moment.id}
              entering={reduceMotion ? undefined : fadeIn(260, 180 + i * 110)}
              style={[styles.trackLabel, { left: at(centre) }]}
            >
              <ThemedText style={[styles.trackName, { color: isNow ? theme.text : theme.textMuted }]}>
                {moment.id.toUpperCase()}
              </ThemedText>
              <ThemedText style={[styles.trackTime, { color: theme.textMuted }]}>
                {`${formatHour(moment.nudgeFromHour)}–${formatHour(moment.nudgeToHour)}`}
              </ThemedText>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

/** A dotted line drawn down from the banner, with a tap ring that pulses once. */
function TapConnector({ reduceMotion }: { reduceMotion: boolean }) {
  const theme = useTheme();
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const ring = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    draw.set(withDelay(620, withTiming(1, { duration: 320, easing: EASE_OUT })));
    ring.set(
      withDelay(
        700,
        withSequence(withTiming(1.25, { duration: 220, easing: EASE_OUT }), withTiming(1, { duration: 260, easing: EASE_OUT })),
      ),
    );
  }, [draw, ring, reduceMotion]);

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: draw.get() }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, ring.get()), transform: [{ scale: ring.get() }] }));

  return (
    <View style={styles.connector} pointerEvents="none">
      <Animated.View style={[styles.connectorLine, { borderColor: theme.textMuted }, lineStyle]} />
      <Animated.View style={[styles.tapRing, { borderColor: theme.accentWarm }, ringStyle]} />
    </View>
  );
}

export function RemindersStage({ status, onSuccess }: Pick<GuideStageProps, 'status' | 'onSuccess'>) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion() ?? false;
  const [permission, askPermission] = usePermission();

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
      <DayTrack currentId={now.id} reduceMotion={reduceMotion} />

      <View style={styles.flow}>
        <Animated.View
          entering={reduceMotion ? undefined : riseIn(420, 360, -18)}
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

        <TapConnector reduceMotion={reduceMotion} />

        <Animated.View
          entering={reduceMotion ? undefined : riseIn(320, 820, 10)}
          style={[styles.camera, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
          accessible
          accessibilityLabel="Tap a reminder and the camera opens."
        >
          <View style={[styles.cameraIcon, { backgroundColor: theme.accentWarm }]}>
            <Camera size={18} color="#FFFFFF" strokeWidth={2.25} />
          </View>
          <View>
            <ThemedText style={[styles.cameraTitle, { color: theme.text }]}>CAMERA OPENS</ThemedText>
            <ThemedText style={[styles.cameraBody, { color: theme.textMuted }]}>snap what you’re doing</ThemedText>
          </View>
        </Animated.View>
      </View>

      <Animated.View entering={reduceMotion ? undefined : fadeIn(320, 1000)}>
        <ThemedText style={[styles.caption, { color: theme.textMuted }]}>
          captured it already? that reminder is skipped.
        </ThemedText>
      </Animated.View>

      <View style={styles.action}>
        {status === 'active' && permission !== null && (
          <Animated.View entering={reduceMotion ? undefined : fadeIn(260, 1100)} exiting={fadeOut()}>
            <ActionLink text={action.text} onPress={action.onPress} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Content starts under the prompt and the action sits at the foot, so no
  // band of empty space opens up between the title and the page.
  container: {
    flex: 1,
    paddingHorizontal: 21,
    paddingTop: 12,
    gap: 28,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  segmentFill: {
    borderRadius: 3,
  },
  trackLabels: {
    height: 34,
    marginTop: 10,
  },
  trackLabel: {
    position: 'absolute',
    width: 96,
    marginLeft: -48,
    alignItems: 'center',
    gap: 2,
  },
  trackName: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    lineHeight: 13,
  },
  trackTime: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    lineHeight: 13,
  },
  flow: {
    alignItems: 'center',
  },
  banner: {
    alignSelf: 'stretch',
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
  connector: {
    height: CONNECTOR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorLine: {
    position: 'absolute',
    top: 0,
    height: CONNECTOR_HEIGHT,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    transformOrigin: 'top',
  },
  tapRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  camera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 18,
    borderRadius: 26,
    borderWidth: 1,
  },
  cameraIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    lineHeight: 14,
  },
  cameraBody: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  caption: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  action: {
    marginTop: 'auto',
    minHeight: 48,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
