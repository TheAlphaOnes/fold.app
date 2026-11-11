/**
 * Memories — a slow slideshow of your own media, on the home screen.
 *
 * One photo at a time, advanced by a pushed timeline: WidgetKit cross-fades
 * every entry change, so the show drifts from one memory to the next even
 * when the app never opens. A tap anywhere opens the memory; the camera
 * plate opens the composer — widgets cannot be swiped, so the affordance is
 * a small, always-there plate instead.
 *
 * This component runs in the widget's isolated runtime: no hooks, no async,
 * no imports beyond Expo UI, and nothing at module scope. Every value it
 * renders arrives through its props (see `slideshow.ts`), and the palette is
 * restated here because the theme module cannot be imported.
 */

import { Image, Link, Text, VStack, ZStack } from '@expo/ui/swift-ui';
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
  padding,
  resizable,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { SlideshowProps } from '@/widgets/slideshow';

const MemoriesSlideshow = (props: SlideshowProps, environment: WidgetEnvironment) => {
  'widget';

  // The system can render the widget before the app has ever pushed a
  // timeline; on that first paint it waits as quietly as an empty journal.
  const slide = props ?? { empty: true, id: 0, uri: '', caption: '', index: 0, total: 0 };

  // Fold's palette, mirroring src/constants/theme.ts for both schemes.
  const dark = environment.colorScheme === 'dark';
  const paper = dark ? '#0F0F0F' : '#FFFFFF';
  const ink = dark ? '#EFEFEF' : '#000000';
  const muted = dark ? '#BDBDBD' : '#666666';
  const accent = dark ? '#FF4B00' : '#F27A1A';

  const small = environment.widgetFamily === 'systemSmall';
  const width = small ? 158 : 338;

  if (slide.empty || slide.uri === '') {
    return (
      <VStack
        alignment="center"
        spacing={5}
        modifiers={[containerBackground(paper, 'widget'), padding({ all: 14 })]}
      >
        <Text modifiers={[font({ design: 'monospaced', size: 9 }), foregroundStyle(accent)]}>
          memories
        </Text>
        <Text modifiers={[font({ size: small ? 11 : 13, weight: 'semibold' }), foregroundStyle(ink)]}>
          nothing folded yet
        </Text>
        <Text
          modifiers={[
            font({ size: small ? 9 : 11 }),
            foregroundStyle(muted),
            frame({ maxWidth: 240 }),
          ]}
        >
          fold one in the app and it lives here
        </Text>
      </VStack>
    );
  }

  // The photo, cropped to fill the whole tile.
  const photo = (
    <Image
      uiImage={slide.uri}
      modifiers={[
        resizable(),
        aspectRatio({ contentMode: 'fill' }),
        frame({ width, height: 158 }),
        clipped(),
      ]}
    />
  );

  // The caption plate: the show's position in the app's serial voice, one
  // quiet line over a paper plate so it reads on any photo.
  const caption = (
    <VStack
      alignment="leading"
      spacing={1}
      modifiers={[
        padding({ horizontal: 9, vertical: 6 }),
        background(paper),
        clipShape('roundedRectangle', 9),
        frame({ maxWidth: 9999, maxHeight: 9999, alignment: 'bottomLeading' }),
        padding({ all: 10 }),
      ]}
    >
      <Text modifiers={[font({ design: 'monospaced', size: 8 }), foregroundStyle(accent)]}>
        {`${String(slide.index).padStart(2, '0')} / ${String(slide.total).padStart(2, '0')}`}
      </Text>
      <Text
        modifiers={[
          font({ size: small ? 10 : 11, weight: 'medium' }),
          foregroundStyle(ink),
          frame({ maxWidth: small ? 120 : 230 }),
        ]}
      >
        {slide.caption}
      </Text>
    </VStack>
  );

  // The camera plate: the widget's answer to "capture one right now".
  const camera = (
    <Link
      destination="fold://compose"
      modifiers={[
        padding({ all: 6 }),
        background(paper),
        clipShape('circle', 0),
        frame({ maxWidth: 9999, maxHeight: 9999, alignment: 'topTrailing' }),
        padding({ all: 10 }),
      ]}
    >
      <Image systemName="camera.fill" color={ink} size={small ? 11 : 13} />
    </Link>
  );

  return (
    <ZStack
      modifiers={[
        containerBackground(paper, 'widget'),
        widgetURL(`fold://memory/${slide.id}`),
        accessibilityLabel(`Fold memory. ${slide.caption}. Camera opens the composer.`),
      ]}
    >
      {photo}
      {caption}
      {camera}
    </ZStack>
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
