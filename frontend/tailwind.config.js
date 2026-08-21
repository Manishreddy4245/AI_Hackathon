/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        txt: {
          primary: '#F8FAFC',
          secondary: '#CBD5E1',
          muted: '#94A3B8',
          disabled: '#64748B',
          heading: '#FFFFFF',
        },
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fc',
          400: '#36a9f8',
          500: '#0c8de9',
          600: '#026fc7',
          700: '#0358a1',
          800: '#074b83',
          900: '#0c3f6e',
          950: '#061a33',
        },
        navy: {
          950: '#0B1020',
          900: '#0b132b',
          800: '#1c2541',
          700: '#2a3b5c',
        },
        surface: {
          1: '#111827',
          2: '#172033',
          hover: '#1C2942',
        },
        indigo: {
          600: '#4F46E5',
          500: '#6366F1',
        },
        blue: {
          500: '#3B82F6',
        },
        violet: {
          500: '#8B5CF6',
        },
        cyan: {
          500: '#06B6D4',
        },
        slate: {
          850: '#141e33',
          950: '#090d16',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        '3d-sm': '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        '3d-md': '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        '3d-lg': '0 20px 35px -10px rgba(0, 0, 0, 0.4), 0 10px 15px -5px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
        '3d-hover': '0 25px 50px -12px rgba(99, 102, 241, 0.3), 0 12px 20px -8px rgba(0, 0, 0, 0.2)',
        'glow-brand': '0 0 20px rgba(2, 111, 199, 0.35)',
        'glow-indigo': '0 0 20px rgba(79, 70, 229, 0.35)',
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.35)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.35)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.35)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
