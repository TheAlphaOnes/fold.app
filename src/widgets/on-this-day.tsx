/**
 * On This Day — a memory from this date in another year, or one you'd
 * forgotten, full-bleed on the home screen.
 *
 *   ┌────────────────┐   a photo fills the whole widget; a dark fade at the
 *   │                │   foot carries three quiet lines: what it is, how
 *   │     photo      │   long ago, and when and where
 *   │▒ ON THIS DAY   │
 *   │▒ 1 year ago    │   a words-only memory is set in type on paper
 *   │▒ 12 nov · sf   │   instead, the words themselves the picture
 *   └────────────────┘
 *
 * A tap opens the memory. The timeline (see `model.ts`) turns to a new pick
 * every few hours and WidgetKit cross-fades each change.
 *
 * Runs in the widget's isolated runtime: no hooks, no imports beyond Expo
 * UI, nothing at module scope. Everything arrives through props, and the
 * palette is restated because the theme module can't be imported.
 */

import { Text, VStack, ZStack, Image, Spacer } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  aspectRatio,
  background,
  clipped,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  padding,
  resizable,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { OnThisDayProps } from '@/widgets/model';

const OnThisDay = (props: OnThisDayProps, environment: WidgetEnvironment) => {
  'widget';

  const p = props ?? { empty: true, id: 0, uri: '', words: '', place: '', when: '', date: '', anniversary: false };
  const dark = environment.colorScheme === 'dark';
  const paper = dark ? '#121212' : '#F5F1EA';
  const ink = dark ? '#F2F2F2' : '#141414';
  const muted = dark ? '#8C8C8C' : '#77736C';
  const accent = dark ? '#FF5A1A' : '#E8620C';
  const small = environment.widgetFamily === 'systemSmall';
  const fill = frame({ maxWidth: 9999, maxHeight: 9999 });
  const kicker = p.anniversary ? 'ON THIS DAY' : 'FROM YOUR PAST';
  const meta = p.place ? `${p.date} · ${p.place}` : p.date;

  if (p.empty) {
    return (
      <VStack
        alignment="leading"
        spacing={6}
        modifiers={[containerBackground(paper, 'widget'), fill, padding({ all: 16 }), widgetURL('fold://')]}
      >
        <Text modifiers={[font({ design: 'monospaced', size: 9, weight: 'semibold' }), kerning(1.4), foregroundStyle(accent)]}>
          ON THIS DAY
        </Text>
        <Spacer />
        <Text modifiers={[font({ design: 'serif', size: small ? 17 : 20 }), foregroundStyle(ink), lineLimit(3)]}>
          what you keep today comes back here
        </Text>
        <Text modifiers={[font({ design: 'monospaced', size: 9 }), foregroundStyle(muted)]}>
          a year from now
        </Text>
      </VStack>
    );
  }

  // Words only: the memory set in type, the page itself the picture.
  if (p.uri === '') {
    return (
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[
          containerBackground(paper, 'widget'),
          fill,
          padding({ all: 16 }),
          widgetURL(`fold://memory/${p.id}`),
          accessibilityLabel(`${kicker.toLowerCase()}, ${p.when}. ${p.words}`),
        ]}
      >
        <Text modifiers={[font({ design: 'monospaced', size: 9, weight: 'semibold' }), kerning(1.4), foregroundStyle(accent)]}>
          {kicker}
        </Text>
        <Spacer />
        <Text modifiers={[font({ design: 'serif', size: small ? 16 : 19 }), foregroundStyle(ink), lineLimit(small ? 4 : 3)]}>
          {`“${p.words}”`}
        </Text>
        <Spacer />
        <Text modifiers={[font({ design: 'monospaced', size: 10, weight: 'medium' }), foregroundStyle(ink)]}>
          {p.when}
        </Text>
        <Text modifiers={[font({ design: 'monospaced', size: 9 }), foregroundStyle(muted), lineLimit(1)]}>
          {meta}
        </Text>
      </VStack>
    );
  }

  // A photo, edge to edge, with its lines over a fade at the foot.
  return (
    <ZStack
      alignment="bottomLeading"
      modifiers={[
        containerBackground('#000000', 'widget'),
        widgetURL(`fold://memory/${p.id}`),
        accessibilityLabel(`${kicker.toLowerCase()}, ${p.when}, ${meta}.`),
      ]}
    >
      <Image uiImage={p.uri} modifiers={[resizable(), aspectRatio({ contentMode: 'fill' }), fill, clipped()]} />
      <VStack
        modifiers={[
          fill,
          background({
            type: 'linearGradient',
            colors: ['#00000000', '#00000000', '#00000099', '#000000D9'],
            startPoint: { x: 0.5, y: 0 },
            endPoint: { x: 0.5, y: 1 },
          }),
        ]}
      >
        <Spacer />
      </VStack>
      <VStack alignment="leading" spacing={2} modifiers={[padding({ horizontal: 14, vertical: 13 })]}>
        <Text modifiers={[font({ design: 'monospaced', size: 8, weight: 'semibold' }), kerning(1.4), foregroundStyle(accent)]}>
          {kicker}
        </Text>
        <Text modifiers={[font({ size: small ? 17 : 20, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>
          {p.when}
        </Text>
        <Text modifiers={[font({ design: 'monospaced', size: 9 }), foregroundStyle('#FFFFFFB3'), lineLimit(1)]}>
          {meta}
        </Text>
      </VStack>
    </ZStack>
  );
};

export default createWidget<OnThisDayProps>('OnThisDay', OnThisDay, {
  empty: true,
  id: 0,
  uri: '',
  words: '',
  place: '',
  when: '',
  date: '',
  anniversary: false,
});
