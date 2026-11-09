import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { GrainBackground } from '@/components/grain-background';
import { ThemedText } from '@/components/themed-text';
import { CloseButton } from '@/components/round-button';
import { INK_FACTORS, WORDS_MIN_CHARS } from '@/constants/ink';
import { MOMENTS } from '@/constants/progression';

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
        <CloseButton />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText style={heading}>1. Creating memories</ThemedText>
        <ThemedText style={text}>
          <B>TAP</B> the orange key to make a memory. Start writing, or add photos with the camera and gallery buttons.{'\n'}
          <B>HOLD</B> the orange key to record a voice note. Pause, discard or save it from the recording screen.{'\n'}
          <B>SWIPE UP</B> on the orange key to take a photo straight away.{'\n'}
          You can also share text or photos into Fold from other apps.
        </ThemedText>

        <ThemedText style={heading}>2. Viewing & interacting</ThemedText>
        <ThemedText style={text}>
          <B>DOUBLE TAP</B> a memory on your timeline to open it full screen.{'\n'}
          <B>HOLD</B> a memory for its menu: share it as an image, open, edit, add it to a story, save to photos or delete.{'\n'}
          To change a memory, choose <B>EDIT</B>: it opens in the same screen you made it in.
        </ThemedText>

        <ThemedText style={heading}>3. Templates & the canvas</ThemedText>
        <ThemedText style={text}>
          Every memory is a full-screen canvas, like a story. Pick how it looks from the pill under the canvas: tap it for the next look, hold it to see them all.{'\n'}
          <B>CANVAS</B> one photo or video, edge to edge.{'\n'}
          <B>TEXT</B> your words on the stripes.{'\n'}
          <B>STICKERS</B> photos placed freely, in shapes like heart, star, polaroid, stamp or tape.{'\n'}
          <B>GRIDS</B> collages from two to six photos, including a film strip and a diary page.{'\n'}
          <B>SLIDESHOW</B> your photos full screen, one after another.{'\n'}
          <B>RING, FAN, DECK, FLOAT</B> your photos arranged in a shape that moves: a turning ring, a swaying hand of cards, a pile that flips through, a gentle drift.{'\n'}
          Fold picks one as you add photos; change it any time.{'\n\n'}
          On the canvas, <B>DRAG</B> text or a sticker to move it, <B>PINCH</B> to resize, <B>TWIST</B> to rotate, and drop it on the bin to remove it. Pinch and drag a photo to frame it. In a grid, tap an empty spot to fill it, and hold one photo then tap another to swap them.
        </ThemedText>

        <ThemedText style={heading}>4. Stories</ThemedText>
        <ThemedText style={text}>
          Stories are chapters, like "Japan Trip 2026". Start one from your Profile, then file memories into it from the
          book icon on any memory, or hold a memory and tap Add to story. A memory can belong to more than one story.
        </ThemedText>

        <ThemedText style={heading}>5. Continuum: streak & ink</ThemedText>
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

        <ThemedText style={heading}>6. Reminders</ThemedText>
        <ThemedText style={text}>
          Fold sends three gentle reminders a day to snap what you are doing: {REMINDER_WINDOWS}. Each lands at a
          different time every day. If you have already captured that part of the day, its reminder is skipped. Tap
          one to open the camera.{'\n\n'}
          To turn reminders off, switch off notifications for Fold in your phone's Settings.
        </ThemedText>

        <ThemedText style={heading}>7. Timeline modes</ThemedText>
        <ThemedText style={text}>
          In Settings, switch between Yearly, Monthly or Infinite to change how your memories are grouped on the home
          screen.
        </ThemedText>

        <ThemedText style={heading}>8. Field Guide</ThemedText>
        <ThemedText style={text}>
          The Field Guide tab on the home screen walks you through every gesture with short missions. Restart it any
          time from Settings → Restart Field Guide.
        </ThemedText>

        <ThemedText style={heading}>9. Deleted something by mistake?</ThemedText>
        <ThemedText style={text}>
          Deleted memories wait in Settings → Recently Deleted for 30 days. Restore them from there before they are
          gone for good.
        </ThemedText>

        <ThemedText style={heading}>10. Not getting reminders or haptics?</ThemedText>
        <ThemedText style={text}>
          For reminders, make sure notifications are allowed for Fold in your phone's Settings. For haptics, Settings →
          Testing → <B>TEST HAPTICS</B> plays a long buzz and then each pattern, and names anything on your phone that
          blocks vibration, like Battery Saver.
        </ThemedText>

        <ThemedText style={heading}>11. Data & privacy</ThemedText>
        <ThemedText style={text}>
          Your memories live only on this device and never leave it unless you share them. Use your phone's backup to
          keep them safe.{'\n\n'}
          Fold sends anonymous usage data, such as which features are used and crash reports, but never what you write
          or capture. The Privacy Policy has the details.
        </ThemedText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 21, paddingBottom: 21 },
  title: { fontFamily: 'JetBrainsMono-Bold', fontSize: 18, letterSpacing: 2 },
  content: { paddingHorizontal: 21, paddingBottom: 40 },
  heading: { fontFamily: 'JetBrainsMono-Bold', fontSize: 14, letterSpacing: 1, marginTop: 24, marginBottom: 8 },
  paragraph: { fontFamily: 'JetBrainsMono-Regular', fontSize: 14, lineHeight: 22, letterSpacing: -0.2 },
  bold: { fontFamily: 'JetBrainsMono-Bold' },
});
