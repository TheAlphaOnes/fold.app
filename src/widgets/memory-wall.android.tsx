/**
 * Memory Wall — Android's half of the profile's "From your past" waterfall.
 *
 * The same dealt columns as iOS, but each column is a lazy list, so the
 * wall scrolls on the home screen — Android widgets can carry collections,
 * and a waterfall that scrolls is closer to the profile than a still crop.
 *
 * This component runs in the widget's isolated runtime: no hooks, no async,
 * no imports beyond Expo UI, and nothing at module scope. Every value it
 * renders arrives through its props (see `slideshow.ts`), and the palette is
 * restated here because the theme module cannot be imported.
 */

import {
  Box,
  Button,
  Column,
  Image,
  LazyColumn,
  Row,
  Spacer,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxHeight,
  fillMaxSize,
  height,
  paddingAll,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { WallProps, WallTile } from '@/widgets/slideshow';

const MemoryWall = (props: WallProps, environment: WidgetEnvironment) => {
  'widget';

  const tiles = props?.tiles ?? [];

  // Fold's palette, mirroring src/constants/theme.ts for both schemes.
  const dark = environment.colorScheme === 'dark';
  const paper = dark ? '#0F0F0F' : '#FFFFFF';
  const ink = dark ? '#EFEFEF' : '#000000';
  const muted = dark ? '#BDBDBD' : '#666666';
  const accent = dark ? '#FF4B00' : '#F27A1A';
  const wash = dark ? '#1C1C1C' : '#F4F1EC';

  if (tiles.length === 0) {
    return (
      <Column
        horizontalArrangement="center"
        verticalArrangement="center"
        modifiers={[background(paper), fillMaxSize()]}
      >
        <Text style={{ fontSize: 9, fontWeight: '600' }} color={accent}>
          from your past
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '600' }} color={ink}>
          the wall is empty
        </Text>
        <Text style={{ fontSize: 10 }} color={muted}>
          fold memories and they pile up here
        </Text>
      </Column>
    );
  }

  // The wall's frame: the same two columns the profile deals, at the
  // column width the shared tile heights were computed against, scaled
  // down to the widget's own narrower columns.
  const columnWidth = 112;
  const scale = columnWidth / 150;
  const gap = 6;

  const columns: WallTile[][] = [[], []];
  tiles.forEach((tile) => {
    if (tile.column === 0 || tile.column === 1) columns[tile.column].push(tile);
  });

  const tileHeight = (tile: WallTile) =>
    Math.min(200, Math.max(64, Math.round(tile.height * scale)));

  // One tile: the photo, or — for a memory with no picture — its one quiet
  // line on a washed tile, the same place the profile's own wall gives it.
  const piece = (tile: WallTile) => {
    const h = tileHeight(tile);
    if (tile.uri === '') {
      return (
        <Button colors={{ containerColor: 'transparent', contentColor: ink }}>
          <Box modifiers={[background(wash), cornerRadius(8), height(h), paddingAll(10)]}>
            <Text style={{ fontSize: 8, fontWeight: '600' }} color={accent}>
              folded words
            </Text>
            <Text style={{ fontSize: 11 }} color={ink} maxLines={2} overflow="ellipsis">
              {tile.words}
            </Text>
          </Box>
        </Button>
      );
    }
    return (
      <Button colors={{ containerColor: 'transparent', contentColor: ink }}>
        <Image
          source={{ uri: tile.uri }}
          contentScale="crop"
          modifiers={[width(columnWidth), height(h), cornerRadius(8)]}
        />
      </Button>
    );
  };

  const wall = (index: 0 | 1) => (
    <LazyColumn
      verticalArrangement={{ spacedBy: gap }}
      modifiers={[fillMaxHeight(), width(columnWidth)]}
    >
      {columns[index].map(piece)}
    </LazyColumn>
  );

  return (
    <Row modifiers={[background(paper), fillMaxSize(), paddingAll(6)]}>
      {wall(0)}
      <Spacer modifiers={[width(gap)]} />
      {wall(1)}
    </Row>
  );
};

export default createWidget<WallProps>('MemoryWall', MemoryWall, { tiles: [] });
