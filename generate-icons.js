// Generate simple PNG icons for the extension
// Minimal valid PNG with green circle + play triangle

const fs = require('fs');

function createPNG(size) {
  // Create raw RGBA pixel data
  const pixels = Buffer.alloc(size * size * 4, 0);
  
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.4;
  const innerR = size * 0.15;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= radius) {
        // Inside circle - check if inside play triangle
        // Triangle: left-center, top-right, bottom-right
        const tx = x - (cx - innerR * 0.5);
        const ty = y - cy;
        
        // Simple play triangle check
        const triX1 = cx - innerR * 0.5, triY1 = cy - innerR;
        const triX2 = cx - innerR * 0.5, triY2 = cy + innerR;
        const triX3 = cx + innerR, triY3 = cy;
        
        const inTri = pointInTriangle(x, y, triX1, triY1, triX2, triY2, triX3, triY3);
        
        if (inTri) {
          // White play button
          pixels[idx] = 255;
          pixels[idx + 1] = 255;
          pixels[idx + 2] = 255;
          pixels[idx + 3] = 255;
        } else {
          // Green background (#4CAF50)
          pixels[idx] = 76;
          pixels[idx + 1] = 175;
          pixels[idx + 2] = 80;
          pixels[idx + 3] = 255;
        }
      }
      // Outside circle stays transparent (0,0,0,0)
    }
  }
  
  return encodePNG(size, size, pixels);
}

function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const d1 = sign(px, py, x1, y1, x2, y2);
  const d2 = sign(px, py, x2, y2, x3, y3);
  const d3 = sign(px, py, x3, y3, x1, y1);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}

function sign(px, py, x1, y1, x2, y2) {
  return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
}

function encodePNG(width, height, pixels) {
  // Minimal PNG: signature + IHDR + IDAT + IEND
  const zlib = require('zlib');
  
  // Build raw image data with filter byte (0 = None) per row
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // filter: None
    pixels.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  
  const compressed = zlib.deflateSync(rawData);
  
  // Build chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crc = crc32(crcData);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeB, data, crcB]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icons
fs.writeFileSync('icon48.png', createPNG(48));
fs.writeFileSync('icon128.png', createPNG(128));
console.log('Icons generated: icon48.png, icon128.png');
