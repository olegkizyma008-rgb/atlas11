import React, { useEffect, useRef } from 'react'

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
        <div className="w-full h-96 rounded-xl border border-slate-800 bg-black/80 font-mono text-xs p-4 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-2 border-b border-slate-900 pb-2">
                <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                <span className="text-slate-500">SYNAPSE STREAM</span>
            </div>
            <div className="flex-1 overflow-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-4 opacity-80 hover:opacity-100 transition-opacity">
                        <span className="text-slate-600 shrink-0 w-24">
                            {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={
                            log.source === 'ATLAS' ? 'text-violet-400' :
                                log.source === 'TETYANA' ? 'text-emerald-400' :
                                    log.source === 'GRISHA' ? 'text-rose-400' :
                                        'text-blue-400'
                        }>
                            [{log.source}]
                        </span>
                        <span className="text-slate-300 break-all">{log.message}</span>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    )
}
