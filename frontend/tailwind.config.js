/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary ramp re-derived as a proper perceptual scale (borrowed from
        // Tailwind's own indigo steps, shifted so 500/DEFAULT keeps the exact
        // brand hex). Old scale jumped straight from 500 to a near-black 600;
        // this gives real intermediate hover/active/pressed steps.
        primary: {
          DEFAULT: '#4F46E5',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#4F46E5',
          600: '#4338CA',
          700: '#3730A3',
          800: '#312E81',
          900: '#1E1B4B',
        },
        secondary: {
          DEFAULT: '#0EA5E9',
          50: '#F0F9FF',
          600: '#0284C7',
        },
        // Cooler neutral scale (slate hexes under the `gray` token name) so
        // every existing border-gray-*/text-gray-*/bg-gray-* class in the app
        // reads as a considered cool-gray instead of default Tailwind warm gray
        // — zero call-site changes required.
        gray: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        success: {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          600: '#059669',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          600: '#D97706',
        },
        danger: {
          DEFAULT: '#EF4444',
          50: '#FEF2F2',
          600: '#DC2626',
        },
        info: {
          DEFAULT: '#3B82F6',
          50: '#EFF6FF',
          600: '#2563EB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundColor: {
        app: '#F8FAFC',
      },
      // Tuned type scale: same class names (text-xs…text-3xl) so no call
      // sites change, but each step gets a deliberate line-height and
      // headings pick up slight negative tracking for a crafted feel.
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '0' }],
        base: ['0.875rem', { lineHeight: '1.375rem', letterSpacing: '0' }],
        lg: ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.006em' }],
        xl: ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '-0.012em' }],
        '2xl': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.016em' }],
        '3xl': ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.02em' }],
      },
      // Elevation system: static surfaces use a border only (no shadow-*
      // classes below), interactive/hovered surfaces pick up `shadow-card`
      // or `shadow-card-hover`; dropdowns/popovers use `shadow-dropdown`.
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'card-hover': '0 8px 20px -6px rgba(15, 23, 42, 0.12), 0 2px 6px -2px rgba(15, 23, 42, 0.06)',
        dropdown: '0 12px 28px -6px rgba(15, 23, 42, 0.16), 0 4px 10px -4px rgba(15, 23, 42, 0.08)',
      },
      // A slightly less "default Tailwind" easing curve for entrances/hovers.
      transitionTimingFunction: {
        snappy: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(0.5rem)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'scale-in': 'scale-in 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
