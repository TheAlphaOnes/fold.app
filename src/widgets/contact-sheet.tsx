/**
 * Contact Sheet — your week, or your month, at a glance.
 *
 *   medium: the week as a film strip      large: the month as a calendar
 *   ┌──────────────────────────────┐      ┌──────────────────────────┐
 *   │ THIS WEEK          3/7 kept  │      │ november 2026   12 kept  │
 *   │ [▓][▓][ ][▓][▣ ][  ][  ]     │      │  m  t  w  t  f  s  s     │
 *   │  m  t  w  t  f   s   s       │      │ [▓][▓][3][▓][5][▓][7]    │
 *   └──────────────────────────────┘      │ ...                      │
 *                                         └──────────────────────────┘
 * A day with a photo shows it; a day with only words shows a small ink
 * mark; a day not yet come is a faint outline; today wears the accent
 * ring. Each past day opens itself in the Time Machine.
 *
 * Runs in the widget's isolated runtime: no hooks, no imports beyond Expo
 * UI, nothing at module scope.
 */

import { HStack, Image, Link, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
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
  kerning,
  resizable,
  strokeBorder,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { SheetDay, SheetProps } from '@/widgets/model';

const ContactSheet = (props: SheetProps, environment: WidgetEnvironment) => {
  'widget';

  const p = props ?? { month: '', year: 0, week: [], calendar: [], keptWeek: 0, keptMonth: 0 };
  const dark = environment.colorScheme === 'dark';
  const paper = dark ? '#121212' : '#F5F1EA';
  const well = dark ? '#1E1E1E' : '#E9E4DA';
  const ink = dark ? '#F2F2F2' : '#141414';
  const muted = dark ? '#8C8C8C' : '#77736C';
  const faint = dark ? '#2C2C2C' : '#D9D3C7';
  const accent = dark ? '#FF5A1A' : '#E8620C';
  const large = environment.widgetFamily === 'systemLarge';

  // One frame: the day's photo, its words mark, or an outline for days to come.
  const frameFor = (d: SheetDay, height: number, radius: number, showNumber: boolean) => {
    const face = d.uri ? (
      <Image uiImage={d.uri} modifiers={[resizable(), aspectRatio({ contentMode: 'fill' }), frame({ minWidth: 0, maxWidth: 9999, minHeight: height, maxHeight: height }), clipped(), clipShape('roundedRectangle', radius)]} />
    ) : (
      <ZStack
        modifiers={[
          frame({ minWidth: 0, maxWidth: 9999, minHeight: height, maxHeight: height }),
          background(d.isFuture ? 'clear' : well),
          clipShape('roundedRectangle', radius),
          ...(d.isFuture ? [strokeBorder({ color: faint, style: { lineWidth: 1 } })] : []),
        ]}
      >
        {d.count > 0 ? (
          <Text modifiers={[font({ size: 8 }), foregroundStyle(accent)]}>●</Text>
        ) : showNumber ? (
          <Text modifiers={[font({ design: 'monospaced', size: 9 }), foregroundStyle(d.isFuture ? faint : muted)]}>{String(d.day)}</Text>
        ) : null}
      </ZStack>
    );
    const ringed = d.isToday ? (
      <ZStack modifiers={[strokeBorder({ color: accent, style: { lineWidth: 2 } }), clipShape('roundedRectangle', radius)]}>{face}</ZStack>
    ) : (
      face
    );
    return d.isFuture ? ringed : <Link destination={`fold://time-machine?day=${d.key}`}>{ringed}</Link>;
  };

  if (!large) {
    return (
      <VStack
        alignment="leading"
        spacing={8}
        modifiers={[containerBackground(paper, 'widget'), widgetURL('fold://time-machine'), accessibilityLabel(`This week: ${p.keptWeek} of 7 days kept.`)]}
      >
        <HStack>
          <Text modifiers={[font({ design: 'monospaced', size: 9, weight: 'semibold' }), kerning(1.4), foregroundStyle(accent)]}>THIS WEEK</Text>
          <Spacer />
          <Text modifiers={[font({ design: 'monospaced', size: 9 }), foregroundStyle(muted)]}>{`${p.keptWeek}/7 kept`}</Text>
        </HStack>
        <HStack spacing={5} alignment="top">
          {p.week.map((d) => (
            <VStack key={d.key} spacing={5} modifiers={[frame({ maxWidth: 9999 })]}>
              {frameFor(d, 74, 7, false)}
              <Text modifiers={[font({ design: 'monospaced', size: 9, weight: d.isToday ? 'bold' : 'regular' }), foregroundStyle(d.isToday ? accent : muted)]}>
                {d.letter}
              </Text>
            </VStack>
          ))}
        </HStack>
      </VStack>
    );
  }

  const rows: SheetDay[][] = [];
  for (let i = 0; i < p.calendar.length; i += 7) rows.push(p.calendar.slice(i, i + 7));
  const cell = rows.length > 5 ? 37 : 45;

  return (
    <VStack
      alignment="leading"
      spacing={6}
      modifiers={[containerBackground(paper, 'widget'), widgetURL('fold://time-machine'), accessibilityLabel(`${p.month} ${p.year}: ${p.keptMonth} days kept.`)]}
    >
      <HStack alignment="lastTextBaseline">
        <Text modifiers={[font({ design: 'serif', size: 20 }), foregroundStyle(ink)]}>{p.month}</Text>
        <Text modifiers={[font({ design: 'monospaced', size: 10 }), foregroundStyle(muted)]}>{String(p.year)}</Text>
        <Spacer />
        <Text modifiers={[font({ design: 'monospaced', size: 9, weight: 'semibold' }), kerning(1), foregroundStyle(accent)]}>
          {`${p.keptMonth} KEPT`}
        </Text>
      </HStack>
      <HStack spacing={4}>
        {(p.week.length === 7 ? p.week : rows[0] ?? []).map((d, i) => (
          <Text key={i} modifiers={[frame({ maxWidth: 9999 }), font({ design: 'monospaced', size: 9 }), foregroundStyle(muted)]}>
            {d.letter}
          </Text>
        ))}
      </HStack>
      {rows.map((row, r) => (
        <HStack key={r} spacing={4}>
          {row.map((d) =>
            d.inMonth ? (
              <VStack key={d.key} modifiers={[frame({ maxWidth: 9999 })]}>
                {frameFor(d, cell, 6, true)}
              </VStack>
            ) : (
              <VStack key={d.key} modifiers={[frame({ minWidth: 0, maxWidth: 9999, minHeight: cell, maxHeight: cell })]}><Spacer /></VStack>
            ),
          )}
        </HStack>
      ))}
    </VStack>
  );
};

export default createWidget<SheetProps>('ContactSheet', ContactSheet, {
  month: '',
  year: 0,
  week: [],
  calendar: [],
  keptWeek: 0,
  keptMonth: 0,
});
