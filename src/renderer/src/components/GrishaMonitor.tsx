/**
 * GrishaMonitor Component
 * Floating window showing what GRISHA is monitoring/observing
 */

interface MonitorItem {
    id: string
    type: 'file' | 'process' | 'network' | 'system'
    name: string
    status: 'watching' | 'alert' | 'safe'
}

interface GrishaMonitorProps {
    isActive: boolean
    items?: MonitorItem[]
}

const typeIcons: Record<string, string> = {
    file: '📄',
    process: '⚙️',
    network: '🌐',
    system: '💻'
}

const statusColors: Record<string, string> = {
    watching: 'text-yellow-400',
    alert: 'text-red-400',
    safe: 'text-emerald-400'
}

export const GrishaMonitor = ({ isActive, items = [] }: GrishaMonitorProps) => {
    // Default monitoring items if none provided
    const defaultItems: MonitorItem[] = [
        { id: '1', type: 'system', name: 'System Activity', status: 'watching' },
        { id: '2', type: 'network', name: 'API Calls', status: 'safe' },
        { id: '3', type: 'process', name: 'MCP Tools', status: 'watching' }
    ]

    const displayItems = items.length > 0 ? items : defaultItems

    if (!isActive) return null

    return (
        <div className="absolute right-4 bottom-4 w-64 z-30 animate-fade-in">
            <div className="glass-card rounded-xl overflow-hidden">
                {/* Header */}
                <div
                    className="px-3 py-2 flex items-center gap-2 border-b border-white/5"
                    style={{ background: 'linear-gradient(90deg, rgba(244, 63, 94, 0.2) 0%, transparent 100%)' }}
                >
                    <span className="text-rose-400 text-sm">◎</span>
                    <span className="text-[10px] font-bold text-rose-300 tracking-wider uppercase">
                        GRISHA Monitor
                    </span>
                    <div className="flex-1" />
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                </div>

                {/* Monitor items */}
                <div className="p-2 space-y-1">
                    {displayItems.map(item => (
                        <div
                            key={item.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            {/* Type icon */}
                            <span className="text-xs">{typeIcons[item.type]}</span>

                            {/* Name */}
                            <span className="flex-1 text-[10px] text-slate-300 truncate">
                                {item.name}
                            </span>

                            {/* Status dot */}
                            <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'watching' ? 'bg-yellow-400 animate-pulse' :
                                    item.status === 'alert' ? 'bg-red-400 animate-ping' :
                                        'bg-emerald-400'
                                }`} />

                            {/* Status text */}
                            <span className={`text-[8px] uppercase tracking-wider ${statusColors[item.status]}`}>
                                {item.status}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 border-t border-white/5 flex items-center gap-2">
                    <span className="text-[9px] text-slate-500">Спостерігаю за:</span>
                    <span className="text-[9px] text-rose-400 font-mono">{displayItems.length} об'єктів</span>
                </div>
            </div>
        </div>
    )
}
