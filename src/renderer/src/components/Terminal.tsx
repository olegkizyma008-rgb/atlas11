import { useEffect, useRef } from 'react'
import { TerminalSquare, Circle } from 'lucide-react'

interface Log {
    id: string
    source: string
    message: string
    timestamp: number
}

export const Terminal = ({ logs }: { logs: Log[] }) => {
    const endRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [logs])

    return (
        <div className="w-full relative rounded-xl border border-white/10 bg-black/90 shadow-2xl overflow-hidden backdrop-blur-xl group">
            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-[4px] w-full z-20 animate-scan pointer-events-none opacity-20"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%]"></div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-3">
                    <TerminalSquare size={14} className="text-slate-400" />
                    <span className="text-xs font-mono text-slate-400 font-bold tracking-widest uppercase">Synapse Stream V.2.1</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Circle size={8} className="fill-red-500 text-transparent opacity-50" />
                    <Circle size={8} className="fill-yellow-500 text-transparent opacity-50" />
                    <Circle size={8} className="fill-emerald-500 text-transparent opacity-50" />
                </div>
            </div>

            {/* Content */}
            <div className="h-96 overflow-auto p-4 font-mono text-xs space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {logs.length === 0 && (
                    <div className="text-slate-600 italic text-center py-20">Waiting for signal...</div>
                )}
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-4 group/line hover:bg-white/5 p-1 rounded transition-colors -mx-1 px-2 border-l-2 border-transparent hover:border-indigo-500/50">
                        <span className="text-slate-600 shrink-0 select-none">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <div className="flex-1 break-all">
                            <span className={
                                log.source === 'ATLAS' ? 'text-violet-400 font-bold mr-2' :
                                    log.source === 'TETYANA' ? 'text-emerald-400 font-bold mr-2' :
                                        log.source === 'GRISHA' ? 'text-rose-400 font-bold mr-2' :
                                            'text-blue-400 font-bold mr-2'
                            }>
                                {log.source} &gt;
                            </span>
                            <span className="text-slate-300 group-hover/line:text-white transition-colors">
                                {log.message}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    )
}
