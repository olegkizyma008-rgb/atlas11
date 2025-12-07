import { AgentCard } from '../components/AgentCard'
import { Terminal } from '../components/Terminal'

interface Log {
    id: string
    source: string
    message: string
    timestamp: number
}

export const DashboardView = ({ logs }: { logs: Log[] }) => {
    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <AgentCard name="ATLAS" status="working" activity="Connected to Synapse." />
                <AgentCard name="TETYANA" status="idle" activity="Standing by." />
                <AgentCard name="GRISHA" status="working" activity="Monitoring stream." />
            </div>

            <div className="space-y-4">
                <h3 className="text-slate-400 font-bold text-xs tracking-widest uppercase">Live Synapse Feed</h3>
                <Terminal logs={logs} />
            </div>
        </>
    )
}
