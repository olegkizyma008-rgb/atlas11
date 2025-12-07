import { useState } from 'react'
import { Layout } from './components/Layout'
import { AgentCard } from './components/AgentCard'
import { Terminal } from './components/Terminal'
import { trpc } from './main'

interface Log {
    id: string
    source: string
    message: string
    timestamp: number
}

function App(): JSX.Element {
    const [logs, setLogs] = useState<Log[]>([])

    // Real-time connection to KONTUR Synapse
    trpc.synapse.useSubscription(undefined, {
        onData(signal: any) {
            const newLog = {
                id: Math.random().toString(36),
                source: signal.source?.toUpperCase() || 'UNKNOWN',
                message: typeof signal.payload === 'string' ? signal.payload : JSON.stringify(signal.payload),
                timestamp: Date.now()
            }
            setLogs(prev => [...prev, newLog].slice(-50)) // Keep last 50
        }
    })

    return (
        <Layout>
            <div className="space-y-4">
                {/* Agent Status Section */}
                <div className="space-y-2">
                    <h2 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Agent Status</h2>
                    <div className="space-y-1.5">
                        <AgentCard name="ATLAS" status="working" activity="Connected to Synapse." />
                        <AgentCard name="TETYANA" status="idle" activity="Standing by." />
                        <AgentCard name="GRISHA" status="working" activity="Monitoring stream." />
                    </div>
                </div>

                {/* Terminal Section */}
                <div className="space-y-2">
                    <h2 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">System Logs</h2>
                    <Terminal logs={logs} />
                </div>
            </div>
        </Layout>
    )
}

export default App

