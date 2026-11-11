/**
 * Memory Ring — the story's own Ring arrangement, on the home screen.
 *
 * The same circle a saved Ring memory uses: `ringSpot`'s radius, scale and
 * wobble, normalized so the ring renders the same at every widget size. A
 * pushed timeline turns the group one photo per entry — WidgetKit cross-fades
 * each step, so the wheel drifts to its next memory rather than snapping,
 * and each photo stays upright while the ring beneath it turns, exactly like
 * the live canvas.
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
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  offset,
  padding,
  resizable,
  rotationEffect,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { RingProps } from '@/widgets/slideshow';

const MemoryRing = (props: RingProps, environment: WidgetEnvironment) => {
  'widget';

  const tiles = props?.tiles ?? [];
  const angle = props?.angle ?? 0;

  // Fold's palette, mirroring src/constants/theme.ts for both schemes.
  const dark = environment.colorScheme === 'dark';
  const paper = dark ? '#0F0F0F' : '#FFFFFF';
  const ink = dark ? '#EFEFEF' : '#000000';
  const muted = dark ? '#BDBDBD' : '#666666';
  const accent = dark ? '#FF4B00' : '#F27A1A';

  const small = environment.widgetFamily === 'systemSmall';
  const width = small ? 158 : 338;
  const height = 158;

  if (tiles.length === 0) {
    return (
      <VStack
        alignment="center"
        spacing={5}
        modifiers={[containerBackground(paper, 'widget'), padding({ all: 14 })]}
      >
        <Text modifiers={[font({ design: 'monospaced', size: 9 }), foregroundStyle(accent)]}>
          the ring
        </Text>
        <Text modifiers={[font({ size: small ? 11 : 13, weight: 'semibold' }), foregroundStyle(ink)]}>
          no memories yet
        </Text>
        <Text modifiers={[font({ size: small ? 9 : 11 }), foregroundStyle(muted)]}>
          fold one and the wheel starts turning
        </Text>
      </VStack>
    );
  }

  // The group's turn, in radians, applied to each photo's place on the
  // wheel; the photos themselves keep only their own wobble, so the ring
  // turns beneath them while they stay upright — the story's motion.
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const photos = tiles.map((tile, index) => {
    const side = Math.max(22, Math.round(tile.size * width));
    const dx = (tile.x - 0.5) * width;
    const dy = (tile.y - 0.5) * height;
    return (
      <Link
        key={index}
        destination={`fold://memory/${tile.id}`}
        modifiers={[
          offset({ x: dx * cos - dy * sin, y: dx * sin + dy * cos }),
        ]}
      >
        <Image
          uiImage={tile.uri}
          modifiers={[
            resizable(),
            aspectRatio({ contentMode: 'fill' }),
            frame({ width: side, height: side }),
            clipShape('roundedRectangle', Math.max(4, Math.round(side * 0.14))),
            rotationEffect(tile.rotation),
          ]}
        />
      </Link>
    );
  });

  return (
    <ZStack
      modifiers={[
        containerBackground(paper, 'widget'),
        widgetURL('fold://'),
        accessibilityLabel('Fold ring of memories.'),
      ]}
    >
      {photos}
    </ZStack>
  );
};

export default createWidget<RingProps>('MemoryRing', MemoryRing, { tiles: [], angle: 0 });
