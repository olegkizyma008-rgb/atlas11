/**
 * ChatPanel Component
 * Right side chat panel for conversation display
 */
import { useEffect, useRef } from 'react'

interface Message {
    id: string
    source: string
    message: string
    timestamp: number
}

interface ChatPanelProps {
    messages: Message[]
}

const sourceColors: Record<string, string> = {
    ATLAS: 'text-violet-400',
    TETYANA: 'text-emerald-400',
    GRISHA: 'text-rose-400',
    USER: 'text-cyan-400',
    SYSTEM: 'text-slate-500'
}

export const ChatPanel = ({ messages }: ChatPanelProps) => {
    const endRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    return (
        <div className="absolute right-4 top-4 bottom-4 w-80 z-20 flex flex-col">
            {/* Header */}
            <div className="glass-card rounded-t-2xl px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-bold text-white/80 tracking-wider uppercase">
                        Synapse Stream
                    </span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 glass-card rounded-b-2xl overflow-hidden">
                <div className="h-full overflow-y-auto p-4 space-y-3 scrollbar-thin">
                    {messages.length === 0 && (
                        <div className="text-center text-slate-600 text-xs py-8">
                            Очікування сигналу...
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className="group animate-fade-in"
                        >
                            {/* Source & Time */}
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold tracking-wider ${sourceColors[msg.source] || 'text-cyan-400'}`}>
                                    {msg.source}
                                </span>
                                <span className="text-[9px] text-slate-600">
                                    {new Date(msg.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: false
                                    })}
                                </span>
                            </div>

                            {/* Message content */}
                            <div className="text-xs text-slate-300 leading-relaxed pl-2 border-l-2 border-white/5 group-hover:border-white/20 transition-colors">
                                {msg.message}
                            </div>
                        </div>
                    ))}

                    <div ref={endRef} />
                </div>
            </div>
        </div>
    )
}
