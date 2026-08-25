/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1360px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        success: { DEFAULT: 'hsl(var(--success))', foreground: 'hsl(var(--success-foreground))' },
        warning: { DEFAULT: 'hsl(var(--warning))', foreground: 'hsl(var(--warning-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        /* Additional dark surface tokens */
        surface: '#0F2238',
        'surface-light': '#132A43',
        navy: {
          900: '#06111F',
          800: '#081827',
          700: '#0B1F33',
          600: '#0F2238',
          500: '#132A43',
        },
      },
      borderRadius: { xl: '0.875rem', lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)',
        lift: '0 8px 24px rgba(0,0,0,0.35)',
        glow: '0 0 0 1px rgba(37,99,235,0.15), 0 12px 40px -8px rgba(37,99,235,0.35)',
        'glow-cyan': '0 0 0 1px rgba(34,211,238,0.15), 0 8px 30px -8px rgba(34,211,238,0.25)',
        'card-hover': '0 0 0 1px rgba(37,99,235,0.12), 0 8px 32px -8px rgba(37,99,235,0.18)',
        'inner-glow': 'inset 0 1px 0 rgba(148,163,184,0.08)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(120deg, #1d4ed8 0%, #2563eb 52%, #06b6d4 100%)',
        'brand-soft': 'linear-gradient(120deg, rgba(37,99,235,.15) 0%, rgba(6,182,212,.08) 100%)',
        'surface-gradient': 'linear-gradient(180deg, #0F2238 0%, #081827 100%)',
        'blue-glow': 'radial-gradient(ellipse at center, rgba(37,99,235,0.15) 0%, transparent 70%)',
        'cyan-glow': 'radial-gradient(ellipse at center, rgba(34,211,238,0.1) 0%, transparent 70%)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(.94)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'slide-in-left': { '0%': { opacity: '0', transform: 'translateX(-16px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .35s ease both',
        float: 'float 6s ease-in-out infinite',
        'scale-in': 'scale-in .3s cubic-bezier(.22,1,.36,1) both',
        'slide-in-left': 'slide-in-left .3s cubic-bezier(.22,1,.36,1) both',
        shimmer: 'shimmer 2s linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

