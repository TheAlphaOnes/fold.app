/**
 * TodaysStamp — the home screen half of the dopamine cycle.
 *
 * One seal, seven day cells, and one number that only grows. Every midnight
 * the app schedules an "unstamped" entry, so each morning the widget is an
 * open, perforated ring; folding a memory fills it orange within seconds.
 *
 * This component runs in the widget's isolated runtime: no hooks, no async,
 * no imports beyond Expo UI, and nothing at module scope. Every value it
 * renders arrives through its props (see `stamp-snapshot.ts`), and the
 * palette is restated here because the theme module cannot be imported.
 */

import { Circle, HStack, Image, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  opacity,
  padding,
  strokeBorder,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { StampSnapshot } from '@/widgets/stamp-snapshot';

const TodaysStamp = (props: StampSnapshot, environment: WidgetEnvironment) => {
  'widget';

  // The system can render the widget before the app has ever pushed a
  // snapshot; on that first paint it shows the same open, waiting day the
  // empty journal would.
  const days = props?.days ?? [];
  const todayClaimed = props?.todayClaimed ?? false;
  const serial = props?.serial ?? 'No. 001';
  const title = props?.title ?? 'today is open';
  const sub = props?.sub ?? 'fold one memory to begin';

  // Fold's palette, mirroring src/constants/theme.ts for both schemes.
  const dark = environment.colorScheme === 'dark';
  const paper = dark ? '#0F0F0F' : '#FFFFFF';
  const ink = dark ? '#EFEFEF' : '#000000';
  const muted = dark ? '#BDBDBD' : '#666666';
  const accent = dark ? '#FF4B00' : '#F27A1A';
  const edge = dark ? '#333333' : '#878787';

  // The day's title takes the accent while it is still an invitation and
  // settles to ink once the day is stamped.
  const titleInk = todayClaimed ? ink : accent;

  // One tap anywhere opens the composer, where a memory is folded.
  const rootModifiers = [
    containerBackground(paper, 'widget'),
    widgetURL('fold://compose'),
    accessibilityLabel(`Fold. ${title}. ${sub}. ${serial}.`),
  ];

  // The seal: filled and claimed, or the dashed ring of an open day.
  const sealSize = environment.widgetFamily === 'systemSmall' ? 34 : 42;
  const seal = todayClaimed ? (
    <Image systemName="seal.fill" color={accent} size={sealSize} />
  ) : (
    <Image systemName="seal" color={edge} size={sealSize} />
  );

  /**
   * One day cell's dot: a filled accent point when the day was folded, a
   * faint fill under a perforated ring when it is open — today slightly
   * larger so the open day finds the eye first.
   */
  const dotFor = (claimed: boolean, isToday: boolean, size: number) => (
    <Circle
      modifiers={[
        frame({ width: size, height: size }),
        foregroundStyle(claimed ? accent : isToday ? accent : edge),
        opacity(claimed ? 1 : isToday ? 0.25 : 0.4),
        ...(claimed
          ? []
          : [
              strokeBorder({
                color: isToday ? accent : edge,
                style: { lineWidth: isToday ? 1.4 : 1, dash: [1.6, 1.6], lineCap: 'round' },
              }),
            ]),
      ]}
    />
  );

  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="center" spacing={7} modifiers={[...rootModifiers, padding({ all: 12 })]}>
        <Text modifiers={[font({ design: 'monospaced', size: 10 }), foregroundStyle(muted)]}>
          {serial}
        </Text>
        {seal}
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(titleInk)]}>
          {title}
        </Text>
        <HStack spacing={4}>
          {days.map((day) => dotFor(day.claimed, day.isToday, day.isToday ? 7 : 5))}
        </HStack>
      </VStack>
    );
  }

  // systemMedium and larger: the seal beside a week of days.
  return (
    <HStack
      alignment="center"
      spacing={18}
      modifiers={[...rootModifiers, padding({ horizontal: 20, vertical: 14 })]}
    >
      <VStack alignment="center" spacing={7}>
        <Text modifiers={[font({ design: 'monospaced', size: 10 }), foregroundStyle(muted)]}>
          {serial}
        </Text>
        {seal}
      </VStack>
      <VStack alignment="leading" spacing={9}>
        <Text modifiers={[font({ size: 16, weight: 'semibold' }), foregroundStyle(titleInk)]}>
          {title}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{sub}</Text>
        <HStack spacing={10}>
          {days.map((day, index) => (
            <VStack key={index} alignment="center" spacing={4}>
              {dotFor(day.claimed, day.isToday, day.isToday ? 13 : 11)}
              <Text
                modifiers={[
                  font({ design: 'monospaced', size: 9 }),
                  foregroundStyle(day.isToday ? ink : muted),
                ]}
              >
                {day.label}
              </Text>
            </VStack>
          ))}
        </HStack>
      </VStack>
    </HStack>
  );
};

export default createWidget<StampSnapshot>('TodaysStamp', TodaysStamp);
