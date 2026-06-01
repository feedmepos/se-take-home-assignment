/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0a0a0c',
          800: '#101013',
          700: '#16161b',
          600: '#1d1d24',
          500: '#26262f',
        },
        gold: {
          DEFAULT: '#FFC72C',
          soft: '#FFD968',
          deep: '#E0A800',
        },
        ember: '#DA291C',
        mint: '#3FCF8E',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Outfit Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,199,44,0.4), 0 8px 30px -8px rgba(255,199,44,0.35)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 30px -16px rgba(0,0,0,0.8)',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.85)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-dot': 'pulseDot 1.6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
