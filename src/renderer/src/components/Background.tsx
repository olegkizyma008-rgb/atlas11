/**
 * Background Component - Enhanced Version
 * Dark cyberpunk background with scanlines, grid, and atmospheric effects
 */

export const Background = () => {
    return (
        <div className="absolute inset-0 overflow-hidden bg-[#050508]">
            {/* Base gradient */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(0, 50, 60, 0.3) 0%, rgba(5, 5, 8, 1) 70%)'
                }}
            />

            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(0, 212, 255, 0.5) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 212, 255, 0.5) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                    animation: 'grid 20s linear infinite'
                }}
            />

            {/* Scanlines */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.04]"
                style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.5) 2px, rgba(0, 0, 0, 0.5) 4px)'
                }}
            />

            {/* Center glow */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(0, 212, 255, 0.08) 0%, transparent 50%)'
                }}
            />

            {/* Accent glow - left */}
            <div
                className="absolute top-1/4 left-0 w-[400px] h-[400px] rounded-full blur-3xl opacity-20"
                style={{
                    background: 'radial-gradient(circle, rgba(244, 63, 94, 0.4) 0%, transparent 70%)'
                }}
            />

            {/* Accent glow - right */}
            <div
                className="absolute bottom-1/4 right-0 w-[400px] h-[400px] rounded-full blur-3xl opacity-20"
                style={{
                    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, transparent 70%)'
                }}
            />

            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-32 h-32">
                <div className="absolute top-4 left-4 w-16 h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />
                <div className="absolute top-4 left-4 w-px h-16 bg-gradient-to-b from-cyan-500/30 to-transparent" />
            </div>

            <div className="absolute top-0 right-0 w-32 h-32">
                <div className="absolute top-4 right-4 w-16 h-px bg-gradient-to-l from-cyan-500/30 to-transparent" />
                <div className="absolute top-4 right-4 w-px h-16 bg-gradient-to-b from-cyan-500/30 to-transparent" />
            </div>

            <div className="absolute bottom-0 left-0 w-32 h-32">
                <div className="absolute bottom-4 left-4 w-16 h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />
                <div className="absolute bottom-4 left-4 w-px h-16 bg-gradient-to-t from-cyan-500/30 to-transparent" />
            </div>

            <div className="absolute bottom-0 right-0 w-32 h-32">
                <div className="absolute bottom-4 right-4 w-16 h-px bg-gradient-to-l from-cyan-500/30 to-transparent" />
                <div className="absolute bottom-4 right-4 w-px h-16 bg-gradient-to-t from-cyan-500/30 to-transparent" />
            </div>

            {/* Noise texture overlay */}
            <div
                className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}
            />

            {/* Vignette */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.6) 100%)'
                }}
            />
        </div>
    )
}
