/**
 * LogPanel Component - Enhanced Version
 * Unified theme for TETYANA task execution logs
 */
import { useEffect, useRef } from 'react'

interface LogEntry {
    id: string
    timestamp: number
    source: string
    message: string
    type?: 'info' | 'success' | 'warning' | 'error'
}

interface LogPanelProps {
    logs: LogEntry[]
    title?: string
    status?: string
}

const theme = {
    primary: '#10b981',
    secondary: '#059669',
    glow: 'rgba(16, 185, 129, 0.3)'
}

const typeColors = {
    info: 'rgba(200, 220, 230, 0.7)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#f43f5e'
}

const sourceColors: Record<string, string> = {
    ATLAS: '#a855f7',
    TETYANA: '#10b981',
    GRISHA: '#f43f5e',
    SYSTEM: '#00d4ff'
}

export const LogPanel = ({ logs, title = 'TETYANA: TASK EXECUTING', status = 'STATUS OK' }: LogPanelProps) => {
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [logs])

    return (
        <div className="absolute left-4 bottom-4 w-80 z-20 animate-fade-in">
            <div
                className="rounded-xl overflow-hidden"
                style={{
                    background: 'rgba(5, 5, 10, 0.95)',
                    border: `1px solid ${theme.primary}30`,
                    boxShadow: `0 0 30px ${theme.glow}`
                }}
            >
                {/* Header */}
                <div
                    className="px-3 py-2 flex items-center gap-2"
                    style={{
                        background: `linear-gradient(90deg, ${theme.primary}15 0%, transparent 100%)`,
                        borderBottom: `1px solid ${theme.primary}20`
                    }}
                >
                    <span style={{ color: theme.primary }} className="text-xs font-bold">LOG</span>
                    <div className="flex-1 flex items-center gap-2">
                        <span className="text-[9px] font-mono tracking-wider" style={{ color: theme.primary }}>
                            {title}
                        </span>
                        <span className="text-[8px] font-mono" style={{ color: `${theme.primary}60` }}>
                            - {status}
                        </span>
                    </div>
                    <span className="text-[9px] font-bold" style={{ color: `${theme.primary}50` }}>D</span>
                </div>

                {/* Log entries */}
                <div
                    ref={scrollRef}
                    className="h-28 overflow-y-auto p-2 space-y-1.5 scrollbar-thin font-mono"
                >
                    {logs.length === 0 && (
                        <div className="text-[9px] text-center py-6" style={{ color: `${theme.primary}40` }}>
                            <div className="text-lg mb-1">◉</div>
                            WAITING FOR TASKS...
                        </div>
                    )}

                    {logs.slice(-12).map((log) => (
                        <div key={log.id} className="flex items-start gap-1.5 text-[8px] leading-relaxed">
                            <span style={{ color: `${theme.primary}40` }}>
                                [{new Date(log.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: false
                                })}]
                            </span>
                            <span style={{ color: sourceColors[log.source] || theme.primary }}>
                                {log.source}:
                            </span>
                            <span style={{ color: typeColors[log.type || 'info'] }}>
                                {log.message}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
