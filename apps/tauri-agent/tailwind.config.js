/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nox: {
          bg: '#101426',
          surface: '#1A2140',
          inset: '#0B1020',
          white: '#F4F5FB',
          muted: 'rgba(255,255,255,0.4)',
          dim: 'rgba(255,255,255,0.2)',
          accent: '#5B72F2',
          accentMuted: 'rgba(91,114,242,0.16)',
          citrus: '#D8F36A',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'monospace'],
        sans: ['Inter', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        ultra: '0.2em',
      },
    },
  },
  plugins: [],
}
