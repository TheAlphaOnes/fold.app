/**
 * Today — has anything been kept today? The one widget meant to change what
 * you do, on the home screen and the lock screen.
 *
 *   not yet                       kept
 *   ┌────────────────┐            ┌────────────────┐
 *   │ TODAY      ● 04│            │          ● 05  │   today's memory,
 *   │                │            │     photo      │   full-bleed, with
 *   │ golden hour,   │            │▒ KEPT TODAY    │   the streak riding
 *   │ almost         │            │▒ 2 memories    │   in the corner
 *   │ 4 hr, 12 min   │            └────────────────┘
 *   │ [ keep one   ] │
 *   └────────────────┘
 *
 * The hours left count down live (a SwiftUI relative date, no timeline
 * entries needed); the timeline itself turns the day line and, at
 * midnight, the page. Lock screen: a ring that closes once today is kept,
 * around the streak; a two-line status; an inline line.
 *
 * Runs in the widget's isolated runtime: no hooks, no imports beyond Expo
 * UI, nothing at module scope.
 */

import { Gauge, HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  aspectRatio,
  background,
  clipShape,
  clipped,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  kerning,
  lineLimit,
  padding,
  resizable,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { TodayProps } from '@/widgets/model';

const Today = (props: TodayProps, environment: WidgetEnvironment) => {
  'widget';

  const p = props ?? { kept: false, id: 0, uri: '', words: '', count: 0, streak: 0, best: 0, line: 'today', endsAt: 0 };
  const family = environment.widgetFamily;
  const dark = environment.colorScheme === 'dark';
  const paper = dark ? '#121212' : '#F5F1EA';
  const ink = dark ? '#F2F2F2' : '#141414';
  const muted = dark ? '#8C8C8C' : '#77736C';
  const accent = dark ? '#FF5A1A' : '#E8620C';
  const fill = frame({ maxWidth: 9999, maxHeight: 9999 });
  const ends = new Date(p.endsAt);
  const streakLabel = String(p.streak).padStart(2, '0');
  const link = p.kept ? `fold://memory/${p.id}` : 'fold://';
  const said = p.kept
    ? `Kept today. ${p.streak} day streak.`
    : `Nothing kept yet today. ${p.streak > 0 ? `${p.streak} day streak at stake.` : ''}`;

  // ─── Lock screen ───
  if (family === 'accessoryCircular') {
    return (
      <Gauge
        value={p.kept ? 1 : 0}
        modifiers={[gaugeStyle('circularCapacity'), widgetURL(link), accessibilityLabel(said)]}
        currentValueLabel={<Text modifiers={[font({ design: 'rounded', size: 18, weight: 'bold' })]}>{String(p.streak)}</Text>}
      />
    );
  }
  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={1} modifiers={[fill, widgetURL(link), accessibilityLabel(said)]}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>{p.kept ? 'kept today' : 'nothing kept yet'}</Text>
        {p.kept ? (
          <Text modifiers={[font({ size: 12 }), foregroundStyle('secondary')]}>{`${p.streak}-day streak`}</Text>
        ) : (
          <Text date={ends} dateStyle="relative" modifiers={[font({ size: 12 }), foregroundStyle('secondary')]} />
        )}
      </VStack>
    );
  }
  if (family === 'accessoryInline') {
    return <Text modifiers={[widgetURL(link)]}>{p.kept ? `kept today · ${p.streak} days` : `nothing kept yet · ${p.streak} days`}</Text>;
  }

  // The streak chip: an orange dot while the run is alive, the count in mono.
  const streakChip = (onPhoto: boolean) => (
    <HStack spacing={4} modifiers={[padding({ horizontal: 7, vertical: 4 }), background(onPhoto ? '#00000080' : 'clear'), clipShape('capsule')]}>
      <Text modifiers={[font({ size: 7 }), foregroundStyle(p.streak > 0 ? accent : muted)]}>●</Text>
      <Text modifiers={[font({ design: 'monospaced', size: 11, weight: 'bold' }), foregroundStyle(onPhoto ? '#FFFFFF' : ink)]}>{streakLabel}</Text>
    </HStack>
  );

  // ─── Kept: today's memory, with the streak riding on it ───
  if (p.kept) {
    const lines = (
      <VStack alignment="leading" spacing={1}>
        <Text modifiers={[font({ design: 'monospaced', size: 8, weight: 'semibold' }), kerning(1.4), foregroundStyle(accent)]}>KEPT TODAY</Text>
        <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(p.uri ? '#FFFFFF' : ink)]}>
          {p.count === 1 ? '1 memory' : `${p.count} memories`}
        </Text>
      </VStack>
    );
    if (p.uri === '') {
      return (
        <VStack alignment="leading" spacing={0} modifiers={[containerBackground(paper, 'widget'), fill, padding({ all: 15 }), widgetURL(link), accessibilityLabel(said)]}>
          <HStack>
            <Spacer />
            {streakChip(false)}
          </HStack>
          <Spacer />
          <Text modifiers={[font({ design: 'serif', size: 15 }), foregroundStyle(ink), lineLimit(3)]}>{p.words ? `“${p.words}”` : p.line}</Text>
          <Spacer />
          {lines}
        </VStack>
      );
    }
    return (
      <ZStack alignment="bottomLeading" modifiers={[containerBackground('#000000', 'widget'), widgetURL(link), accessibilityLabel(said)]}>
        <Image uiImage={p.uri} modifiers={[resizable(), aspectRatio({ contentMode: 'fill' }), fill, clipped()]} />
        <VStack
          modifiers={[
            fill,
            background({ type: 'linearGradient', colors: ['#00000059', '#00000000', '#00000000', '#000000B3'], startPoint: { x: 0.5, y: 0 }, endPoint: { x: 0.5, y: 1 } }),
          ]}
        ><Spacer /></VStack>
        <VStack alignment="leading" spacing={0} modifiers={[fill, padding({ all: 12 })]}>
          <HStack>
            <Spacer />
            {streakChip(true)}
          </HStack>
          <Spacer />
          {lines}
        </VStack>
      </ZStack>
    );
  }

  // ─── Not yet: the day's line, the hours left, and the key ───
  return (
    <VStack alignment="leading" spacing={0} modifiers={[containerBackground(paper, 'widget'), fill, padding({ all: 15 }), widgetURL(link), accessibilityLabel(said)]}>
      <HStack>
        <Text modifiers={[font({ design: 'monospaced', size: 9, weight: 'semibold' }), kerning(1.4), foregroundStyle(accent)]}>TODAY</Text>
        <Spacer />
        {streakChip(false)}
      </HStack>
      <Spacer />
      <Text modifiers={[font({ design: 'serif', size: 19 }), foregroundStyle(ink), lineLimit(2)]}>{p.line}</Text>
      <HStack spacing={4} modifiers={[padding({ top: 3 })]}>
        <Text date={ends} dateStyle="relative" modifiers={[font({ design: 'monospaced', size: 10 }), foregroundStyle(muted)]} />
        <Text modifiers={[font({ design: 'monospaced', size: 10 }), foregroundStyle(muted)]}>left</Text>
      </HStack>
      <Spacer />
      <HStack modifiers={[frame({ minWidth: 0, maxWidth: 9999, minHeight: 30, maxHeight: 30 }), background(accent), clipShape('capsule')]}>
        <Spacer />
        <Text modifiers={[font({ design: 'monospaced', size: 10, weight: 'bold' }), kerning(1.2), foregroundStyle('#FFFFFF')]}>KEEP ONE</Text>
        <Spacer />
      </HStack>
    </VStack>
  );
};

export default createWidget<TodayProps>('Today', Today, {
  kept: false,
  id: 0,
  uri: '',
  words: '',
  count: 0,
  streak: 0,
  best: 0,
  line: 'today',
  endsAt: 0,
});
