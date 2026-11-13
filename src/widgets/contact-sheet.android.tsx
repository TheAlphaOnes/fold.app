/**
 * Contact Sheet — Android's half: the week as a film strip of seven frames,
 * each day's photo or a mark for words, today ringed in the accent, days to
 * come left as outlines. Every frame is a tap target, in order, so the
 * interaction listener maps the tapped index straight to its day.
 *
 * Runs in the widget's isolated runtime: no hooks, no imports beyond Expo
 * UI, nothing at module scope.
 */

import { Box, Button, Column, Image, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, fillMaxWidth, height, padding, width } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { SheetProps } from '@/widgets/model';

const ContactSheet = (props: SheetProps, environment: WidgetEnvironment) => {
  'widget';

  const p = props ?? { month: '', year: 0, week: [], calendar: [], keptWeek: 0, keptMonth: 0 };
  const dark = environment.colorScheme === 'dark';
  const paper = dark ? '#121212' : '#F5F1EA';
  const well = dark ? '#1E1E1E' : '#E9E4DA';
  const muted = dark ? '#8C8C8C' : '#77736C';
  const faint = dark ? '#2C2C2C' : '#D9D3C7';
  const accent = dark ? '#FF5A1A' : '#E8620C';
  // Seven frames and six gaps fit a 4-cell widget on the narrowest phones.
  const frameW = 34;
  const frameH = 62;
  const gap = 4;

  return (
    <Column modifiers={[background(paper), fillMaxSize(), padding(10, 12, 10, 12)]}>
      {/* Glance has no space-between: label start in a full-width box, count aligned end over it. */}
      <Box contentAlignment="centerEnd" modifiers={[fillMaxWidth()]}>
        <Box contentAlignment="centerStart" modifiers={[fillMaxWidth()]}>
          <Text style={{ fontSize: 9, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1.4 }} color={accent}>THIS WEEK</Text>
        </Box>
        <Text style={{ fontSize: 9, fontFamily: 'monospace' }} color={muted}>{`${p.keptWeek}/7 kept`}</Text>
      </Box>
      <Spacer modifiers={[height(8)]} />
      <Row modifiers={[fillMaxWidth()]} horizontalAlignment="center">
        {p.week.map((d, i) => (
          <Column key={d.key} horizontalAlignment="center" modifiers={[padding(i === 0 ? 0 : gap, 0, 0, 0)]}>
            <Button colors={{ containerColor: 'transparent', contentColor: muted }}>
              {/* Today's ring: an accent mat two points wider than the frame. */}
              <Box contentAlignment="center" modifiers={[width(frameW + 4), height(frameH + 4), background(d.isToday ? accent : paper), cornerRadius(9)]}>
                {d.uri ? (
                  <Image source={{ uri: d.uri }} contentScale="crop" modifiers={[width(frameW), height(frameH), cornerRadius(7)]} />
                ) : (
                  <Box contentAlignment="center" modifiers={[width(frameW), height(frameH), background(d.isFuture ? faint : well), cornerRadius(7)]}>
                    {d.count > 0 ? <Text style={{ fontSize: 8 }} color={accent}>●</Text> : <Text style={{ fontSize: 1 }} color={well}> </Text>}
                  </Box>
                )}
              </Box>
            </Button>
            <Text style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: d.isToday ? '700' : '400' }} color={d.isToday ? accent : muted}>{d.letter}</Text>
          </Column>
        ))}
      </Row>
    </Column>
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
