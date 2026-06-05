import type { Config } from 'tailwindcss'

/**
 * Starkën Design System — Design Tokens (Tailwind v3)
 * Tema dark/tech. Primária = Esmeralda · Secundária = Teal · Neutros = Slate.
 * Regra: 1 destaque (esmeralda) sobre neutros escuros.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}', './app/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Primária — Esmeralda
        emerald: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
          400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
          800: '#065f46', 900: '#064e3b', 950: '#022c22',
          DEFAULT: '#10b981',
        },
        // Secundária — Teal
        teal: {
          50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
          400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e',
          800: '#115e59', 900: '#134e4a', 950: '#042f2e',
          DEFAULT: '#0d9488',
        },
        // Neutros — Slate
        slate: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a', 950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      backgroundImage: {
        brand: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
        'brand-v': 'linear-gradient(180deg, #34d399 0%, #10b981 50%, #0d9488 100%)',
      },
      boxShadow: {
        brand: '0 4px 20px rgba(16,185,129,0.25)',
      },
      borderRadius: {
        sm: '6px', md: '10px', lg: '16px', xl: '24px',
      },
    },
  },
  plugins: [],
}

export default config
