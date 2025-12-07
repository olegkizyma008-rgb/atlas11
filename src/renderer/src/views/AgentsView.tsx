import { AgentCard } from '../components/AgentCard'

export const AgentsView = () => {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Agent Status</h2>
                <p className="text-slate-400 text-sm">Detailed overview of all active agents</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <AgentCard name="ATLAS" status="working" activity="Connected to Synapse. Processing incoming signals and orchestrating agent activities." />
                <AgentCard name="TETYANA" status="idle" activity="Standing by. Ready to provide voice interface and user communication support." />
                <AgentCard name="GRISHA" status="working" activity="Monitoring stream. Analyzing security patterns and threat detection in real-time." />
            </div>
        </div>
    )
}
