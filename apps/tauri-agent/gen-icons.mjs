import fs from 'node:fs';

const iconsDir = 'D:/fivem-dev/apps/tauri-agent/src-tauri/icons';
fs.mkdirSync(iconsDir, { recursive: true });

function makeICO(sizes) {
  const entries = [];
  let dataOffset = 6 + sizes.length * 16;

  for (const s of sizes) {
    const bpp = 32;
    const rowBytes = Math.ceil((s * bpp) / 8);
    const imgSize = rowBytes * s;
    entries.push({ size: s, offset: dataOffset, imgSize: 40 + imgSize, rowBytes });
    dataOffset += 40 + imgSize;
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);

  const dirBuf = Buffer.alloc(entries.length * 16);
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const o = i * 16;
    const w = e.size === 256 ? 0 : e.size;
    dirBuf.writeUInt8(w, o);
    dirBuf.writeUInt8(w, o + 1);
    dirBuf.writeUInt8(0, o + 2);
    dirBuf.writeUInt8(0, o + 3);
    dirBuf.writeUInt16LE(1, o + 4);
    dirBuf.writeUInt16LE(32, o + 6);
    dirBuf.writeUInt32LE(e.imgSize, o + 8);
    dirBuf.writeUInt32LE(e.offset, o + 12);
  }

  let result = Buffer.concat([header, dirBuf]);

  for (const e of entries) {
    const s = e.size === 0 ? 256 : e.size;
    const info = Buffer.alloc(40);
    info.writeUInt32LE(40, 0);
    info.writeUInt32LE(s, 4);
    info.writeUInt32LE(s * 2, 8);
    info.writeUInt16LE(1, 12);
    info.writeUInt16LE(32, 14);
    info.writeUInt32LE(0, 16);
    info.writeUInt32LE(e.imgSize - 40, 20);
    info.writeInt32LE(s, 24);
    info.writeInt32LE(s, 28);
    info.writeUInt32LE(0, 32);
    info.writeUInt32LE(0, 36);

    const px = Buffer.alloc(e.rowBytes * s, 0);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const idx = y * e.rowBytes + x * 4;
        px[idx] = 0xFF;
        px[idx + 1] = 0xFF;
        px[idx + 2] = 0xFF;
        px[idx + 3] = 0xFF;
      }
    }
    result = Buffer.concat([result, info, px]);
  }
  return result;
}

const ico = makeICO([16, 32, 48, 64, 128, 256]);
fs.writeFileSync(iconsDir + '/icon.ico', ico);
console.log('Created icon.ico:', ico.length, 'bytes');

// Also write PNG versions
fs.writeFileSync(iconsDir + '/icon.png', ico);
fs.writeFileSync(iconsDir + '/32x32.png', ico);
fs.writeFileSync(iconsDir + '/128x128.png', ico);
fs.writeFileSync(iconsDir + '/128x128@2x.png', ico);
console.log('Done');
