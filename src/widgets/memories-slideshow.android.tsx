/**
 * Memories — Android's half of the slideshow.
 *
 * The same show as iOS, in Compose: one photo pushed per sync. Android
 * widgets have no timeline, so the sync rotates the slide each time the
 * app runs, and the strip below carries the caption and the camera
 * affordance — RemoteViews cannot overlay a plate on the photo, so the
 * Android translation is an honest stacked strip instead.
 *
 * This component runs in the widget's isolated runtime: no hooks, no async,
 * no imports beyond Expo UI, and nothing at module scope. Every value it
 * renders arrives through its props (see `slideshow.ts`), and the palette is
 * restated here because the theme module cannot be imported.
 */

import { Button, Column, Image, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  fillMaxWidth,
  height,
  padding,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { SlideshowProps } from '@/widgets/slideshow';

const MemoriesSlideshow = (props: SlideshowProps, environment: WidgetEnvironment) => {
  'widget';

  // The system can render the widget before the app has ever pushed a
  // snapshot; on that first paint it waits as quietly as an empty journal.
  const slide = props ?? { empty: true, id: 0, uri: '', caption: '', index: 0, total: 0 };

  // Fold's palette, mirroring src/constants/theme.ts for both schemes.
  const dark = environment.colorScheme === 'dark';
  const paper = dark ? '#0F0F0F' : '#FFFFFF';
  const ink = dark ? '#EFEFEF' : '#000000';
  const muted = dark ? '#BDBDBD' : '#666666';
  const accent = dark ? '#FF4B00' : '#F27A1A';

  if (slide.empty || slide.uri === '') {
    return (
      <Column
        horizontalArrangement="center"
        verticalArrangement="center"
        modifiers={[background(paper), fillMaxSize()]}
      >
        <Text style={{ fontSize: 9, fontWeight: '600' }} color={accent}>
          memories
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '600' }} color={ink}>
          nothing folded yet
        </Text>
        <Text style={{ fontSize: 10 }} color={muted}>
          fold one in the app and it lives here
        </Text>
      </Column>
    );
  }

  return (
    <Column modifiers={[background(paper), fillMaxSize()]}>
      {/* The photo — one tap opens the memory it holds. */}
      <Button
        colors={{ containerColor: paper, contentColor: ink }}
        modifiers={[fillMaxWidth(), height(70)]}
      >
        <Image source={{ uri: slide.uri }} contentScale="crop" modifiers={[fillMaxSize()]} />
      </Button>

      {/* The strip: the show's position and its one quiet line. */}
      <Row modifiers={[padding(10, 9, 10, 0)]}>
        <Text style={{ fontSize: 9, fontWeight: '600' }} color={accent}>
          {`${String(slide.index).padStart(2, '0')} / ${String(slide.total).padStart(2, '0')}`}
        </Text>
        <Spacer modifiers={[width(7)]} />
        <Text style={{ fontSize: 11 }} color={ink} maxLines={1} overflow="ellipsis">
          {slide.caption}
        </Text>
      </Row>

      {/* The camera affordance — widgets cannot be swiped, so a small plate
          answers the "capture one right now" the home screen owes. */}
      <Row modifiers={[padding(9, 0, 9, 9)]}>
        <Button
          colors={{ containerColor: accent, contentColor: paper }}
          contentPadding={{ start: 13, end: 13, top: 5, bottom: 5 }}
          modifiers={[cornerRadius(14)]}
        >
          <Text style={{ fontSize: 10, fontWeight: '600' }} color={paper}>
            + fold
          </Text>
        </Button>
      </Row>
    </Column>
  );
};

export default createWidget<SlideshowProps>('MemoriesSlideshow', MemoriesSlideshow, {
  empty: true,
  id: 0,
  uri: '',
  caption: '',
  index: 0,
  total: 0,
});
