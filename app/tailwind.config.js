/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0a2540', dark: '#061a2e' },
        accent:  { DEFAULT: '#635bff', dark: '#4f46e5' },
      },
    },
  },
  plugins: [],
};
