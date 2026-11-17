/**
 * TodayDoodle — home's first page: today's doodle.
 *
 *   not yet kept                  kept
 *   ┌──────────────────────┐      ┌──────────────────────┐
 *   │ TUE 17.11    No. 321 │      │ TUE 17.11    No. 321 │
 *   │                      │      │                      │
 *   │      ( ghosted )     │      │      ( doodle )      │  full colour,
 *   │                      │      │                      │  gently boiling
 *   │ keep a moment today  │      │       little deer    │
 *   │ to reveal it.        │      │ kept today · 05 this │
 *   │ [photo][write][voice]│      │              month   │
 *   └──────────────────────┘      └──────────────────────┘
 *
 * Keeping anything today earns the doodle (see DoodleReveal on home); the
 * earned card opens it large in the spotlight.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Camera, Mic, PenLine, type LucideIcon } from 'lucide-react-native';

import { BalancedText } from '@/components/balanced-text';
import { ThemedText } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { DayDoodle } from '@/doodles/day-doodle';
import { doodleForDate, serialOf, slotOf } from '@/doodles/library';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/services/haptics';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface TodayDoodleProps {
  width: number;
  height: number;
  onPhoto: () => void;
  onWrite: () => void;
  onVoice: () => void;
  /** Something was kept today: the doodle is earned. */
  kept?: boolean;
  /** Days kept this month, shown on the earned card. */
  monthDays?: number;
  /** Opens the earned doodle large. */
  onOpen?: () => void;
}

export function TodayDoodle({
  width,
  height,
  onPhoto,
  onWrite,
  onVoice,
  kept = false,
  monthDays,
  onOpen,
}: TodayDoodleProps) {
  const theme = useTheme();
  const today = new Date();
  const doodle = doodleForDate(today);
  const art = Math.min(width * 0.62, height * 0.42);
  const stamp = `${DAYS[today.getDay()]} ${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}`;
  const serial = serialOf(slotOf(today));
  const actions: { label: string; icon: LucideIcon; onPress: () => void }[] = [
    { label: 'PHOTO', icon: Camera, onPress: onPhoto },
    { label: 'WRITE', icon: PenLine, onPress: onWrite },
    { label: 'VOICE', icon: Mic, onPress: onVoice },
  ];
  const earnedLine = monthDays === undefined ? 'kept today' : `kept today · ${String(monthDays).padStart(2, '0')} this month`;

  const page = (
    <View
      style={[
        styles.page,
        { width: width - 32, height: height - 24, borderColor: theme.border, backgroundColor: theme.backgroundElement },
      ]}
    >
      <View style={styles.top}>
        <ThemedText style={[Type.rail, styles.stamp, { color: theme.text }]}>{stamp.toUpperCase()}</ThemedText>
        <ThemedText style={[Type.rail, { color: theme.accentWarm }]}>
          {kept ? serial.toUpperCase() : `${serial.toUpperCase()} · ?`}
        </ThemedText>
      </View>

      <View
        style={styles.middle}
        accessible
        accessibilityLabel={
          kept ? `Today's doodle: ${doodle.name}` : "Today's doodle, hidden until you keep a moment today"
        }
      >
        {kept ? (
          <Animated.View entering={FadeIn.duration(320)}>
            <DayDoodle doodle={doodle} size={art} moving />
          </Animated.View>
        ) : (
          <View style={{ opacity: 0.14 }}>
            <DayDoodle doodle={doodle} size={art} moving={false} />
          </View>
        )}
      </View>

      {kept ? (
        <Animated.View entering={FadeIn.delay(140).duration(320)} style={styles.earned}>
          <ThemedText style={[styles.name, { color: theme.text }]}>{doodle.name}</ThemedText>
          <ThemedText style={[Type.rail, { color: theme.textMuted }]}>{earnedLine}</ThemedText>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.delay(160).duration(320)} style={styles.bottom}>
          <BalancedText style={[styles.line, { color: theme.text }]}>keep a moment today to reveal it.</BalancedText>
          <View style={styles.actions}>
            {actions.map(({ label, icon: Icon, onPress }) => (
              <Pressable
                key={label}
                onPress={() => {
                  haptic.press();
                  onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={label.toLowerCase()}
                style={({ pressed }) => [
                  styles.action,
                  { borderColor: theme.border, backgroundColor: theme.background, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Icon size={18} color={theme.text} />
                <ThemedText style={[styles.actionText, { color: theme.text }]}>{label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );

  if (!kept || !onOpen) return page;
  return (
    <Pressable
      onPress={() => {
        haptic.press();
        onOpen();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Today's doodle: ${doodle.name}. Opens it large.`}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {page}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { borderWidth: 1, borderRadius: 22, padding: 18, overflow: 'hidden' },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  // iOS measures a letter-spaced run without its trailing gap, which clips
  // the last glyph; the padding keeps the full date inside the text's bounds.
  stamp: { paddingRight: 3 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { gap: 14 },
  line: { fontFamily: 'JetBrainsMono-Regular', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, height: 64, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 1.2 },
  earned: { alignItems: 'center', gap: 6, paddingBottom: 4 },
  name: { fontFamily: 'JetBrainsMono-Medium', fontSize: 18 },
});
