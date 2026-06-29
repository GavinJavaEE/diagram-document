/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    // 显式声明断点作为项目唯一来源，与 src/hooks/useResponsiveLayout.ts 的 BREAKPOINTS 对齐
    screens: {
      sm: '640px',
      md: '768px',   // NARROW
      lg: '1024px',
      xl: '1280px',  // MEDIUM
      '2xl': '1536px',
      wide: '1440px', // WIDE（自定义，用于三栏宽屏判断）
    },
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          dark: '#3730A3',
          light: '#6366F1',
        },
        accent: {
          DEFAULT: '#06B6D4',
          dark: '#0891B2',
          light: '#22D3EE',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        
        dark: {
          DEFAULT: '#0F172A',
          1: '#1E293B',
          2: '#334155',
          3: '#475569',
          4: '#64748B',
        },
        light: {
          DEFAULT: '#FFFFFF',
          1: '#F8FAFC',
          2: '#F1F5F9',
          3: '#E2E8F0',
          4: '#CBD5E1',
          5: '#94A3B8',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(79, 70, 229, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(79, 70, 229, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
