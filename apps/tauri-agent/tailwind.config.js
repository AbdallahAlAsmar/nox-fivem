/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          paper: '#E2DCCE',
          'deep-ink': '#111315',
          vermilion: '#E83708',
          chalk: '#F4F1E9',
          ash: '#68665F',
          carbon: '#202326',
          'graphite-line': '#414548',
          'paper-line': '#B6B0A4',
        },
        nox: {
          bg: '#111315',
          surface: '#202326',
          inset: '#181A1D',
          white: '#F4F1E9',
          muted: 'rgba(244,241,233,0.5)',
          dim: 'rgba(244,241,233,0.2)',
          accent: '#E83708',
          accentMuted: 'rgba(232,55,8,0.16)',
          citrus: '#E83708',
          paper: '#E2DCCE',
          graphite: '#414548',
          carbon: '#202326',
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        sans: ['Inter', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        ultra: '0.2em',
      },
    },
  },
  plugins: [],
}
