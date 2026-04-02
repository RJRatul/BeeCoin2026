/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2D2F3E',
        secondary: '#1E1F2C',
        accent: '#FF6B4A',
        success: '#00D09C',
        danger: '#FF4D4D',
        warning: '#FFB800',
      },
    },
  },
  plugins: [],
}