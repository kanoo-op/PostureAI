import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'tech': ['Rajdhani', 'sans-serif'],
        'mono-tech': ['Share Tech Mono', 'monospace'],
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        fp: {
          success: '#00F5A0',
          warning: '#FFB800',
          danger: '#FF3D71',
          surface: 'rgba(17, 24, 39, 0.85)',
          border: 'rgba(75, 85, 99, 0.3)',
        },
      },
      boxShadow: {
        'glow-success': '0 0 20px rgba(0, 245, 160, 0.3), 0 0 40px rgba(0, 245, 160, 0.1)',
        'glow-warning': '0 0 20px rgba(255, 184, 0, 0.3), 0 0 40px rgba(255, 184, 0, 0.1)',
        'glow-danger': '0 0 20px rgba(255, 61, 113, 0.3), 0 0 40px rgba(255, 61, 113, 0.1)',
      },
    },
  },
  plugins: [],
}
export default config
