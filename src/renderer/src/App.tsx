import { useState, useEffect } from 'react'
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
        onData(signal) {
            const newLog = {
                id: Math.random().toString(36),
                source: signal.source.toUpperCase(),
                message: JSON.stringify(signal.payload),
                timestamp: Date.now()
            }
            setLogs(prev => [...prev, newLog].slice(-50)) // Keep last 50
        }
    })

    return (
        <Layout>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <AgentCard name="ATLAS" status="working" activity="Connected to Synapse." />
                <AgentCard name="TETYANA" status="idle" activity="Standing by." />
                <AgentCard name="GRISHA" status="working" activity="Monitoring stream." />
            </div>

            <div className="space-y-4">
                <h3 className="text-slate-400 font-bold text-xs tracking-widest uppercase">Live Synapse Feed</h3>
                <Terminal logs={logs} />
            </div>
        </Layout>
    )
}

export default App
