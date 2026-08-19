const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <style>@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;700&amp;display=swap');</style>
  </defs>
  <rect width="512" height="512" fill="#0F0F14"/>
  <rect x="226" y="120" width="20" height="176" fill="#FFFFFF"/>
  <text x="256" y="380" font-family="'Geist Mono', 'Courier New', monospace" font-size="120" font-weight="700" fill="#FFFFFF" letter-spacing="12" text-anchor="middle">NOX<tspan font-weight="400" font-size="96">.</tspan></text>
</svg>`;

const sizes = [16, 32, 48, 64, 128, 256];
const outDir = 'src-tauri/icons';

// Write SVG to temp file
const svgPath = path.join(outDir, 'temp.svg');
fs.writeFileSync(svgPath, svg);

try {
  // Create PNGs using ImageMagick convert
  for (const size of sizes) {
    const outPath = path.join(outDir, `${size}x${size}.png`);
    execSync(`convert "${svgPath}" -resize ${size}x${size} "${outPath}"`);
    const stats = fs.statSync(outPath);
    console.log(`Created ${outPath} (${stats.size} bytes)`);
  }

  // Create icon.png (256x256)
  const iconPath = path.join(outDir, 'icon.png');
  execSync(`convert "${svgPath}" -resize 256x256 "${iconPath}"`);
  const stats = fs.statSync(iconPath);
  console.log(`Created icon.png (${stats.size} bytes)`);

  // Create ICO with multiple sizes
  const icoPath = path.join(outDir, 'icon.ico');
  execSync(`magick convert "${svgPath}" -resize "16x16 32x32 48x48 64x64 128x128 256x256" "${icoPath}"`);
  const icoStats = fs.statSync(icoPath);
  console.log(`Created icon.ico (${icoStats.size} bytes)`);

  console.log('Done!');
} finally {
  // Cleanup
  if (fs.existsSync(svgPath)) fs.unlinkSync(svgPath);
}
