import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { INK_FACTORS, WORDS_MIN_CHARS } from '@/constants/ink';
import { MOMENTS } from '@/constants/progression';
import { goBack } from '@/utils/navigation';

/** 8 → "8am", 13 → "1pm". */
function formatHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? 'am' : 'pm'}`;
}

/** Ink and reminder answers read from the same tables the app uses, so they cannot drift. */
const INK_RULES: Record<string, string> = {
  day: 'for saving anything that day',
  moments: 'for each of morning, afternoon and evening you capture',
  words: `for writing something real (${WORDS_MIN_CHARS}+ characters)`,
  photo: 'for a photo or video of your own (GIFs don’t count)',
};

const REMINDER_WINDOWS = MOMENTS.map(
  (m) => `${m.id} between ${formatHour(m.nudgeFromHour)} and ${formatHour(m.nudgeToHour)}`,
).join(', ');

function B({ children }: { children: React.ReactNode }) {
  return <ThemedText style={styles.bold}>{children}</ThemedText>;
}

export default function FAQScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const text = [styles.paragraph, { color: theme.text }];
  const heading = [styles.heading, { color: theme.text }];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground opacity={0.03} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <ThemedText style={[styles.title, { color: theme.text }]}>FAQ & GESTURES</ThemedText>
        <Pressable
          onPress={() => goBack()}
          style={[styles.closeBtn, { borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={16} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText style={heading}>1. Creating memories</ThemedText>
        <ThemedText style={text}>
          <B>TAP</B> the orange key to write a memory.{'\n'}
          <B>HOLD</B> the orange key to record a voice note. Let go and it is saved.{'\n'}
          <B>SWIPE UP</B> on the orange key to take a photo, then add words to it.{'\n'}
          You can also share text or photos into Fold from other apps.
        </ThemedText>

        <ThemedText style={heading}>2. Viewing & interacting</ThemedText>
        <ThemedText style={text}>
          <B>DOUBLE TAP</B> a memory on your timeline to open it full screen.{'\n'}
          <B>HOLD</B> a memory to share it as an image.{'\n'}
          On a memory's canvas, <B>HOLD, THEN DRAG</B> a sticker to move it and <B>PINCH</B> to resize it.
        </ThemedText>

        <ThemedText style={heading}>3. Stories</ThemedText>
        <ThemedText style={text}>
          Stories are chapters, like "Japan Trip 2026". Start one from your Profile, then file memories into it from the
          book icon on any memory. A memory can belong to more than one story.
        </ThemedText>

        <ThemedText style={heading}>4. Continuum: streak & ink</ThemedText>
        <ThemedText style={text}>
          The Continuum card on your Profile shows two numbers.{'\n\n'}
          <B>DAYS</B> is your streak: the days in a row you have saved at least one memory. "best" is your longest run.
          {'\n\n'}
          <B>INK</B> is how fully you lived this month in Fold. Each day earns:{'\n'}
          {INK_FACTORS.map((f) => `  +${f.points * f.perDay} ${INK_RULES[f.id]}`).join('\n')}
          {'\n\n'}
          Ink is counted per day, so saving the same thing ten times adds nothing. It starts again at 0 on the 1st of
          every month, and your best month stays as your <B>record</B>. Deleting a memory takes its ink back.
        </ThemedText>

        <ThemedText style={heading}>5. Reminders</ThemedText>
        <ThemedText style={text}>
          Fold sends three gentle reminders a day to snap what you are doing: {REMINDER_WINDOWS}. Each lands at a
          different time every day. If you have already captured that part of the day, its reminder is skipped. Tap
          one to open the camera.{'\n\n'}
          To turn reminders off, switch off notifications for Fold in your phone's Settings.
        </ThemedText>

        <ThemedText style={heading}>6. Timeline modes</ThemedText>
        <ThemedText style={text}>
          In Settings, switch between Yearly, Monthly or Infinite to change how your memories are grouped on the home
          screen.
        </ThemedText>

        <ThemedText style={heading}>7. Field Guide</ThemedText>
        <ThemedText style={text}>
          The Field Guide tab on the home screen walks you through every gesture with short missions. Restart it any
          time from Settings → Restart Field Guide.
        </ThemedText>

        <ThemedText style={heading}>8. Deleted something by mistake?</ThemedText>
        <ThemedText style={text}>
          Deleted memories wait in Settings → Recently Deleted for 30 days. Restore them from there before they are
          gone for good.
        </ThemedText>

        <ThemedText style={heading}>9. Not getting reminders or haptics?</ThemedText>
        <ThemedText style={text}>
          Settings → Testing has two checks. <B>TEST NOTIFICATION</B> sends a reminder in 5 seconds. <B>TEST HAPTICS</B>{' '}
          plays a long buzz and then each pattern. If you feel nothing, check your phone's vibration settings and Do Not
          Disturb.
        </ThemedText>

        <ThemedText style={heading}>10. Data & privacy</ThemedText>
        <ThemedText style={text}>
          Your memories live only on this device and never leave it unless you share them. Use your phone's backup to
          keep them safe.{'\n\n'}
          Fold sends anonymous usage data, such as which features are used and crash reports, but never what you write
          or capture. Turn it off any time in Settings → Share Usage Data. The Privacy Policy has the details.
        </ThemedText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 21, paddingBottom: 21 },
  title: { fontFamily: 'JetBrainsMono-Bold', fontSize: 18, letterSpacing: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 21, paddingBottom: 40 },
  heading: { fontFamily: 'JetBrainsMono-Bold', fontSize: 14, letterSpacing: 1, marginTop: 24, marginBottom: 8 },
  paragraph: { fontFamily: 'JetBrainsMono-Regular', fontSize: 14, lineHeight: 22, letterSpacing: -0.2 },
  bold: { fontFamily: 'JetBrainsMono-Bold' },
});
