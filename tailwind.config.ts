import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:     '#080c08',
        bg2:    '#0d110d',
        bg3:    '#141a14',
        card:   '#111611',
        border: '#1e2a1e',
        green: {
          DEFAULT: '#3dff6e',
          2:       '#2fb344',
        },
        gold:   '#f5c842',
        orange: '#ff6b35',
        red:    '#e83b3b',
        blue:   '#3b82f6',
        text:   '#edfaee',
        muted:  '#6a8a6a',
      },
      fontFamily: {
        display: ["'Fredoka One'", 'cursive'],
        body:    ["'DM Sans'", 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '16px',
      },
      boxShadow: {
        green:  '0 0 8px #3dff6e, 0 0 20px rgba(61,255,110,.35)',
        gold:   '0 0 8px #f5c842, 0 0 20px rgba(245,200,66,.35)',
        border: '0 0 6px rgba(61,255,110,.2)',
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateX(-50%) translateY(100%)' },
          to:   { transform: 'translateX(-50%) translateY(0)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%,100%': { transform: 'translateX(-100%)' },
          '50%':     { transform: 'translateX(100%)' },
        },
        skeletonShimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulse: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '.6' },
        },
      },
      animation: {
        slideUp:         'slideUp .3s ease',
        fadeInUp:        'fadeInUp .35s ease both',
        shimmer:         'shimmer 3s ease-in-out infinite',
        skeletonShimmer: 'skeletonShimmer 1.6s ease-in-out infinite',
        marquee:         'marquee 18s linear infinite',
        pulse:           'pulse 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
