import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0faff',
          100: '#e0f4fe',
          200: '#b9eafd',
          300: '#7cdbfb',
          400: '#36c8f6',
          500: '#0cb0e0',
          600: '#0090be',
          700: '#01739a',
          800: '#06607f',
          900: '#0b4f6a',
          950: '#073347',
        },
      },
    },
  },
  plugins: [],
};

export default config;
