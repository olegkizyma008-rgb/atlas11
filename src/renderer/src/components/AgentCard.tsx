import React from 'react'
import { clsx } from 'clsx'

type AgentStatus = 'idle' | 'working' | 'thinking' | 'blocked'
type AgentName = 'ATLAS' | 'TETYANA' | 'GRISHA'

interface AgentCardProps {
    name: AgentName
    status: AgentStatus
    activity?: string
}

export const AgentCard = ({ name, status, activity = 'Waiting...' }: AgentCardProps) => {
    const statusColors = {
        idle: 'bg-slate-500',
        working: 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]',
        thinking: 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.4)]',
        blocked: 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
    }

    return (
        <div className="relative group overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-md transition-all hover:border-slate-700">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg tracking-tight">{name}</h2>
                <div className={clsx("w-2 h-2 rounded-full transition-all duration-500", statusColors[status])} />
            </div>

            <div className="font-mono text-sm text-slate-400 h-10 line-clamp-2">
                {activity}
            </div>

            {/* Decorative Gradient */}
            <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-slate-800/0 via-slate-700/10 to-slate-800/0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
        </div>
    )
}
