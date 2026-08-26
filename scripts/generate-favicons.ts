import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const svgPath = path.join(__dirname, 'icon.svg');

async function main() {
  console.log('Reading SVG icon from:', svgPath);
  
  if (!fs.existsSync(svgPath)) {
    console.error('SVG file does not exist at:', svgPath);
    process.exit(1);
  }

  // Next.js app icons
  const iconPath512 = path.join(__dirname, '../src/app/icon.png');
  const appleTouchIconPath = path.join(__dirname, '../src/app/apple-icon.png');
  const appFaviconPath = path.join(__dirname, '../src/app/favicon.ico');

  // PWA public icons
  const pwaIcon192 = path.join(__dirname, '../public/icon-192.png');
  const pwaIcon512 = path.join(__dirname, '../public/icon-512.png');
  const publicFavicon = path.join(__dirname, '../public/favicon.ico');

  console.log('Generating 512x512 app icon...');
  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(iconPath512);

  console.log('Generating 180x180 Apple touch icon...');
  await sharp(svgPath)
    .resize(180, 180)
    .png()
    .toFile(appleTouchIconPath);

  console.log('Generating 192x192 PWA icon...');
  await sharp(svgPath)
    .resize(192, 192)
    .png()
    .toFile(pwaIcon192);

  console.log('Generating 512x512 PWA icon...');
  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(pwaIcon512);

  console.log('Generating 32x32 favicons...');
  await sharp(svgPath)
    .resize(32, 32)
    .png()
    .toFile(appFaviconPath);

  await sharp(svgPath)
    .resize(32, 32)
    .png()
    .toFile(publicFavicon);

  console.log('All icons generated successfully!');
}

main().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
