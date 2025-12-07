/**
 * AgentSidebar Component
 * Left sidebar with agent spheres/orbs stacked vertically
 */

interface AgentSphereProps {
    name: string
    status: 'idle' | 'working' | 'speaking' | 'listening' | 'error'
    isActive: boolean
    onClick?: () => void
}

const agentConfig = {
    ATLAS: {
        color: '#a855f7',
        gradient: 'linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)',
        icon: '◈'
    },
    TETYANA: {
        color: '#10b981',
        gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
        icon: '◉'
    },
    GRISHA: {
        color: '#f43f5e',
        gradient: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
        icon: '◎'
    }
} as const

const AgentSphere = ({ name, status, isActive, onClick }: AgentSphereProps) => {
    const config = agentConfig[name as keyof typeof agentConfig]
    const isWorking = status !== 'idle'

    return (
        <button
            onClick={onClick}
            className={`
                relative flex flex-col items-center gap-2 p-2 rounded-xl
                transition-all duration-300 group
                ${isActive ? 'scale-110' : 'hover:scale-105'}
            `}
        >
            {/* Sphere */}
            <div
                className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${isWorking ? 'animate-pulse' : ''}
                `}
                style={{
                    background: config.gradient,
                    boxShadow: isActive
                        ? `0 0 30px ${config.color}80, 0 0 60px ${config.color}40`
                        : `0 0 15px ${config.color}40`
                }}
            >
                {/* Inner glow */}
                <div
                    className="absolute inset-1 rounded-full"
                    style={{
                        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)`
                    }}
                />

                {/* Icon */}
                <span className="text-white text-lg relative z-10">{config.icon}</span>

                {/* Status ring */}
                {isWorking && (
                    <div
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{
                            border: `2px solid ${config.color}`,
                            opacity: 0.5
                        }}
                    />
                )}
            </div>

            {/* Name label */}
            <span className="text-[9px] font-bold text-white/80 tracking-wider">
                {name}
            </span>
        </button>
    )
}

interface AgentSidebarProps {
    agents: Array<{
        name: string
        status: 'idle' | 'working' | 'speaking' | 'listening' | 'error'
        isActive: boolean
    }>
    onAgentClick?: (name: string) => void
}

export const AgentSidebar = ({ agents, onAgentClick }: AgentSidebarProps) => {
    return (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
            {/* Container glass effect */}
            <div className="glass-card p-3 rounded-2xl flex flex-col gap-3">
                {agents.map(agent => (
                    <AgentSphere
                        key={agent.name}
                        name={agent.name}
                        status={agent.status}
                        isActive={agent.isActive}
                        onClick={() => onAgentClick?.(agent.name)}
                    />
                ))}
            </div>
        </div>
    )
}
