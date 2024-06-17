/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  daisyui: {
    themes: ['light'],
  },
  theme: {
    extend: {
      fontFamily: {
        primary: 'Mulish',
      },
      colors: {
        primary: '#2036a1',
      },
    },
  },
  plugins: [require('daisyui')],
}
