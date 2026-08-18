/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nox: {
          bg: '#0F0F14',
          surface: '#16161E',
          inset: '#0A0A0F',
          white: '#FFFFFF',
          muted: 'rgba(255,255,255,0.4)',
          dim: 'rgba(255,255,255,0.2)',
          accent: '#5E6AD2',
          accentMuted: 'rgba(94,106,210,0.15)',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        ultra: '0.2em',
      },
    },
  },
  plugins: [],
}
