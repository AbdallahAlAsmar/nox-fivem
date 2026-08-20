const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0F0F14"/>
  <rect x="186" y="200" width="12" height="112" fill="#FFFFFF"/>
  <text x="260" y="288" font-family="'Geist Mono', 'Courier New', monospace" font-size="96" font-weight="500" fill="#FFFFFF" letter-spacing="8">NOX<tspan font-weight="400">.</tspan></text>
  <rect x="186" y="320" width="220" height="2" fill="rgba(255,255,255,0.15)"/>
</svg>`;

const sizes = [16, 32, 48, 64, 128, 256, 512];
const outDir = 'src-tauri/icons';

async function main() {
  // Create icons from SVG
  for (const size of sizes) {
    const pngBuffer = await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toBuffer();
    
    const filename = size === 256 ? 'icon.png' : `${size}x${size}.png`;
    fs.writeFileSync(path.join(outDir, filename), pngBuffer);
    console.log(`Created ${filename} (${pngBuffer.length} bytes)`);
  }

  // Create ICO (Windows icon) with multiple sizes
  const icoBuffers = [];
  for (const size of [16, 32, 48, 64, 128, 256]) {
    const pngBuffer = await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toBuffer();
    icoBuffers.push({ size, buffer: pngBuffer });
  }

  // Build ICO file
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type: 1 = ICO
  icoHeader.writeUInt16LE(icoBuffers.length, 4); // Number of images

  const icoDirEntries = [];
  let dataOffset = 6 + icoBuffers.length * 16;

  for (const { size, buffer } of icoBuffers) {
    const dirEntry = Buffer.alloc(16);
    dirEntry.writeUInt8(size <= 256 ? size : 0, 0); // width
    dirEntry.writeUInt8(size <= 256 ? size : 0, 1); // height
    dirEntry.writeUInt8(0, 2); // Color palette
    dirEntry.writeUInt8(0, 3); // Reserved
    dirEntry.writeUInt16LE(1, 4); // Color planes
    dirEntry.writeUInt16LE(32, 6); // Bits per pixel
    dirEntry.writeUInt32LE(buffer.length, 8); // Size of image data
    dirEntry.writeUInt32LE(dataOffset, 12); // Offset of image data
    icoDirEntries.push(dirEntry);
    dataOffset += buffer.length;
  }

  const ico = Buffer.concat([icoHeader, ...icoDirEntries, ...icoBuffers.map(b => b.buffer)]);
  fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);
  console.log(`Created icon.ico (${ico.length} bytes)`);

  console.log('Done!');
}

main().catch(console.error);
