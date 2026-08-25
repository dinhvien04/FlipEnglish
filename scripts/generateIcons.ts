import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Pure Node.js uncompressed PNG encoder (zero external dependencies).
 * Generates valid RFC 2083 PNG files with exact pixel dimensions.
 */
function createPng(width: number, height: number, rgbaBuffer: Buffer): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type (6)
  ihdrData.writeUInt8(0, 10); // Compression method (deflate)
  ihdrData.writeUInt8(0, 11); // Filter method (standard)
  ihdrData.writeUInt8(0, 12); // Interlace method (none)
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0 (None)
  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  let scanlineOffset = 0;
  let pixelOffset = 0;

  for (let y = 0; y < height; y++) {
    rawScanlines[scanlineOffset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      rawScanlines[scanlineOffset++] = rgbaBuffer[pixelOffset++]; // R
      rawScanlines[scanlineOffset++] = rgbaBuffer[pixelOffset++]; // G
      rawScanlines[scanlineOffset++] = rgbaBuffer[pixelOffset++]; // B
      rawScanlines[scanlineOffset++] = rgbaBuffer[pixelOffset++]; // A
    }
  }

  const compressedData = zlib.deflateSync(rawScanlines);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function createChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  const crcTarget = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcTarget);
  chunk.writeUInt32BE(crcVal, 8 + length);
  return chunk;
}

/**
 * 7x9 Font Bitmaps for 'F' and 'E' characters.
 * Each character is 7 pixels wide and 9 pixels tall.
 */
const GLYPH_F = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 0, 0],
  [1, 1, 1, 1, 1, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
];

const GLYPH_E = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 0, 0],
  [1, 1, 1, 1, 1, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

/**
 * Draw FE brand icon into RGBA Buffer with antialiasing / supersampling
 * Background: #4f46e5 (Indigo 600 - rgb 79, 70, 229)
 * Foreground: #ffffff (Pure White - rgb 255, 255, 255)
 */
function renderFEIcon(size: number, isMaskable: boolean = false): Buffer {
  const bgR = 79, bgG = 70, bgB = 229; // #4f46e5
  const fgR = 255, fgG = 255, fgB = 255; // white

  const buffer = Buffer.alloc(size * size * 4);

  // Fill opaque background
  for (let i = 0; i < size * size; i++) {
    buffer[i * 4 + 0] = bgR;
    buffer[i * 4 + 1] = bgG;
    buffer[i * 4 + 2] = bgB;
    buffer[i * 4 + 3] = 255;
  }

  // Geometry: For standard icon, FE fills ~55% of the canvas.
  // For maskable icon, FE fills ~40% (kept safely within the 80% safe circle of Android maskable specs).
  const scaleFraction = isMaskable ? 0.38 : 0.54;
  const targetHeight = size * scaleFraction;
  const pixelScale = targetHeight / 9; // 9 rows in glyph

  const glyphW = 7 * pixelScale;
  const glyphH = 9 * pixelScale;
  const gap = 2 * pixelScale;
  const totalW = glyphW * 2 + gap;
  const startX = (size - totalW) / 2;
  const startY = (size - glyphH) / 2;

  // Render glyphs onto the canvas with supersampling
  const samplePoints = 4; // 4x4 subpixels
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let coverage = 0;
      for (let sy = 0; sy < samplePoints; sy++) {
        for (let sx = 0; sx < samplePoints; sx++) {
          const px = x + (sx + 0.5) / samplePoints;
          const py = y + (sy + 0.5) / samplePoints;

          let hit = false;
          // Check F glyph
          if (px >= startX && px < startX + glyphW && py >= startY && py < startY + glyphH) {
            const gx = Math.floor((px - startX) / pixelScale);
            const gy = Math.floor((py - startY) / pixelScale);
            if (gy >= 0 && gy < 9 && gx >= 0 && gx < 7 && GLYPH_F[gy][gx]) {
              hit = true;
            }
          }
          // Check E glyph
          const eStartX = startX + glyphW + gap;
          if (!hit && px >= eStartX && px < eStartX + glyphW && py >= startY && py < startY + glyphH) {
            const gx = Math.floor((px - eStartX) / pixelScale);
            const gy = Math.floor((py - eStartX) / pixelScale);
            if (gy >= 0 && gy < 9 && gx >= 0 && gx < 7 && GLYPH_E[gy][gx]) {
              hit = true;
            }
          }

          if (hit) coverage++;
        }
      }

      if (coverage > 0) {
        const alpha = coverage / (samplePoints * samplePoints);
        const idx = (y * size + x) * 4;
        buffer[idx + 0] = Math.round(bgR * (1 - alpha) + fgR * alpha);
        buffer[idx + 1] = Math.round(bgG * (1 - alpha) + fgG * alpha);
        buffer[idx + 2] = Math.round(bgB * (1 - alpha) + fgB * alpha);
        buffer[idx + 3] = 255;
      }
    }
  }

  return buffer;
}

// Generate directory and icons
const pwaDir = path.join(process.cwd(), 'public', 'pwa');
if (!fs.existsSync(pwaDir)) {
  fs.mkdirSync(pwaDir, { recursive: true });
}

// 1. 192x192 Icon
const icon192Buf = renderFEIcon(192, false);
const png192 = createPng(192, 192, icon192Buf);
fs.writeFileSync(path.join(pwaDir, 'icon-192.png'), png192);

// 2. 512x512 Icon
const icon512Buf = renderFEIcon(512, false);
const png512 = createPng(512, 512, icon512Buf);
fs.writeFileSync(path.join(pwaDir, 'icon-512.png'), png512);

// 3. 512x512 Maskable Icon (safe 40% inner bounding box)
const icon512MaskableBuf = renderFEIcon(512, true);
const png512Maskable = createPng(512, 512, icon512MaskableBuf);
fs.writeFileSync(path.join(pwaDir, 'icon-512-maskable.png'), png512Maskable);

// 4. 180x180 Apple Touch Icon
const appleTouchIconBuf = renderFEIcon(180, false);
const pngAppleTouch = createPng(180, 180, appleTouchIconBuf);
fs.writeFileSync(path.join(pwaDir, 'apple-touch-icon.png'), pngAppleTouch);

console.log('Successfully generated all PWA icons:');
console.log('- public/pwa/icon-192.png (192x192)');
console.log('- public/pwa/icon-512.png (512x512)');
console.log('- public/pwa/icon-512-maskable.png (512x512 maskable)');
console.log('- public/pwa/apple-touch-icon.png (180x180)');
