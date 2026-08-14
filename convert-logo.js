const fs = require('fs');
const sharp = require('sharp');

async function convert() {
  try {
    const svgBuffer = fs.readFileSync('assets/logo.svg');
    await sharp(svgBuffer)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // completely transparent
      })
      .png()
      .toFile('assets/fold-logo.png');
    console.log('Successfully created fold-logo.png');
  } catch (error) {
    console.error('Error converting SVG:', error);
  }
}
convert();
