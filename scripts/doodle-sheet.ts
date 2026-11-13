/**
 * Doodle contact sheet — renders a month of the doodle library (or all of
 * it) to a PNG, through the same brush maths the app draws with, so each
 * doodle can be judged without a device.
 *
 *   npx esbuild scripts/doodle-sheet.ts --bundle --platform=node --external:sharp --outfile=/tmp/sheet.js
 *   node /tmp/sheet.js <month 1-12 | all> <out.png> [light]
 */

import sharp from 'sharp';

import { brushStrands, strokePath } from '@/canvas/doodle';
import { DOODLES, MONTH_STARTS, serialOf } from '@/doodles/library';
import { INKS } from '@/doodles/palette';

const CELL = 150;
const COLS = 7;
const PEN = 0.042;
const DRAW = 0.78;

function main(): void {
  const [which = '1', out = 'sheet.png', scheme = 'dark'] = process.argv.slice(2);
  const light = scheme === 'light';
  const bg = light ? '#FFFFFF' : '#121212';
  const text = light ? '#141414' : '#EFEFEF';
  const muted = light ? '#77736C' : '#8C8C8C';

  const month = which === 'all' ? null : Number(which);
  const start = month ? MONTH_STARTS[month - 1] : 0;
  const end = month ? (MONTH_STARTS[month] ?? DOODLES.length) : DOODLES.length;
  const items = DOODLES.slice(start, end).map((d, i) => ({ d, index: start + i }));

  const rows = Math.ceil(items.length / COLS);
  const W = COLS * CELL;
  const H = rows * (CELL + 22) + 20;
  const unit = CELL * DRAW;
  const pen = PEN * unit;

  const cells = items.map(({ d, index }, k) => {
    const cx = (k % COLS) * CELL + CELL / 2;
    const cy = Math.floor(k / COLS) * (CELL + 22) + CELL / 2 + 10;
    const paths = d.strokes.flatMap((s, i) =>
      brushStrands(s.points, PEN, i).map(
        (strand) =>
          `<path d="${strokePath(strand.points, unit, { x: cx, y: cy })}" stroke="${INKS[s.ink] ?? text}" stroke-width="${(pen * strand.width).toFixed(2)}" stroke-opacity="${strand.opacity}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
      ),
    );
    const label = `<text x="${cx}" y="${cy + CELL / 2 + 6}" font-family="Menlo, monospace" font-size="10" fill="${muted}" text-anchor="middle">${serialOf(index)} · ${d.name}</text>`;
    return paths.join('') + label;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="${bg}"/>${cells.join('')}</svg>`;
  sharp(Buffer.from(svg))
    .png()
    .toFile(out)
    .then(() => console.log(`${items.length} doodles → ${out}`))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}

main();
