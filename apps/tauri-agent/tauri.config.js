import { defineConfig } from '@tauri-apps/cli';

export default defineConfig({
  beforeDevCommand: 'pnpm dev',
  beforeBuildCommand: 'pnpm build',
  frontendDist: '../dist',
  devUrl: 'http://localhost:1420',
  bundle: {
    active: true,
    targets: 'all',
    icon: [
      'icons/32x32.png',
      'icons/128x128.png',
      'icons/128x128@2x.png',
      'icons/icon.ico',
      'icons/icon.png',
    ],
  },
});
