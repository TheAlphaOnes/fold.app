/**
 * Memory Wall — the profile's "From your past" waterfall, on the home screen.
 *
 * The same deal the profile page uses: photos dealt round-robin into two
 * columns, each cropped to its own height. Medium shows the newest photo of
 * each column; large stands the whole wall up, its tile heights scaled to fit
 * so the waterfall always lands inside the widget.
 *
 * This component runs in the widget's isolated runtime: no hooks, no async,
 * no imports beyond Expo UI, and nothing at module scope. Every value it
 * renders arrives through its props (see `slideshow.ts`), and the palette is
 * restated here because the theme module cannot be imported.
 */

import { HStack, Image, Link, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  aspectRatio,
  background,
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  padding,
  resizable,
  strokeBorder,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
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
  const edge = dark ? '#333333' : '#878787';

  const large = environment.widgetFamily === 'systemLarge';

  if (tiles.length === 0) {
    return (
      <VStack
        alignment="center"
        spacing={5}
        modifiers={[containerBackground(paper, 'widget'), padding({ all: 14 })]}
      >
        <Text modifiers={[font({ design: 'monospaced', size: 9 }), foregroundStyle(accent)]}>
          from your past
        </Text>
        <Text modifiers={[font({ size: large ? 13 : 11, weight: 'semibold' }), foregroundStyle(ink)]}>
          the wall is empty
        </Text>
        <Text modifiers={[font({ size: large ? 11 : 9 }), foregroundStyle(muted)]}>
          fold memories and they pile up here
        </Text>
      </VStack>
    );
  }

  // The wall's frame: two columns the profile's width, tiles cropped to their
  // own heights. The tile heights arrive against the shared column width;
  // here they are rescaled so the wall always fits the family it renders in.
  const margin = 12;
  const gap = 10;
  const columnWidth = 150;
  const perColumn = large ? 3 : 1;
  const budget = (large ? 345 : 158) - margin * 2 - (perColumn - 1) * gap;

  const columns: WallTile[][] = [[], []];
  tiles.forEach((tile) => {
    if (tile.column === 0 || tile.column === 1) columns[tile.column].push(tile);
  });

  // One tile: the photo cropped to its dealt height — or, for a memory with
  // no picture, its one quiet line on a bordered paper tile, the same place
  // the profile's own wall gives it.
  const photo = (tile: WallTile, height: number) => (
    <Link destination={`fold://memory/${tile.id}`}>
      {tile.uri === '' ? (
        <VStack
          alignment="leading"
          spacing={2}
          modifiers={[
            padding({ all: 10 }),
            frame({ width: columnWidth, height }),
            background(paper),
            strokeBorder({ color: edge, style: { lineWidth: 1, dash: [1.6, 1.6], lineCap: 'round' } }),
          ]}
        >
          <Text modifiers={[font({ design: 'monospaced', size: 8 }), foregroundStyle(accent)]}>
            folded words
          </Text>
          <Text
            modifiers={[
              font({ size: 11 }),
              foregroundStyle(ink),
              frame({ maxWidth: columnWidth - 20 }),
            ]}
          >
            {tile.words}
          </Text>
        </VStack>
      ) : (
        <Image
          uiImage={tile.uri}
          modifiers={[
            resizable(),
            aspectRatio({ contentMode: 'fill' }),
            frame({ width: columnWidth, height }),
            clipShape('roundedRectangle', 8),
          ]}
        />
      )}
    </Link>
  );

  const walls = columns.map((column, columnIndex) => {
    const shown = column.slice(0, perColumn);
    // Medium fills its single slot; large scales the column so three tiles
    // and two gaps land exactly on the budget, keeping the waterfall's
    // variety of heights.
    const total = shown.reduce((sum, tile) => sum + tile.height, 0);
    return (
      <VStack key={columnIndex} alignment="center" spacing={gap}>
        {shown.map((tile) =>
          photo(
            tile,
            shown.length === 1 ? budget : Math.max(40, Math.round((tile.height / total) * budget)),
          ),
        )}
      </VStack>
    );
  });

  return (
    <ZStack
      modifiers={[
        containerBackground(paper, 'widget'),
        widgetURL('fold://'),
        accessibilityLabel('Fold wall of memories.'),
      ]}
    >
      <HStack alignment="top" spacing={gap} modifiers={[padding({ all: margin })]}>
        {walls}
      </HStack>
    </ZStack>
  );
};

export default createWidget<WallProps>('MemoryWall', MemoryWall, { tiles: [] });
