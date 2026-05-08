/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'band-2m': '#3b82f6',
        'band-70cm': '#f59e0b',
        'band-125cm': '#10b981',
        'band-10m': '#ef4444',
        'band-other': '#8b5cf6',
      },
    },
  },
  plugins: [],
}
