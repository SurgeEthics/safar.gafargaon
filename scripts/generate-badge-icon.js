import zlib from 'zlib';
import fs from 'fs';
import path from 'path';

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function createPng(width, height, getPixel) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const raw = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // Filter 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Distance from point to line segment
function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// Distance to quadratic bezier curve
function distToBezier(px, py, x0, y0, x1, y1, x2, y2) {
  let minDist = 99999;
  const steps = 30;
  let prevX = x0, prevY = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const curX = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x1 + t * t * x2;
    const curY = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y2;
    const d = distToSegment(px, py, prevX, prevY, curX, curY);
    if (d < minDist) minDist = d;
    prevX = curX;
    prevY = curY;
  }
  return minDist;
}

function renderBadgePng(size) {
  const scale = size / 96;
  const strokeW = 8.5 * scale;

  return createPng(size, size, (x, y) => {
    const sx = x / scale;
    const sy = y / scale;

    // Center in 96x96 space
    // 1. Road curve 1 (left loop of 'স')
    const d1 = distToBezier(sx, sy, 22, 48, 14, 22, 42, 20);
    // 2. Road curve 2 (top-right curve of 'স')
    const d2 = distToBezier(sx, sy, 42, 20, 68, 20, 58, 38);
    // 3. Road curve 3 (downwards into loop of 'স')
    const d3 = distToBezier(sx, sy, 58, 38, 44, 52, 34, 58);
    // 4. Horizontal base road bar: (34, 58) to (76, 58)
    const d4 = distToSegment(sx, sy, 34, 58, 76, 58);
    // 5. Vertical right road bar: (76, 22) to (76, 68)
    const d5 = distToSegment(sx, sy, 76, 22, 76, 68);

    const minRoadDist = Math.min(d1, d2, d3, d4, d5);

    // 6. Location Pin at (44, 13)
    const pinX = 44, pinY = 13;
    const pinHeadDist = Math.hypot(sx - pinX, sy - pinY);
    let inPin = false;
    if (pinHeadDist <= 11) {
      // Pin center hole: radius 3.8
      if (pinHeadDist > 3.8) {
        inPin = true;
      }
    } else if (sy >= pinY && sy <= pinY + 14) {
      // Pin bottom triangle tip
      const prog = (sy - pinY) / 14;
      const wAtY = (1 - prog) * 11;
      if (Math.abs(sx - pinX) <= wAtY) {
        inPin = true;
      }
    }

    // Anti-aliasing alpha calculation
    let alpha = 0;
    if (minRoadDist <= strokeW / 2) {
      const edge = (strokeW / 2) - minRoadDist;
      alpha = Math.max(alpha, Math.min(1, edge + 0.5));
    }
    if (inPin) {
      alpha = 1.0;
    }

    if (alpha <= 0.02) {
      return [0, 0, 0, 0]; // 100% transparent background
    }

    const aByte = Math.round(Math.min(1, alpha) * 255);
    // Pure white silhouette (#ffffff) for Android monochrome status bar tinting
    return [255, 255, 255, aByte];
  });
}

const p96 = renderBadgePng(96);
fs.writeFileSync('public/notification-badge-96.png', p96);
fs.writeFileSync('public/notification-badge.png', p96);

const p72 = renderBadgePng(72);
fs.writeFileSync('public/notification-badge-72.png', p72);

console.log('Successfully generated public/notification-badge-96.png & 72.png with pure transparent alpha mask!');
