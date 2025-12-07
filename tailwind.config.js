/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/renderer/index.html",
        "./src/renderer/src/**/*.{svelte,ts,tsx,html,js,jsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
            },
            colors: {
                slate: {
                    850: '#151e2e',
                    950: '#020617',
                },
                cyber: {
                    cyan: '#00d4ff',
                    purple: '#a855f7',
                    pink: '#ec4899',
                    dark: '#0a0a0f',
                }
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
                'rotate-slow': 'rotate-slow 20s linear infinite',
                'ring-pulse': 'ring-pulse 2s ease-out infinite',
                'hex-glow': 'hex-glow 2s ease-in-out infinite',
                'grid': 'grid-move 10s linear infinite',
                'fade-in': 'fade-in 0.6s ease-out forwards',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                    '50%': { opacity: '0.7', transform: 'scale(1.05)' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'rotate-slow': {
                    from: { transform: 'rotate(0deg)' },
                    to: { transform: 'rotate(360deg)' },
                },
                'ring-pulse': {
                    '0%': { transform: 'scale(1)', opacity: '0.6' },
                    '100%': { transform: 'scale(1.5)', opacity: '0' },
                },
                'hex-glow': {
                    '0%, 100%': { filter: 'drop-shadow(0 0 8px currentColor)' },
                    '50%': { filter: 'drop-shadow(0 0 16px currentColor)' },
                },
                'grid-move': {
                    from: { backgroundPosition: '0 0' },
                    to: { backgroundPosition: '50px 50px' },
                },
                'fade-in': {
                    from: { opacity: '0', transform: 'translateY(20px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
            boxShadow: {
                'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.3), 0 0 40px rgba(0, 212, 255, 0.2)',
                'glow-purple': '0 0 20px rgba(168, 85, 247, 0.3), 0 0 40px rgba(168, 85, 247, 0.2)',
                'glow-mixed': '0 0 30px rgba(0, 212, 255, 0.4), 0 0 60px rgba(168, 85, 247, 0.3)',
            }
        },
    },
    plugins: [],
}
