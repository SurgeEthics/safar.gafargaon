import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import opentype from 'opentype.js';

async function generateIcons() {
  console.log('Downloading Hind Siliguri Bold font...');
  const res = await fetch('https://fonts.gstatic.com/s/hindsiliguri/v14/ijwOs5juQtsyLLR5jN4cxBEoRCf_4uE.ttf');
  const buffer = Buffer.from(await res.arrayBuffer());
  const font = opentype.parse(buffer.buffer);

  function createSvg({ size, isMaskable = false, isApple = false }) {
    // 512 coordinate canvas
    const scale = isMaskable ? 0.74 : (isApple ? 0.88 : 0.94);
    const offset = (512 * (1 - scale)) / 2;

    // Text path for Bengali 'সফর'
    const fontSize = 124;
    const glyphPath = font.getPath('সফর', 0, 0, fontSize);
    const bbox = glyphPath.getBoundingBox();
    const textWidth = bbox.x2 - bbox.x1;
    const startX = 256 - textWidth / 2 - bbox.x1;
    const startY = 460;
    const centeredPath = font.getPath('সফর', startX, startY, fontSize);
    const textPathData = centeredPath.toPathData(2);

    // Bengali 'স' road coordinate points scaled by 5.12:
    const roadD1 = 'M 122.88,235.52 C 92.16,174.08 133.12,92.16 225.28,92.16 C 296.96,92.16 327.68,143.36 281.6,194.56 C 230.4,235.52 163.84,245.76 163.84,296.96 L 389.12,296.96';
    const roadD2 = 'M 389.12,87.04 L 389.12,317.44';

    const dashD1 = 'M 122.88,235.52 C 92.16,174.08 133.12,92.16 225.28,92.16 C 296.96,92.16 327.68,143.36 281.6,194.56 C 230.4,235.52 163.84,245.76 163.84,296.96 L 380,296.96';
    const dashD2 = 'M 389.12,105 L 389.12,300';

    return `
    <svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="38%" stop-color="#059669" />
          <stop offset="78%" stop-color="#0f766e" />
          <stop offset="100%" stop-color="#064e3b" />
        </linearGradient>

        <linearGradient id="pinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ff4d4f" />
          <stop offset="100%" stop-color="#dc2626" />
        </linearGradient>

        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#022c22" flood-opacity="0.45" />
        </filter>

        <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#022c22" flood-opacity="0.4" />
        </filter>

        <filter id="textShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#01241c" flood-opacity="0.5" />
        </filter>
      </defs>

      ${isMaskable || isApple ? `
        <!-- Full-bleed background for maskable and Apple Touch icons -->
        <rect width="512" height="512" fill="url(#bgGrad)" />
        <circle cx="480" cy="30" r="240" fill="#ffffff" opacity="0.08" filter="blur(20px)" />
      ` : `
        <!-- Rounded badge background matching app logo squircle -->
        <rect x="18" y="18" width="476" height="476" rx="108" fill="url(#bgGrad)" stroke="#6ee7b7" stroke-width="10" stroke-opacity="0.85" filter="url(#badgeShadow)" />
        <path d="M 28,128 C 28,68 68,28 128,28 L 384,28 C 420,28 452,48 468,78 C 360,95 240,150 140,240 C 60,312 35,400 28,450 Z" fill="#ffffff" opacity="0.07" />
      `}

      <g transform="translate(${offset}, ${offset}) scale(${scale})">
        <!-- Depth Group for highway glyph and pin -->
        <g filter="url(#dropShadow)">
          <!-- Road white base -->
          <path d="${roadD1}" fill="none" stroke="#ffffff" stroke-width="46" stroke-linecap="round" stroke-linejoin="round" />
          <path d="${roadD2}" fill="none" stroke="#ffffff" stroke-width="46" stroke-linecap="round" />

          <!-- Center dashed green lanes -->
          <path d="${dashD1}" fill="none" stroke="#059669" stroke-width="11.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="18 13" />
          <path d="${dashD2}" fill="none" stroke="#059669" stroke-width="11.2" stroke-linecap="round" stroke-dasharray="18 13" />

          <!-- Map Pin (📍) at apex (225.28, 61.44) -->
          <g transform="translate(225.28, 61.44)" filter="url(#textShadow)">
            <path d="M 0,-56 C -30.7,-56 -53.8,-33.3 -53.8,-2.6 C -53.8,28.2 0,66.6 0,66.6 C 0,66.6 53.8,28.2 53.8,-2.6 C 53.8,-33.3 30.7,-56 0,-56 Z" fill="url(#pinGrad)" stroke="#ffffff" stroke-width="9" />
            <circle cx="0" cy="-7.7" r="16.4" fill="#ffffff" />
          </g>

          <!-- Origin Vehicle Blue Dot at (122.88, 235.52) -->
          <circle cx="122.88" cy="235.52" r="19.5" fill="#0284c7" stroke="#ffffff" stroke-width="8.2" />
        </g>

        <!-- Bengali Text 'সফর' - Bold, clean vector shape -->
        <g filter="url(#textShadow)">
          <path d="${textPathData}" fill="#ffffff" />
        </g>
      </g>
    </svg>
    `;
  }

  const publicDir = path.resolve(process.cwd(), 'public');

  console.log('Rendering 512x512 PWA icon...');
  const svg512 = createSvg({ size: 512, isMaskable: false });
  await sharp(Buffer.from(svg512))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  console.log('Rendering 512x512 Maskable PWA icon (with safe zone)...');
  const svgMaskable = createSvg({ size: 512, isMaskable: true });
  await sharp(Buffer.from(svgMaskable))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  console.log('Rendering 192x192 PWA icon...');
  await sharp(Buffer.from(svg512))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  console.log('Rendering Apple Touch Icon (180x180)...');
  const svgApple = createSvg({ size: 512, isApple: true });
  await sharp(Buffer.from(svgApple))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('Rendering Favicon (48x48 PNG / ICO)...');
  await sharp(Buffer.from(svg512))
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('Rendering public/icon.svg for browser tab vector support...');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg512);

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
