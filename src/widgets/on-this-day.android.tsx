/**
 * On This Day — Android's half. Android widgets can't fade a photo, so the
 * memory is set as a print: the photo above, a solid caption strip below
 * with what it is, how long ago, and when. Words-only memories are set in
 * type on paper. The whole widget is one tap target that opens the memory.
 *
 * Runs in the widget's isolated runtime: no hooks, no imports beyond Expo
 * UI, nothing at module scope.
 */

import { Button, Column, Image, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, fillMaxSize, fillMaxWidth, height, padding } from '@expo/ui/jetpack-compose/modifiers';
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
  const kicker = p.anniversary ? 'ON THIS DAY' : 'FROM YOUR PAST';
  const meta = p.place ? `${p.date} · ${p.place}` : p.date;

  if (p.empty) {
    return (
      <Column modifiers={[background(paper), fillMaxSize(), padding(16, 16, 16, 16)]}>
        <Text style={{ fontSize: 9, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1.4 }} color={accent}>ON THIS DAY</Text>
        <Spacer modifiers={[height(10)]} />
        <Text style={{ fontSize: 17, fontFamily: 'serif' }} color={ink} maxLines={3}>what you keep today comes back here</Text>
        <Text style={{ fontSize: 9, fontFamily: 'monospace' }} color={muted}>a year from now</Text>
      </Column>
    );
  }

  return (
    <Button colors={{ containerColor: paper, contentColor: ink }} modifiers={[fillMaxSize()]}>
      <Column modifiers={[background(paper), fillMaxSize()]}>
        {p.uri ? (
          <Image source={{ uri: p.uri }} contentScale="crop" modifiers={[fillMaxWidth(), height(110)]} />
        ) : (
          <Column modifiers={[fillMaxWidth(), height(110), padding(16, 16, 16, 0)]}>
            <Text style={{ fontSize: 16, fontFamily: 'serif' }} color={ink} maxLines={4}>{`“${p.words}”`}</Text>
          </Column>
        )}
        <Column modifiers={[fillMaxWidth(), padding(14, 10, 14, 10)]}>
          <Text style={{ fontSize: 8, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1.4 }} color={accent}>{kicker}</Text>
          <Text style={{ fontSize: 15, fontWeight: '600' }} color={ink} maxLines={1}>{p.when}</Text>
          <Text style={{ fontSize: 9, fontFamily: 'monospace' }} color={muted} maxLines={1}>{meta}</Text>
        </Column>
      </Column>
    </Button>
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
