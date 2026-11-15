/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Assistant"', 'sans-serif'],
        kids: ['"Assistant"', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        'card-lg': '28px',
      },
      boxShadow: {
        card: '0 10px 15px -3px rgba(0, 0, 0, 0.04)',
        float: '0 20px 50px -34px rgba(15, 23, 42, 0.28)',
        modal: '0 30px 80px -36px rgba(15, 23, 42, 0.45)',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.94)', opacity: '0.6' },
          '60%': { transform: 'scale(1.03)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        'fade-slide-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-16px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(180px) rotate(360deg)', opacity: '0' },
        },
      },
      animation: {
        pop: 'pop 0.35s ease-out',
        shake: 'shake 0.4s ease-in-out',
        'fade-slide-in': 'fade-slide-in 0.25s ease-out',
        'confetti-fall': 'confetti-fall 1.4s ease-in forwards',
      },
    },
  },
  plugins: [],
}
