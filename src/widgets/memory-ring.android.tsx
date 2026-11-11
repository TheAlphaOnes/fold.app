/**
 * Memory Ring — Android's half of the story's Ring arrangement.
 *
 * The same `ringSpot` geometry the story and the iOS widget use: each
 * photo's normalized position arrives in the props and is mapped to the
 * nearest of Compose's nine alignment anchors, which is the finest
 * placement RemoteViews offers — so the wheel keeps its circle, at the
 * nine points a widget can hold. Android has no timeline, so the ring
 * stands still at angle zero and the sync turns it instead.
 *
 * This component runs in the widget's isolated runtime: no hooks, no async,
 * no imports beyond Expo UI, and nothing at module scope. Every value it
 * renders arrives through its props (see `slideshow.ts`), and the palette is
 * restated here because the theme module cannot be imported.
 */

import { Box, Button, Column, Image, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  size,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { RingProps } from '@/widgets/slideshow';

/** The nine anchors a Compose box can hold content at. */
type Anchor =
  | 'topStart'
  | 'topCenter'
  | 'topEnd'
  | 'centerStart'
  | 'center'
  | 'centerEnd'
  | 'bottomStart'
  | 'bottomCenter'
  | 'bottomEnd';

const MemoryRing = (props: RingProps, environment: WidgetEnvironment) => {
  'widget';

  const tiles = props?.tiles ?? [];

  // Fold's palette, mirroring src/constants/theme.ts for both schemes.
  const dark = environment.colorScheme === 'dark';
  const paper = dark ? '#0F0F0F' : '#FFFFFF';
  const ink = dark ? '#EFEFEF' : '#000000';
  const muted = dark ? '#BDBDBD' : '#666666';
  const accent = dark ? '#FF4B00' : '#F27A1A';

  if (tiles.length === 0) {
    return (
      <Column
        horizontalArrangement="center"
        verticalArrangement="center"
        modifiers={[background(paper), fillMaxSize()]}
      >
        <Text style={{ fontSize: 9, fontWeight: '600' }} color={accent}>
          the ring
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '600' }} color={ink}>
          no memories yet
        </Text>
        <Text style={{ fontSize: 10 }} color={muted}>
          fold one and the wheel starts turning
        </Text>
      </Column>
    );
  }

  // A photo's anchor on the wheel, from its normalized spot: the nearest of
  // the nine places a widget can pin a child. The story's ring positions
  // land on these by construction — top, sides, corners, bottom.
  const anchorFor = (x: number, y: number): Anchor => {
    const dx = x - 0.5;
    const dy = y - 0.5;
    const col = dx > 0.03 ? 'End' : dx < -0.03 ? 'Start' : 'Center';
    const row = dy > 0.03 ? 'bottom' : dy < -0.03 ? 'top' : 'center';
    if (row === 'center' && col === 'Center') return 'center';
    if (row === 'center') return `center${col}` as Anchor;
    if (col === 'Center') return `${row}Center` as Anchor;
    return `${row}${col}` as Anchor;
  };

  // The wheel: each photo sized off the story's sticker base, against the
  // width a medium home cell is granted.
  const photos = tiles.map((tile, index) => {
    const side = Math.max(22, Math.round(tile.size * 240));
    return (
      <Box key={index} contentAlignment={anchorFor(tile.x, tile.y)} modifiers={[fillMaxSize()]}>
        <Button colors={{ containerColor: 'transparent', contentColor: ink }}>
          <Image
            source={{ uri: tile.uri }}
            contentScale="crop"
            modifiers={[size(side, side), cornerRadius(Math.max(4, Math.round(side * 0.14)))]}
          />
        </Button>
      </Box>
    );
  });

  return (
    <Box modifiers={[background(paper), fillMaxSize()]}>
      {photos}
    </Box>
  );
};

export default createWidget<RingProps>('MemoryRing', MemoryRing, { tiles: [], angle: 0 });
