import { clsx } from 'clsx'
import { Activity, Brain, Mic, Radio } from 'lucide-react'

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
            color: 'violet',
            description: 'Core Orchestrator'
        },
        TETYANA: {
            icon: Mic,
            color: 'emerald',
            description: 'Voice Interface'
        },
        GRISHA: {
            icon: Radio,
            color: 'rose',
            description: 'Security Monitor'
        }
    }[name]

    const statusStyles = {
        idle: 'border-slate-800/50 bg-slate-900/20',
        working: `border-${config.color}-500/50 bg-${config.color}-500/5 shadow-[0_0_30px_rgba(var(--color-${config.color}-500),0.1)]`,
        thinking: 'border-blue-500/50 bg-blue-500/5 animate-pulse-slow',
        blocked: 'border-orange-500/50 bg-orange-500/5',
        error: 'border-red-500 bg-red-500/10'
    }[status] || 'border-slate-800'

    const Icon = config.icon

    return (
        <div className={clsx(
            "relative group overflow-hidden rounded-2xl p-6 glass-card",
            statusStyles
        )}>
            {/* Dynamic Background Glow */}
            <div className={clsx(
                "absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] transition-all duration-1000 opacity-20",
                `bg-${config.color}-500/30 group-hover:opacity-40`
            )} />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className={clsx(
                            "w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 shadow-lg",
                            `bg-${config.color}-500/10 text-${config.color}-400`
                        )}>
                            <Icon size={24} />
                        </div>
                        <div>
                            <h2 className="font-bold text-xl tracking-tight text-white">{name}</h2>
                            <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">{config.description}</p>
                        </div>
                    </div>
                    <div className={clsx(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                        status === 'working' ? `bg-${config.color}-500/20 text-${config.color}-300 border-${config.color}-500/30` :
                            status === 'thinking' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                                'bg-slate-800/50 text-slate-500 border-slate-700'
                    )}>
                        {status}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-mono uppercase tracking-wider">
                        <Activity size={12} />
                        <span>Current Task</span>
                    </div>
                    <div className={clsx(
                        "font-mono text-sm h-[4.5em] line-clamp-3 leading-relaxed",
                        status === 'idle' ? 'text-slate-600' : 'text-slate-300'
                    )}>
                        {activity}
                        <span className={clsx("inline-block w-2 H-4 ml-1 align-middle animate-pulse", `bg-${config.color}-500`)} />
                    </div>
                </div>
            </div>
        </div>
    )
}
