import { useState } from 'react'
import { Background } from './components/Background'
import { VoiceOrb } from './components/VoiceOrb'
import { ChatPanel } from './components/ChatPanel'
import { GrishaVisionFeed } from './components/GrishaVisionFeed'
import { LogPanel } from './components/LogPanel'
import { trpc } from './main'

interface Log {
    id: string
    source: string
    message: string
    timestamp: number
    type?: 'info' | 'success' | 'warning' | 'error'
}

type AgentStatus = 'idle' | 'working' | 'speaking' | 'listening' | 'error'

// Agent stages on the orbital path
const agentStages: Record<string, { angle: number; stage: string }> = {
    ATLAS: { angle: 180, stage: 'LISTENING' },
    TETYANA: { angle: 270, stage: 'PROCESSING' },
    GRISHA: { angle: 225, stage: 'SECURITY REVIEW' }
}

function App(): JSX.Element {
    const [logs, setLogs] = useState<Log[]>([])
    const [activeAgent, setActiveAgent] = useState<string>('ATLAS')
    const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({
        ATLAS: 'idle',
        TETYANA: 'idle',
        GRISHA: 'idle'
    })
    const [micEnabled, setMicEnabled] = useState(true)
    const [speakerEnabled, setSpeakerEnabled] = useState(true)
    const [grishaVisionStatus, setGrishaVisionStatus] = useState<'stable' | 'analyzing' | 'alert'>('stable')

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
                timestamp: Date.now(),
                type: source === 'GRISHA' && signal.payload?.includes?.('ALERT') ? 'warning' : 'info'
            }
            setLogs(prev => [...prev, newLog].slice(-100))

            // Update active agent and status based on signal
            if (['ATLAS', 'TETYANA', 'GRISHA'].includes(source)) {
                setActiveAgent(source)
                setAgentStatuses(prev => ({
                    ...prev,
                    [source]: 'working'
                }))

                // Update GRISHA vision status if needed
                if (source === 'GRISHA') {
                    if (signal.payload?.includes?.('THREAT') || signal.payload?.includes?.('ALERT')) {
                        setGrishaVisionStatus('alert')
                    } else if (signal.payload?.includes?.('analyzing') || signal.payload?.includes?.('scanning')) {
                        setGrishaVisionStatus('analyzing')
                    } else {
                        setGrishaVisionStatus('stable')
                    }
                }

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

    // Build orbital agents array
    const orbitalAgents = ['ATLAS', 'TETYANA', 'GRISHA'].map(name => ({
        name,
        status: agentStatuses[name],
        isActive: activeAgent === name,
        angle: agentStages[name].angle,
        stage: agentStages[name].stage
    }))

    const handleSendMessage = (text: string) => {
        // Add user message to logs
        const userLog: Log = {
            id: Math.random().toString(36),
            source: 'USER',
            message: text,
            timestamp: Date.now()
        }
        setLogs(prev => [...prev, userLog])
        // TODO: Send to backend via tRPC
    }

    return (
        <div className="h-screen w-screen overflow-hidden relative bg-[#0a0a0f]">
            {/* Background */}
            <Background />

            {/* GRISHA Live Vision Feed - Top Left */}
            <GrishaVisionFeed
                isActive={true}
                status={grishaVisionStatus}
            />

            {/* Log Panel - Bottom Left */}
            <LogPanel
                logs={logs.filter(l => ['ATLAS', 'TETYANA', 'SYSTEM'].includes(l.source))}
                title="TETYANA: TASK EXECUTING"
                status="STATUS OK"
            />

            {/* Center - Voice Orb with Orbital Agents */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="animate-fade-in" style={{ marginLeft: '40px' }}>
                    <VoiceOrb
                        isActive={Object.values(agentStatuses).some(s => s === 'working')}
                        agentName={activeAgent}
                        agents={orbitalAgents}
                    />
                </div>
            </div>

            {/* Right Panel - Chat with Controls */}
            <ChatPanel
                messages={logs}
                onSendMessage={handleSendMessage}
                onMicToggle={setMicEnabled}
                onSpeakerToggle={setSpeakerEnabled}
                micEnabled={micEnabled}
                speakerEnabled={speakerEnabled}
            />

            {/* Corner Labels */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
                <p className="text-[10px] font-mono text-slate-600 tracking-widest">
                    KONTUR OS <span className="text-cyan-500/50">v2.0</span>
                </p>
            </div>

            {/* Quadrant Labels */}
            <div className="absolute top-4 left-4 text-rose-400/50 text-xs font-bold z-10">A</div>
            <div className="absolute top-4 right-4 text-cyan-400/50 text-xs font-bold z-10 hidden">C</div>
            <div className="absolute bottom-4 left-4 text-emerald-400/50 text-xs font-bold z-10 hidden">D</div>
        </div>
    )
}

export default App
