/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        root: '#07111F',
        bgsec: '#0B1628',
        surface: {
          DEFAULT: '#101D31',
          elevated: '#14243B',
          hover: '#192B45',
        },
        border: {
          DEFAULT: '#243650',
          subtle: '#1B2A40',
          hover: '#31527A',
        },
        sidebar: {
          bg: '#050C18',
          border: '#17253A',
        },
        accent: {
          primary: '#3B82F6',
          secondary: '#06B6D4',
          hover: '#60A5FA',
        },
        txt: {
          primary: '#F8FAFC',
          secondary: '#CBD5E1',
          muted: '#94A3B8',
          disabled: '#64748B',
          heading: '#FFFFFF',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#07111f',
        },
        navy: {
          950: '#07111F',
          900: '#0B1628',
          850: '#0F1C30',
          800: '#101D31',
          750: '#14243B',
          700: '#192B45',
        },
        slate: {
          850: '#0F1C30',
          900: '#101D31',
          950: '#07111F',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        '3d-sm': '0 4px 12px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        '3d-md': '0 12px 35px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        '3d-lg': '0 20px 40px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
        '3d-hover': '0 15px 35px rgba(59, 130, 246, 0.2), 0 8px 15px rgba(0, 0, 0, 0.3)',
        'glow-brand': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-indigo': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
        'glow-emerald': '0 0 20px rgba(34, 197, 94, 0.3)',
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
