/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        'surface-sunken': 'var(--surface-sunken)',
        text: 'var(--text)',
        'muted-text': 'var(--muted-text)',
        primary: 'var(--primary)',
        'primary-dark': 'var(--primary-dark)',
        'primary-soft': 'var(--primary-soft)',
        'on-primary': 'var(--on-primary)',
        blueprint: 'var(--blueprint)',
        'blueprint-soft': 'var(--blueprint-soft)',
        'phase-pending': 'var(--phase-pending)',
        'phase-progress': 'var(--phase-progress)',
        'phase-done': 'var(--phase-done)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        'input-background': 'var(--input-background)',
        'seal-gold': 'var(--seal-gold)',
        'seal-silver': 'var(--seal-silver)',
        'seal-verified': 'var(--seal-verified)',
        'promoted-bg': 'var(--promoted-bg)',
        'promoted-border': 'var(--promoted-border)',
      },
      borderRadius: {
        DEFAULT: '6px',
        card: '6px',
        chip: '4px',
      },
      letterSpacing: {
        blueprint: '0.08em',
      },
    },
  },
  plugins: [],
};
