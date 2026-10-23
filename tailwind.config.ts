import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        efb: {
          bg: '#0A0E14',
          panel: '#111823',
          panel2: '#172131',
          line: '#243246',
          text: '#E6EDF5',
          muted: '#8CA0B8',
          cyan: '#2EC8FF',
          green: '#3DDC84',
          amber: '#FFB000',
          red: '#FF4D4D',
          magenta: '#E066FF',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"B612 Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
