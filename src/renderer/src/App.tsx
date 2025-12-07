import { useState } from 'react'
import { Background } from './components/Background'
import { VoiceOrb } from './components/VoiceOrb'
import { AgentSidebar } from './components/AgentSidebar'
import { ChatPanel } from './components/ChatPanel'
import { GrishaMonitor } from './components/GrishaMonitor'
import { trpc } from './main'

interface Log {
    id: string
    source: string
    message: string
    timestamp: number
}

type AgentStatus = 'idle' | 'working' | 'speaking' | 'listening' | 'error'

function App(): JSX.Element {
    const [logs, setLogs] = useState<Log[]>([])
    const [activeAgent, setActiveAgent] = useState<string>('ATLAS')
    const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({
        ATLAS: 'idle',
        TETYANA: 'idle',
        GRISHA: 'idle'
    })

    // Real-time connection to KONTUR Synapse
    trpc.synapse.useSubscription(undefined, {
        onData(signal: any) {
            const source = signal.source?.toUpperCase() || 'UNKNOWN'
            const newLog: Log = {
                id: Math.random().toString(36),
                source,
                message: typeof signal.payload === 'string'
                    ? signal.payload
                    : JSON.stringify(signal.payload),
                timestamp: Date.now()
            }
            setLogs(prev => [...prev, newLog].slice(-100))

            // Update active agent and status based on signal
            if (['ATLAS', 'TETYANA', 'GRISHA'].includes(source)) {
                setActiveAgent(source)
                setAgentStatuses(prev => ({
                    ...prev,
                    [source]: 'working'
                }))
                // Reset to idle after a delay
                setTimeout(() => {
                    setAgentStatuses(prev => ({
                        ...prev,
                        [source]: 'idle'
                    }))
                }, 3000)
            }
        },
        onError(err) {
            console.warn('TRPC Synapse subscription error:', err)
        }
    })

    // Build agents array
    const agents = [
        { name: 'ATLAS', status: agentStatuses.ATLAS, isActive: activeAgent === 'ATLAS' },
        { name: 'TETYANA', status: agentStatuses.TETYANA, isActive: activeAgent === 'TETYANA' },
        { name: 'GRISHA', status: agentStatuses.GRISHA, isActive: activeAgent === 'GRISHA' }
    ]

    const handleAgentClick = (name: string) => {
        setActiveAgent(name)
    }

    return (
        <div className="h-screen w-screen overflow-hidden relative">
            {/* Background */}
            <Background />

            {/* Left Sidebar - Agent Spheres */}
            <AgentSidebar
                agents={agents}
                onAgentClick={handleAgentClick}
            />

            {/* Center - Voice Orb */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="animate-fade-in">
                    <VoiceOrb
                        isActive={Object.values(agentStatuses).some(s => s === 'working')}
                        agentName={activeAgent}
                    />
                </div>
            </div>

            {/* Right Panel - Chat */}
            <ChatPanel messages={logs} />

            {/* GRISHA Monitor - Floating */}
            <GrishaMonitor isActive={activeAgent === 'GRISHA' || agentStatuses.GRISHA === 'working'} />

            {/* Version Tag */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 animate-fade-in z-30">
                <p className="text-[10px] font-mono text-slate-600 tracking-widest">
                    KONTUR OS <span className="text-cyan-500/50">v2.0</span>
                </p>
            </div>
        </div>
    )
}

export default App
