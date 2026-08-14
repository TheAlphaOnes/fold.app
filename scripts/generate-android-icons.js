const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BASE_DIR = '/Users/vishnu_mac/Desktop/room/test/Fold';
const SOURCE_LOGO = path.join(BASE_DIR, 'assets/fold-logo.png');
const IMAGES_DIR = path.join(BASE_DIR, 'assets/images');

const BG_COLOR = { r: 250, g: 250, b: 247, alpha: 1 }; // #FAFAF7
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function generateIcons() {
  console.log('Generating Android icon assets from:', SOURCE_LOGO);

  if (!fs.existsSync(SOURCE_LOGO)) {
    throw new Error(`Source logo not found at ${SOURCE_LOGO}`);
  }

  // Ensure output directory exists
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // Trim the source crane image to its bounding box
  const trimmedLogoBuffer = await sharp(SOURCE_LOGO).trim().toBuffer();
  const trimmedMeta = await sharp(trimmedLogoBuffer).metadata();
  console.log(`Trimmed crane bounds: ${trimmedMeta.width}x${trimmedMeta.height}`);

  const results = [];

  // 1. android-icon-foreground.png (432x432, centered, 65% scale, transparent bg)
  const fgCanvasSize = 432;
  const fgTargetScale = 0.65;
  const fgTargetDim = Math.round(fgCanvasSize * fgTargetScale); // 281px

  const fgCrane = await sharp(trimmedLogoBuffer)
    .resize(fgTargetDim, fgTargetDim, { fit: 'inside' })
    .toBuffer({ resolveWithObject: true });

  const fgPath = path.join(IMAGES_DIR, 'android-icon-foreground.png');
  await sharp({
    create: {
      width: fgCanvasSize,
      height: fgCanvasSize,
      channels: 4,
      background: TRANSPARENT
    }
  })
    .composite([{
      input: fgCrane.data,
      left: Math.round((fgCanvasSize - fgCrane.info.width) / 2),
      top: Math.round((fgCanvasSize - fgCrane.info.height) / 2)
    }])
    .png()
    .toFile(fgPath);
  results.push({ name: 'android-icon-foreground.png', path: fgPath, size: `${fgCanvasSize}x${fgCanvasSize}`, craneDim: `${fgCrane.info.width}x${fgCrane.info.height}` });

  // 2. android-icon-monochrome.png (432x432, grayscale crane, centered, 65% scale, transparent bg)
  const monoCrane = await sharp(trimmedLogoBuffer)
    .resize(fgTargetDim, fgTargetDim, { fit: 'inside' })
    .grayscale()
    .toBuffer({ resolveWithObject: true });

  const monoPath = path.join(IMAGES_DIR, 'android-icon-monochrome.png');
  await sharp({
    create: {
      width: fgCanvasSize,
      height: fgCanvasSize,
      channels: 4,
      background: TRANSPARENT
    }
  })
    .composite([{
      input: monoCrane.data,
      left: Math.round((fgCanvasSize - monoCrane.info.width) / 2),
      top: Math.round((fgCanvasSize - monoCrane.info.height) / 2)
    }])
    .png()
    .toFile(monoPath);
  results.push({ name: 'android-icon-monochrome.png', path: monoPath, size: `${fgCanvasSize}x${fgCanvasSize}`, craneDim: `${monoCrane.info.width}x${monoCrane.info.height}` });

  // 3. android-icon-background.png (432x432, solid #FAFAF7)
  const bgPath = path.join(IMAGES_DIR, 'android-icon-background.png');
  await sharp({
    create: {
      width: 432,
      height: 432,
      channels: 4,
      background: BG_COLOR
    }
  })
    .png()
    .toFile(bgPath);
  results.push({ name: 'android-icon-background.png', path: bgPath, size: '432x432', craneDim: 'N/A (solid #FAFAF7)' });

  // 4. icon.png (1024x1024, crane centered on #FAFAF7 background)
  const iconCanvasSize = 1024;
  const iconTargetDim = Math.round(iconCanvasSize * 0.65); // 666px
  const iconCrane = await sharp(trimmedLogoBuffer)
    .resize(iconTargetDim, iconTargetDim, { fit: 'inside' })
    .toBuffer({ resolveWithObject: true });

  const iconPath = path.join(IMAGES_DIR, 'icon.png');
  await sharp({
    create: {
      width: iconCanvasSize,
      height: iconCanvasSize,
      channels: 4,
      background: BG_COLOR
    }
  })
    .composite([{
      input: iconCrane.data,
      left: Math.round((iconCanvasSize - iconCrane.info.width) / 2),
      top: Math.round((iconCanvasSize - iconCrane.info.height) / 2)
    }])
    .png()
    .toFile(iconPath);
  results.push({ name: 'icon.png', path: iconPath, size: `${iconCanvasSize}x${iconCanvasSize}`, craneDim: `${iconCrane.info.width}x${iconCrane.info.height}` });

  // 5. splash-icon.png (200x200, crane on transparent background)
  const splashCanvasSize = 200;
  const splashCrane = await sharp(trimmedLogoBuffer)
    .resize(splashCanvasSize, splashCanvasSize, { fit: 'inside' })
    .toBuffer({ resolveWithObject: true });

  const splashPath = path.join(IMAGES_DIR, 'splash-icon.png');
  await sharp({
    create: {
      width: splashCanvasSize,
      height: splashCanvasSize,
      channels: 4,
      background: TRANSPARENT
    }
  })
    .composite([{
      input: splashCrane.data,
      left: Math.round((splashCanvasSize - splashCrane.info.width) / 2),
      top: Math.round((splashCanvasSize - splashCrane.info.height) / 2)
    }])
    .png()
    .toFile(splashPath);
  results.push({ name: 'splash-icon.png', path: splashPath, size: `${splashCanvasSize}x${splashCanvasSize}`, craneDim: `${splashCrane.info.width}x${splashCrane.info.height}` });

  console.log('\n--- Generated Assets Summary ---');
  for (const item of results) {
    const stats = fs.statSync(item.path);
    const meta = await sharp(item.path).metadata();
    console.log(`✓ ${item.name}: ${meta.width}x${meta.height}, ${stats.size} bytes (crane: ${item.craneDim})`);
  }
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
