import { Terminal } from '../components/Terminal'

interface Log {
    id: string
    source: string
    message: string
    timestamp: number
}

export const LogsView = ({ logs }: { logs: Log[] }) => {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">System Logs</h2>
            <p className="text-slate-400 text-sm">Real-time synapse stream monitoring</p>
            <Terminal logs={logs} />
        </div>
    )
}
