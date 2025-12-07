import { clsx } from 'clsx'
import { Brain, Mic, Radio } from 'lucide-react'

type AgentStatus = 'idle' | 'working' | 'thinking' | 'blocked' | 'error'
type AgentName = 'ATLAS' | 'TETYANA' | 'GRISHA'

interface AgentCardProps {
    name: AgentName
    status: AgentStatus
    activity?: string
}

export const AgentCard = ({ name, status, activity = 'Waiting...' }: AgentCardProps) => {
    const config = {
        ATLAS: {
            icon: Brain,
            color: 'violet' as const,
            description: 'Core Orchestrator'
        },
        TETYANA: {
            icon: Mic,
            color: 'emerald' as const,
            description: 'Voice Interface'
        },
        GRISHA: {
            icon: Radio,
            color: 'rose' as const,
            description: 'Security Monitor'
        }
    }[name]

    const statusColor = {
        idle: 'bg-slate-600',
        working: `bg-${config.color}-500`,
        thinking: 'bg-blue-500 animate-pulse',
        blocked: 'bg-orange-500',
        error: 'bg-red-500'
    }[status]

    const Icon = config.icon

    return (
        <div className="flex items-center gap-3 px-3 py-1.5 rounded bg-slate-900/30 border border-white/5 hover:border-white/10 transition-all">
            {/* Status Indicator */}
            <div className={clsx("w-1.5 h-1.5 rounded-full", statusColor)}></div>

            {/* Icon */}
            <div className={clsx(
                "w-6 h-6 rounded flex items-center justify-center",
                `bg-${config.color}-500/10 text-${config.color}-400`
            )}>
                <Icon size={12} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-[11px] text-white">{name}</h3>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wide">{config.description}</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">{activity}</p>
            </div>

            {/* Status Badge */}
            <div className={clsx(
                "px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider",
                status === 'working' ? `bg-${config.color}-500/20 text-${config.color}-300` :
                    'bg-slate-800/50 text-slate-500'
            )}>
                {status}
            </div>
        </div>
    )
}
