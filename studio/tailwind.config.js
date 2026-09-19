/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          925: '#0B0F19',
          950: '#060911',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
        nepali: {
          green: '#22c55e',
          red: '#ef4444',
          amber: '#f59e0b',
          blue: '#38bdf8',
          purple: '#a855f7',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        devanagari: ['"IBM Plex Sans"', '"Mukta"', 'sans-serif'],
        sans: ['"Inter"', '"IBM Plex Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
