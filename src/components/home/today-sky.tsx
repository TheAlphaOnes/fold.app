/**
 * TodaySky — today's page before the camera is up: no card, just the sky.
 *
 *   ░░░░░░░░░░░░░░░░░░   the colour follows the time of day (skyFor):
 *   12.                  dawn peach, noon blue, golden orange, night ink
 *   11                   the date, huge, running off the left edge
 *   thu · 17:42          the hour and the line for it
 *   golden hour, almost
 *          ●             a sun (or moon) sitting where the hour puts it
 *
 * Entrance is split into segments on their own clocks: the sky washes in,
 * the day digits rise, the month follows slower, the line arrives last and
 * the sun drifts in on the longest fade.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { BalancedText } from '@/components/balanced-text';
import { ThemedText } from '@/components/themed-text';
import { fadeIn, riseIn } from '@/constants/motion';
import { dayLine, skyFor } from '@/home/today';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface TodaySkyProps {
  width: number;
  height: number;
  /** Shown under the date before camera access is given. */
  invite?: string;
}

/** Where the sun or moon sits: high at midday, low at both ends of the day. */
function bodyPosition(now: Date, width: number, height: number) {
  const t = (now.getHours() + now.getMinutes() / 60) / 24;
  // Kept to the right, clear of the date: it drifts a little west through the day.
  const x = width * (0.84 - 0.12 * t);
  const y = height * (0.52 - 0.24 * Math.sin(Math.PI * t));
  return { x, y };
}

export function TodaySky({ width, height, invite }: TodaySkyProps) {
  // Read once per mount: the page is rebuilt when it scrolls back into view.
  const now = useMemo(() => new Date(), []);
  const sky = skyFor(now);
  const ink = sky.dark ? '#FFFFFF' : '#111111';
  const muted = sky.dark ? '#FFFFFFB3' : '#111111A6';
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  // Three monospaced glyphs (0.6em each) span ~94% of the width, from just off the left edge.
  const size = Math.round(width * 0.52);
  const body = bodyPosition(now, width, height);
  const bodyR = width * 0.09;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View entering={fadeIn(600)} style={StyleSheet.absoluteFill}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={sky.top} />
              <Stop offset="1" stopColor={sky.bottom} />
            </LinearGradient>
          </Defs>
          <Rect width={width} height={height} fill="url(#sky)" />
        </Svg>
      </Animated.View>

      {/* The sun or moon, with its own soft halo. */}
      <Animated.View entering={fadeIn(1400, 320)} style={StyleSheet.absoluteFill}>
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={sky.dark ? '#FFF6DD' : '#FFFFFF'} stopOpacity={sky.dark ? 0.35 : 0.55} />
              <Stop offset="1" stopColor={sky.dark ? '#FFF6DD' : '#FFFFFF'} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={body.x} cy={body.y} r={bodyR * 3} fill="url(#glow)" />
          <Circle cx={body.x} cy={body.y} r={bodyR} fill={sky.dark ? '#F4EEDC' : '#FFFFFF'} opacity={sky.dark ? 0.9 : 0.75} />
        </Svg>
      </Animated.View>

      <View style={[styles.date, { left: -size * 0.06, top: height * 0.08 }]}>
        <Animated.View entering={riseIn(700, 80, 28)}>
          <ThemedText style={[styles.digits, { color: ink, fontSize: size, lineHeight: size * 0.92 }]} numberOfLines={1}>
            {`${day}.`}
          </ThemedText>
        </Animated.View>
        <Animated.View entering={riseIn(950, 200, 28)}>
          <ThemedText style={[styles.digits, { color: ink, fontSize: size, lineHeight: size * 0.92 }]} numberOfLines={1}>
            {month}
          </ThemedText>
        </Animated.View>
      </View>

      <Animated.View entering={riseIn(420, 460, 8)} style={[styles.meta, { top: height * 0.08 + size * 1.9 }]}>
        <ThemedText style={[styles.metaLine, { color: ink }]} numberOfLines={1}>
          {`${DAYS[now.getDay()]} · ${time}`}
        </ThemedText>
        <ThemedText style={[styles.metaLine, { color: muted }]} numberOfLines={1}>
          {dayLine(now)}
        </ThemedText>
        {invite && <BalancedText style={[styles.invite, { color: muted }]}>{invite}</BalancedText>}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  date: { position: 'absolute' },
  digits: { fontFamily: 'JetBrainsMono-Bold', letterSpacing: -2 },
  meta: { position: 'absolute', left: 24, right: 24, gap: 4 },
  metaLine: { fontFamily: 'JetBrainsMono-Medium', fontSize: 13, lineHeight: 18, letterSpacing: 1 },
  invite: { fontFamily: 'JetBrainsMono-Medium', fontSize: 12, lineHeight: 18, letterSpacing: 0.5, marginTop: 14, maxWidth: 260 },
});
