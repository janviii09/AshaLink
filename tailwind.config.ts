import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#E6F3FF',
          100: '#CCE6FF',
          200: '#99CEFF',
          300: '#66B5FF',
          400: '#339DFF',
          500: '#0084FF',
          600: '#006ACC',
          700: '#005199',
          800: '#003766',
          900: '#001E33',
        },
        teal: {
          400: '#4ECDC4',
          500: '#26A69A',
        }
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
};

export default config;