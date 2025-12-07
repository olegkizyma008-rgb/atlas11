/**
 * VoiceOrb Component - Ultimate Version
 * Cohesive color theme with meaningful orbital agent positions
 */
import { useEffect, useState } from 'react'

interface OrbitalAgent {
    name: string
    stage: string
    status: 'idle' | 'working' | 'speaking' | 'listening' | 'error'
    isActive: boolean
}

interface VoiceOrbProps {
    isActive?: boolean
    agentName?: string
    agents?: OrbitalAgent[]
}

// Unified theme - cyan/teal dominant with accent colors
const theme = {
    primary: '#00d4ff',
    secondary: '#0891b2',
    accent: '#22d3ee',
    glow: 'rgba(0, 212, 255, 0.4)',
    ring: 'rgba(0, 212, 255, 0.15)',
    label: 'rgba(0, 212, 255, 0.6)'
}

// Agent config with meaningful stages in the workflow
const agentWorkflow = {
    ATLAS: {
        color: '#a855f7',
        glowColor: 'rgba(168, 85, 247, 0.4)',
        stages: ['LISTENING', 'PROCESSING CONTEXT', 'PLANNING'],
        baseAngle: 135,
        role: 'Orchestrator'
    },
    TETYANA: {
        color: '#10b981',
        glowColor: 'rgba(16, 185, 129, 0.4)',
        stages: ['EXECUTION PENDING', 'EXECUTING', 'COMPLETED'],
        baseAngle: 270,
        role: 'Executor'
    },
    GRISHA: {
        color: '#f43f5e',
        glowColor: 'rgba(244, 63, 94, 0.4)',
        stages: ['SECURITY REVIEW', 'THREAT SCAN', 'CLEARANCE'],
        baseAngle: 315,
        role: 'Guardian'
    }
}

// Pipeline stages around the orbit (workflow order)
const pipelineStages = [
    { label: 'LISTENING', angle: 135, active: true },
    { label: 'PROCESSING', angle: 165, active: false },
    { label: 'SECURITY CHECK', angle: 195, active: false },
    { label: 'PLANNING', angle: 225, active: false },
    { label: 'CLEARANCE', angle: 270, active: false },
    { label: 'EXECUTION', angle: 315, active: false },
    { label: 'MONITORING', angle: 345, active: false },
    { label: 'COMPLETE', angle: 45, active: false }
]

export const VoiceOrb = ({
    isActive = false,
    agentName = 'ATLAS',
    agents = []
}: VoiceOrbProps) => {
    const [rotation, setRotation] = useState(0)
    const orbitRadius = 150
    const currentAgent = agentWorkflow[agentName as keyof typeof agentWorkflow] || agentWorkflow.ATLAS

    // Slow rotation animation for agents on orbit
    useEffect(() => {
        const interval = setInterval(() => {
            setRotation(prev => (prev + 0.1) % 360)
        }, 50)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="relative flex items-center justify-center" style={{ width: '560px', height: '560px' }}>

            {/* Ambient glow */}
            <div
                className="absolute rounded-full blur-3xl"
                style={{
                    width: '450px',
                    height: '450px',
                    background: `radial-gradient(circle, ${theme.glow} 0%, transparent 60%)`,
                    opacity: isActive ? 0.6 : 0.3
                }}
            />

            {/* Ring 1 - Outermost with segments */}
            <div
                className="absolute rounded-full"
                style={{
                    width: '480px',
                    height: '480px',
                    animation: 'rotate-slow 120s linear infinite'
                }}
            >
                {[...Array(60)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute"
                        style={{
                            width: i % 5 === 0 ? '3px' : '1px',
                            height: i % 5 === 0 ? '14px' : '6px',
                            background: i % 5 === 0
                                ? `linear-gradient(to bottom, ${theme.primary}, transparent)`
                                : `${theme.ring}`,
                            top: '0',
                            left: '50%',
                            transformOrigin: '50% 240px',
                            transform: `translateX(-50%) rotate(${i * 6}deg)`,
                            borderRadius: '2px'
                        }}
                    />
                ))}
            </div>

            {/* Ring 2 - Data flow ring (counter-rotating) */}
            <div
                className="absolute rounded-full"
                style={{
                    width: '420px',
                    height: '420px',
                    border: `2px solid ${theme.ring}`,
                    animation: 'rotate-slow 80s linear infinite reverse'
                }}
            >
                {/* Flow nodes */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                    <div
                        key={angle}
                        className="absolute"
                        style={{
                            width: '6px',
                            height: '6px',
                            background: theme.primary,
                            borderRadius: '50%',
                            boxShadow: `0 0 8px ${theme.glow}`,
                            top: '50%',
                            left: '50%',
                            transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-210px)`
                        }}
                    />
                ))}
            </div>

            {/* Ring 3 - Main orbit path with glow */}
            <div
                className="absolute rounded-full"
                style={{
                    width: `${orbitRadius * 2 + 60}px`,
                    height: `${orbitRadius * 2 + 60}px`,
                    border: `2px solid ${theme.secondary}40`,
                    boxShadow: `0 0 20px ${theme.glow}, inset 0 0 20px ${theme.glow}`
                }}
            />

            {/* Ring 4 - Inner energy ring */}
            <div
                className="absolute rounded-full"
                style={{
                    width: '280px',
                    height: '280px',
                    border: `1px solid ${theme.primary}30`,
                    animation: 'rotate-slow 60s linear infinite'
                }}
            >
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                            background: `${theme.primary}60`,
                            top: '50%',
                            left: '50%',
                            transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-140px)`
                        }}
                    />
                ))}
            </div>

            {/* Ring 5 - Innermost pulse ring */}
            <div
                className={`absolute rounded-full transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-50'}`}
                style={{
                    width: '220px',
                    height: '220px',
                    border: `3px solid ${theme.primary}25`,
                    animation: 'rotate-slow 40s linear infinite reverse'
                }}
            />

            {/* Pipeline stage indicators */}
            {pipelineStages.map((stage, i) => {
                const angleRad = (stage.angle * Math.PI) / 180
                const labelRadius = orbitRadius + 70
                const x = Math.cos(angleRad) * labelRadius
                const y = Math.sin(angleRad) * labelRadius
                const isCurrentStage = agents.some(a => a.stage?.includes(stage.label.split(' ')[0]))

                return (
                    <div
                        key={i}
                        className={`absolute text-[7px] font-mono tracking-wider uppercase whitespace-nowrap px-1.5 py-0.5 rounded transition-all duration-300
                            ${isCurrentStage ? 'opacity-100' : 'opacity-40'}`}
                        style={{
                            left: '50%',
                            top: '50%',
                            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                            color: isCurrentStage ? theme.primary : theme.label,
                            background: isCurrentStage ? `${theme.primary}15` : 'transparent',
                            border: isCurrentStage ? `1px solid ${theme.primary}30` : '1px solid transparent',
                            boxShadow: isCurrentStage ? `0 0 10px ${theme.glow}` : 'none'
                        }}
                    >
                        {stage.label}
                    </div>
                )
            })}

            {/* Center glow layers */}
            <div
                className="absolute rounded-full"
                style={{
                    width: '180px',
                    height: '180px',
                    background: `radial-gradient(circle, ${currentAgent.glowColor} 0%, transparent 70%)`
                }}
            />

            {/* Main orb with agent color adaptation */}
            <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'scale-105' : 'scale-100'}`}>
                {/* Outer glow ring */}
                <div
                    className="absolute inset-0 rounded-full animate-pulse"
                    style={{
                        border: `3px solid ${currentAgent.color}60`,
                        boxShadow: `0 0 40px ${currentAgent.glowColor}, 0 0 80px ${currentAgent.glowColor}, inset 0 0 40px ${currentAgent.glowColor}`
                    }}
                />

                {/* Orb gradient */}
                <div
                    className="absolute inset-3 rounded-full"
                    style={{
                        background: `radial-gradient(circle at 30% 30%, ${currentAgent.color}80 0%, ${currentAgent.color}40 50%, ${theme.secondary}30 100%)`,
                        boxShadow: `0 0 30px ${currentAgent.glowColor}`
                    }}
                />

                {/* Highlight */}
                <div
                    className="absolute inset-4 rounded-full"
                    style={{
                        background: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.4) 0%, transparent 50%)'
                    }}
                />

                {/* Waveform visualization */}
                <div className="relative z-10 flex items-center justify-center gap-[2px] h-10">
                    {[...Array(13)].map((_, i) => {
                        const height = isActive
                            ? Math.abs(Math.sin((Date.now() / 100 + i * 0.5)) * 20 + 8)
                            : 4
                        return (
                            <div
                                key={i}
                                className="waveform-bar rounded-full transition-all duration-75"
                                style={{
                                    width: '2px',
                                    background: `linear-gradient(to top, ${currentAgent.color}, rgba(255,255,255,0.95))`,
                                    height: `${height}px`,
                                    animationPlayState: isActive ? 'running' : 'paused'
                                }}
                            />
                        )
                    })}
                </div>
            </div>

            {/* Agent name with role */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-center z-20">
                <h2
                    className="text-xl font-bold tracking-widest"
                    style={{
                        color: currentAgent.color,
                        textShadow: `0 0 30px ${currentAgent.glowColor}`
                    }}
                >
                    {agentName}
                </h2>
                <p className="text-[9px] text-slate-500 mt-0.5 tracking-widest uppercase">
                    {currentAgent.role}
                </p>
            </div>

            {/* Orbital agents with meaningful positions */}
            {agents.map((agent) => {
                const config = agentWorkflow[agent.name as keyof typeof agentWorkflow]
                if (!config) return null

                // Calculate dynamic position based on status
                const statusOffset = agent.status === 'working' ? 15 : 0
                const activeOffset = agent.isActive ? 10 : 0
                const currentAngle = config.baseAngle + rotation * (agent.status === 'working' ? 0.3 : 0.1) + statusOffset + activeOffset

                const angleRad = (currentAngle * Math.PI) / 180
                const x = Math.cos(angleRad) * orbitRadius
                const y = Math.sin(angleRad) * orbitRadius

                return (
                    <div
                        key={agent.name}
                        className="absolute transition-all duration-300 ease-out z-10"
                        style={{
                            left: '50%',
                            top: '50%',
                            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                        }}
                    >
                        {/* Connection line to center */}
                        <div
                            className="absolute w-px pointer-events-none"
                            style={{
                                height: `${orbitRadius}px`,
                                background: agent.isActive
                                    ? `linear-gradient(to top, transparent, ${config.color}30)`
                                    : `linear-gradient(to top, transparent, ${config.color}10)`,
                                left: '50%',
                                bottom: '50%',
                                transformOrigin: 'bottom center',
                                transform: `translateX(-50%) rotate(${-currentAngle + 90}deg)`
                            }}
                        />

                        {/* Agent sphere */}
                        <div
                            className={`
                                relative rounded-full flex items-center justify-center
                                transition-all duration-300
                                ${agent.isActive ? 'w-10 h-10' : 'w-8 h-8'}
                            `}
                            style={{
                                background: `radial-gradient(circle at 30% 30%, ${config.color} 0%, ${config.color}70 100%)`,
                                boxShadow: agent.isActive
                                    ? `0 0 30px ${config.glowColor}, 0 0 60px ${config.glowColor}`
                                    : `0 0 15px ${config.glowColor}`
                            }}
                        >
                            {/* Highlight */}
                            <div
                                className="absolute inset-1 rounded-full"
                                style={{
                                    background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5) 0%, transparent 50%)'
                                }}
                            />

                            {/* Icon */}
                            <span className="text-white text-xs relative z-10 font-bold">
                                {agent.name === 'ATLAS' ? '◈' : agent.name === 'TETYANA' ? '◉' : '◎'}
                            </span>

                            {/* Active pulse */}
                            {agent.status === 'working' && (
                                <div
                                    className="absolute inset-0 rounded-full animate-ping"
                                    style={{
                                        border: `2px solid ${config.color}`,
                                        opacity: 0.4
                                    }}
                                />
                            )}
                        </div>

                        {/* Agent name */}
                        <div
                            className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-wider whitespace-nowrap"
                            style={{ color: config.color }}
                        >
                            {agent.name}
                        </div>

                        {/* Stage tooltip */}
                        {agent.isActive && agent.stage && (
                            <div
                                className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[7px] font-mono tracking-wider whitespace-nowrap"
                                style={{
                                    background: `${config.color}20`,
                                    color: config.color,
                                    border: `1px solid ${config.color}40`,
                                    boxShadow: `0 0 10px ${config.glowColor}`
                                }}
                            >
                                {agent.stage}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
