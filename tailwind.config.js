/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        cormorant: ['Cormorant Garamond', 'Georgia', 'serif'],
      },
      colors: {
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F0C040',
          bright: '#FFD700',
          dark: '#B8960C',
        },
        navy: {
          DEFAULT: '#0B1F4E',
          light: '#1A3A8A',
          deep: '#060E2A',
        },
      },
      keyframes: {
        'confetti-fall': {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(200px) rotate(720deg)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212,175,55,0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(212,175,55,0.3)' },
        },
      },
      animation: {
        'confetti-fall': 'confetti-fall 2s ease-in forwards',
        'fade-in': 'fade-in 1s ease forwards',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
