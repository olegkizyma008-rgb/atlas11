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
        <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all group">
            {/* Status Indicator */}
            <div className={clsx("w-2 h-2 rounded-full", statusColor)}></div>

            {/* Icon */}
            <div className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center border border-white/10",
                `bg-${config.color}-500/10 text-${config.color}-400`
            )}>
                <Icon size={16} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-white">{name}</h3>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{config.description}</span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">{activity}</p>
            </div>

            {/* Status Badge */}
            <div className={clsx(
                "px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider",
                status === 'working' ? `bg-${config.color}-500/20 text-${config.color}-300` :
                    'bg-slate-800/50 text-slate-500'
            )}>
                {status}
            </div>
        </div>
    )
}
