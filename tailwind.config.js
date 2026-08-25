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
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      borderRadius: { xl: '0.875rem', lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      fontFamily: { sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'], display: ['Space Grotesk', 'DM Sans', 'sans-serif'] },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px -16px rgba(15,23,42,.16)',
        lift: '0 12px 28px -18px rgba(15,23,42,.28)',
        glow: '0 0 0 1px rgba(37,99,235,.12), 0 18px 42px -24px rgba(37,99,235,.32)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(120deg, #1d4ed8 0%, #2563eb 52%, #0891b2 100%)',
        'brand-soft': 'linear-gradient(120deg, rgba(37,99,235,.10) 0%, rgba(8,145,178,.08) 100%)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(.94)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'fade-up': 'fade-up .5s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .4s ease both',
        float: 'float 6s ease-in-out infinite',
        'scale-in': 'scale-in .35s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
