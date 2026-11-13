/**
 * Today — Android's half. The same question as iOS: has anything been kept
 * today? Not yet: the day's line, the streak at stake and the orange key.
 * Kept: today's photo as a print with the streak beside it. Android has no
 * timelines, so it updates each time the app syncs. One tap target: the
 * memory when kept, home (today's camera) when not.
 *
 * Runs in the widget's isolated runtime: no hooks, no imports beyond Expo
 * UI, nothing at module scope.
 */

import { Box, Button, Column, Image, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, fillMaxWidth, height, padding } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { TodayProps } from '@/widgets/model';

const Today = (props: TodayProps, environment: WidgetEnvironment) => {
  'widget';

  const p = props ?? { kept: false, id: 0, uri: '', words: '', count: 0, streak: 0, best: 0, line: 'today', endsAt: 0 };
  const dark = environment.colorScheme === 'dark';
  const paper = dark ? '#121212' : '#F5F1EA';
  const ink = dark ? '#F2F2F2' : '#141414';
  const muted = dark ? '#8C8C8C' : '#77736C';
  const accent = dark ? '#FF5A1A' : '#E8620C';
  const streak = String(p.streak).padStart(2, '0');

  const header = (label: string) => (
    // Glance has no weights or space-between: the label sits start in a
    // full-width box, and the streak is aligned to the end over it.
    <Box contentAlignment="centerEnd" modifiers={[fillMaxWidth()]}>
      <Box contentAlignment="centerStart" modifiers={[fillMaxWidth()]}>
        <Text style={{ fontSize: 9, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1.4 }} color={accent}>{label}</Text>
      </Box>
      <Text style={{ fontSize: 11, fontWeight: '700', fontFamily: 'monospace' }} color={p.streak > 0 ? accent : muted}>{`● ${streak}`}</Text>
    </Box>
  );

  if (p.kept) {
    return (
      <Button colors={{ containerColor: paper, contentColor: ink }} modifiers={[fillMaxSize()]}>
        <Column modifiers={[background(paper), fillMaxSize()]}>
          {p.uri ? (
            <Image source={{ uri: p.uri }} contentScale="crop" modifiers={[fillMaxWidth(), height(96)]} />
          ) : (
            <Column modifiers={[fillMaxWidth(), height(96), padding(14, 14, 14, 0)]}>
              <Text style={{ fontSize: 14, fontFamily: 'serif' }} color={ink} maxLines={3}>{p.words ? `“${p.words}”` : p.line}</Text>
            </Column>
          )}
          <Column modifiers={[fillMaxWidth(), padding(14, 9, 14, 9)]}>
            {header('KEPT TODAY')}
            <Text style={{ fontSize: 14, fontWeight: '600' }} color={ink}>{p.count === 1 ? '1 memory' : `${p.count} memories`}</Text>
          </Column>
        </Column>
      </Button>
    );
  }

  return (
    <Button colors={{ containerColor: paper, contentColor: ink }} modifiers={[fillMaxSize()]}>
      <Column modifiers={[background(paper), fillMaxSize(), padding(15, 15, 15, 15)]}>
        {header('TODAY')}
        <Spacer modifiers={[height(14)]} />
        <Text style={{ fontSize: 18, fontFamily: 'serif' }} color={ink} maxLines={2}>{p.line}</Text>
        <Text style={{ fontSize: 10, fontFamily: 'monospace' }} color={muted}>{p.streak > 0 ? `${p.streak}-day streak at stake` : 'start a streak today'}</Text>
        <Spacer modifiers={[height(12)]} />
        <Box contentAlignment="center" modifiers={[fillMaxWidth(), height(30), background(accent), cornerRadius(15)]}>
          <Text style={{ fontSize: 10, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1.2 }} color="#FFFFFF">KEEP ONE</Text>
        </Box>
      </Column>
    </Button>
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
