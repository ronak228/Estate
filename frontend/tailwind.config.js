/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          50: '#EEEEFF',
          100: '#E0DFFD',
          200: '#C4C3FB',
          300: '#A8A7F9',
          400: '#8C8AF7',
          500: '#4F46E5',
          600: '#3730C3',
          700: '#2820A1',
          800: '#1A147F',
          900: '#0C085D',
        },
        secondary: {
          DEFAULT: '#0EA5E9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundColor: {
        app: '#F8FAFC',
      },
    },
  },
  plugins: [],
};
