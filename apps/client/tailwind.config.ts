import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Slackey', 'cursive'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        scribble: ['Caveat', 'cursive'],
      },
      colors: {
        ink: {
          950: '#0A0815',
          900: '#0E0B1F',
          800: '#161029',
          700: '#1F1738',
          600: '#2B2150',
          500: '#3A2D6B',
          400: '#5A4B8F',
        },
        dank: {
          pink: '#FF6BD6',
          mint: '#A8FFE4',
          sun: '#FFE066',
          sky: '#7CC4FF',
          lilac: '#C8B0FF',
          peach: '#FFAB76',
          lime: '#9DFFB6',
          coral: '#FF7676',
        },
      },
      boxShadow: {
        glow: '0 0 0 2px rgba(255,107,214,0.3), 0 8px 40px -8px rgba(255,107,214,0.5)',
        glowMint: '0 0 0 2px rgba(168,255,228,0.3), 0 8px 40px -8px rgba(168,255,228,0.5)',
        soft: '0 8px 32px -8px rgba(0,0,0,0.5)',
        inset: 'inset 0 2px 0 rgba(255,255,255,0.08), inset 0 -2px 0 rgba(0,0,0,0.4)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'wiggle': 'wiggle 1.5s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
