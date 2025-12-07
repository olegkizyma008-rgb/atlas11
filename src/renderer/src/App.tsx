import { useState } from 'react'
import { Layout, View } from './components/Layout'
import { DashboardView } from './views/DashboardView'
import { LogsView } from './views/LogsView'
import { AgentsView } from './views/AgentsView'
import { SettingsView } from './views/SettingsView'
import { trpc } from './main'

interface Log {
    id: string
    source: string
    message: string
    timestamp: number
}

function App(): JSX.Element {
    const [logs, setLogs] = useState<Log[]>([])
    const [currentView, setCurrentView] = useState<View>('dashboard')

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

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <DashboardView logs={logs} />
            case 'logs':
                return <LogsView logs={logs} />
            case 'agents':
                return <AgentsView />
            case 'settings':
                return <SettingsView />
            default:
                return <DashboardView logs={logs} />
        }
    }

    return (
        <Layout activeView={currentView} onNavigate={setCurrentView}>
            {renderView()}
        </Layout>
    )
}

export default App
