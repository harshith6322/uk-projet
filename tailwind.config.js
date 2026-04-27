/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        grove: {
          50:  '#f0f7ef',
          100: '#d9ecd7',
          200: '#b2d9ae',
          300: '#80bc7b',
          400: '#52a04d',
          500: '#2d7a27',
          600: '#2d5a27',
          700: '#1e4019',
          800: '#142b11',
          900: '#0a160a',
        },
        cream: {
          50:  '#fffdf9',
          100: '#fef8f0',
          200: '#f8f0e3',
          300: '#f0e4d0',
          400: '#e2ccb0',
          500: '#c8a882',
        },
        bark: {
          400: '#8a7a6a',
          500: '#5a4a3a',
          600: '#3a2a1a',
          700: '#2a1a0a',
          800: '#1a0a00',
          900: '#0f0500',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pop': 'pop 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pop: { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.12)' }, '100%': { transform: 'scale(1)' } },
      }
    },
  },
  plugins: [],
}
