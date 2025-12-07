/**
 * VoiceOrb Component
 * Central pulsing orb with voice waveform visualization and rotating rings
 */

interface VoiceOrbProps {
    isActive?: boolean
    agentName?: string
}

const agentConfig = {
    ATLAS: {
        color: '#a855f7',
        colorDark: 'rgba(168, 85, 247, 0.3)'
    },
    TETYANA: {
        color: '#10b981',
        colorDark: 'rgba(16, 185, 129, 0.3)'
    },
    GRISHA: {
        color: '#f43f5e',
        colorDark: 'rgba(244, 63, 94, 0.3)'
    }
} as const

export const VoiceOrb = ({
    isActive = false,
    agentName = 'ATLAS'
}: VoiceOrbProps) => {
    const config = agentConfig[agentName as keyof typeof agentConfig] || agentConfig.ATLAS

    return (
        <div className="relative flex items-center justify-center" style={{ width: '400px', height: '400px' }}>

            {/* Outer rotating ring 1 - clockwise */}
            <div
                className="absolute rounded-full border border-cyan-500/20"
                style={{
                    width: '380px',
                    height: '380px',
                    animation: 'rotate-slow 30s linear infinite'
                }}
            >
                {/* Ring dots */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400/50" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/30" />
            </div>

            {/* Ring 2 - counter-clockwise */}
            <div
                className="absolute rounded-full border border-purple-500/15"
                style={{
                    width: '340px',
                    height: '340px',
                    animation: 'rotate-slow 25s linear infinite reverse'
                }}
            >
                <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple-400/40" />
                <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-purple-400/30" />
            </div>

            {/* Ring 3 - clockwise slower */}
            <div
                className="absolute rounded-full border-2 border-cyan-500/10"
                style={{
                    width: '300px',
                    height: '300px',
                    animation: 'rotate-slow 40s linear infinite'
                }}
            />

            {/* Ring 4 - counter-clockwise */}
            <div
                className="absolute rounded-full border border-cyan-400/20"
                style={{
                    width: '260px',
                    height: '260px',
                    animation: 'rotate-slow 20s linear infinite reverse'
                }}
            />

            {/* Glow ring */}
            <div
                className="absolute rounded-full"
                style={{
                    width: '220px',
                    height: '220px',
                    background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)'
                }}
            />

            {/* Main orb */}
            <div className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'animate-pulse-glow' : ''}`}>
                {/* Orb gradient */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: `radial-gradient(circle at 30% 30%, ${config.color}66 0%, rgba(0, 150, 200, 0.3) 50%, rgba(0, 100, 150, 0.2) 100%)`,
                        boxShadow: `0 0 60px ${config.colorDark}, 0 0 100px rgba(0, 212, 255, 0.2), inset 0 0 40px ${config.colorDark}`
                    }}
                />

                {/* Inner glow */}
                <div
                    className="absolute inset-4 rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(100, 200, 255, 0.3) 0%, transparent 70%)'
                    }}
                />

                {/* Waveform */}
                <div className="relative z-10 flex items-center justify-center gap-0.5 h-10">
                    {[...Array(9)].map((_, i) => (
                        <div
                            key={i}
                            className="waveform-bar w-1 rounded-full"
                            style={{
                                background: 'linear-gradient(to top, rgba(0, 212, 255, 0.8), rgba(200, 230, 255, 1))',
                                height: isActive ? undefined : '8px',
                                animationPlayState: isActive ? 'running' : 'paused'
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Agent name - below orb */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
                <h2
                    className="text-xl font-bold tracking-wider"
                    style={{
                        color: config.color,
                        textShadow: `0 0 20px ${config.colorDark}`
                    }}
                >
                    {agentName}
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5 tracking-widest uppercase">
                    {isActive ? 'Speaking...' : 'Ready'}
                </p>
            </div>
        </div>
    )
}
