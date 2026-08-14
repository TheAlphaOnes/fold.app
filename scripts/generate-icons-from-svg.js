const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

const SVG_PATH = path.join(__dirname, '..', 'assets', 'logo.svg');
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

async function generate() {
  const svgBuffer = fs.readFileSync(SVG_PATH);

  // 1. fold-logo.png — 1024x1024 transparent (main app icon ref)
  await sharp(svgBuffer, { density: 300 })
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(ASSETS_DIR, 'fold-logo.png'));
  console.log('✓ fold-logo.png (1024x1024 transparent)');

  // 2. android-icon-foreground.png — 432x432, crane at ~65% scale, transparent
  await sharp(svgBuffer, { density: 300 })
    .resize(280, 280, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 76, bottom: 76, left: 76, right: 76, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(IMAGES_DIR, 'android-icon-foreground.png'));
  console.log('✓ android-icon-foreground.png (432x432)');

  // 3. android-icon-monochrome.png — 432x432 grayscale, transparent
  await sharp(svgBuffer, { density: 300 })
    .resize(280, 280, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 76, bottom: 76, left: 76, right: 76, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .grayscale()
    .png()
    .toFile(path.join(IMAGES_DIR, 'android-icon-monochrome.png'));
  console.log('✓ android-icon-monochrome.png (432x432 grayscale)');

  // 4. android-icon-background.png — 432x432 solid #FAFAF7
  await sharp({ create: { width: 432, height: 432, channels: 4, background: { r: 250, g: 250, b: 247, alpha: 1 } } })
    .png()
    .toFile(path.join(IMAGES_DIR, 'android-icon-background.png'));
  console.log('✓ android-icon-background.png (432x432 solid)');

  // 5. icon.png — 1024x1024 crane on #FAFAF7 background (legacy fallback)
  const craneForIcon = await sharp(svgBuffer, { density: 300 })
    .resize(665, 665, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 250, g: 250, b: 247, alpha: 1 } } })
    .composite([{ input: craneForIcon, gravity: 'centre' }])
    .png()
    .toFile(path.join(IMAGES_DIR, 'icon.png'));
  console.log('✓ icon.png (1024x1024 on #FAFAF7)');

  // 6. splash-icon.png — 200x200, transparent
  await sharp(svgBuffer, { density: 300 })
    .resize(200, 200, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(IMAGES_DIR, 'splash-icon.png'));
  console.log('✓ splash-icon.png (200x200 transparent)');

  console.log('\n✅ All icons generated from SVG source!');
}

generate().catch(console.error);
