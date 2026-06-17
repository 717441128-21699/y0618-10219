/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        sans: ['Fira Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        detector: {
          tracker: '#4A6FA5',
          sct: '#5C821A',
          trt: '#C46352',
          em: '#9B5DE5',
          had: '#F15BB5',
          muon: '#00BBF9',
          beam: '#00FF88',
        },
        particle: {
          electron: '#00D4FF',
          muon: '#FF4081',
          photon: '#FFD54F',
          jet: '#FF6D00',
          tau: '#B388FF',
          bquark: '#69F0AE',
        },
        panel: {
          bg: '#0D1528',
          inner: '#070B18',
          border: '#2A3352',
          divider: '#1E2742',
          hover: '#1A2340',
        },
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
    },
  },
  plugins: [],
};
