import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'assets', 'icons');

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Colors
const BG_COLOR = { r: 26, g: 26, b: 46 };      // #1a1a2e
const ACCENT_COLOR = { r: 78, g: 205, b: 196 }; // #4ecdc4

function crc32(data) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);

  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);

  const crcData = Buffer.concat([Buffer.from(type), data]);
  chunk.writeUInt32BE(crc32(crcData), 8 + length);

  return chunk;
}

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function drawCircle(pixels, width, cx, cy, radius, color, filled = true) {
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const dist = distance(x, y, cx, cy);
      if (filled ? dist <= radius : Math.abs(dist - radius) < 1.5) {
        const idx = (y * width + x) * 4;
        const alpha = filled ? 1 : Math.max(0, 1 - Math.abs(dist - radius) / 1.5);
        pixels[idx] = Math.round(color.r * alpha + pixels[idx] * (1 - alpha));
        pixels[idx + 1] = Math.round(color.g * alpha + pixels[idx + 1] * (1 - alpha));
        pixels[idx + 2] = Math.round(color.b * alpha + pixels[idx + 2] * (1 - alpha));
        pixels[idx + 3] = 255;
      }
    }
  }
}

function drawArc(pixels, width, cx, cy, radius, startAngle, endAngle, thickness, color) {
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const dist = distance(x, y, cx, cy);
      const angle = Math.atan2(y - cy, x - cx);

      // Normalize angles
      let normAngle = angle;
      let normStart = startAngle;
      let normEnd = endAngle;

      // Check if point is within arc angle range
      let inAngle = false;
      if (normStart < normEnd) {
        inAngle = normAngle >= normStart && normAngle <= normEnd;
      } else {
        inAngle = normAngle >= normStart || normAngle <= normEnd;
      }

      if (inAngle && Math.abs(dist - radius) < thickness / 2) {
        const idx = (y * width + x) * 4;
        const alpha = Math.max(0, 1 - Math.abs(dist - radius) / (thickness / 2));
        pixels[idx] = Math.round(color.r * alpha + pixels[idx] * (1 - alpha));
        pixels[idx + 1] = Math.round(color.g * alpha + pixels[idx + 1] * (1 - alpha));
        pixels[idx + 2] = Math.round(color.b * alpha + pixels[idx + 2] * (1 - alpha));
        pixels[idx + 3] = 255;
      }
    }
  }
}

function drawArrowhead(pixels, width, tipX, tipY, angle, size, color) {
  const angle1 = angle + Math.PI * 0.75;
  const angle2 = angle - Math.PI * 0.75;

  const x1 = tipX + Math.cos(angle1) * size;
  const y1 = tipY + Math.sin(angle1) * size;
  const x2 = tipX + Math.cos(angle2) * size;
  const y2 = tipY + Math.sin(angle2) * size;

  // Draw lines from tip to both points
  drawLine(pixels, width, tipX, tipY, x1, y1, size * 0.4, color);
  drawLine(pixels, width, tipX, tipY, x2, y2, size * 0.4, color);
}

function drawLine(pixels, width, x1, y1, x2, y2, thickness, color) {
  const length = distance(x1, y1, x2, y2);
  const steps = Math.ceil(length * 2);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;

    for (let dy = -thickness; dy <= thickness; dy++) {
      for (let dx = -thickness; dx <= thickness; dx++) {
        const px = Math.round(x + dx);
        const py = Math.round(y + dy);
        if (px >= 0 && px < width && py >= 0 && py < width) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= thickness) {
            const idx = (py * width + px) * 4;
            const alpha = Math.max(0, 1 - dist / thickness);
            pixels[idx] = Math.round(color.r * alpha + pixels[idx] * (1 - alpha));
            pixels[idx + 1] = Math.round(color.g * alpha + pixels[idx + 1] * (1 - alpha));
            pixels[idx + 2] = Math.round(color.b * alpha + pixels[idx + 2] * (1 - alpha));
            pixels[idx + 3] = 255;
          }
        }
      }
    }
  }
}

function generateIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);

  // Fill with transparent
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 0;
    pixels[i + 1] = 0;
    pixels[i + 2] = 0;
    pixels[i + 3] = 0;
  }

  const center = size / 2;
  const bgRadius = size * 0.45;
  const arcRadius = size * 0.28;
  const thickness = Math.max(2, size * 0.12);
  const arrowSize = Math.max(3, size * 0.15);

  // Draw background circle
  drawCircle(pixels, size, center, center, bgRadius, BG_COLOR, true);

  // Draw top arc (right to left curve)
  drawArc(pixels, size, center, center, arcRadius, -Math.PI * 0.7, -Math.PI * 0.2, thickness, ACCENT_COLOR);

  // Draw bottom arc (left to right curve)
  drawArc(pixels, size, center, center, arcRadius, Math.PI * 0.3, Math.PI * 0.8, thickness, ACCENT_COLOR);

  // Draw arrowheads
  const topArrowX = center + arcRadius * Math.cos(-Math.PI * 0.2);
  const topArrowY = center + arcRadius * Math.sin(-Math.PI * 0.2);
  drawArrowhead(pixels, size, topArrowX, topArrowY, -Math.PI * 0.2 + Math.PI / 2, arrowSize, ACCENT_COLOR);

  const bottomArrowX = center + arcRadius * Math.cos(Math.PI * 0.8);
  const bottomArrowY = center + arcRadius * Math.sin(Math.PI * 0.8);
  drawArrowhead(pixels, size, bottomArrowX, bottomArrowY, Math.PI * 0.8 + Math.PI / 2, arrowSize, ACCENT_COLOR);

  // Create PNG
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);  // width
  ihdrData.writeUInt32BE(size, 4);  // height
  ihdrData.writeUInt8(8, 8);        // bit depth
  ihdrData.writeUInt8(6, 9);        // color type (RGBA)
  ihdrData.writeUInt8(0, 10);       // compression
  ihdrData.writeUInt8(0, 11);       // filter
  ihdrData.writeUInt8(0, 12);       // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT - image data
  const rawData = [];
  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      rawData.push(pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]);
    }
  }
  const compressed = deflateSync(Buffer.from(rawData), { level: 9 });
  const idat = createChunk('IDAT', compressed);

  // IEND
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const sizes = [16, 48, 128];

for (const size of sizes) {
  const pngData = generateIcon(size);
  const filename = join(iconsDir, `icon${size}.png`);
  writeFileSync(filename, pngData);
  console.log(`Generated ${filename}`);
}

console.log('Icons generated successfully');
