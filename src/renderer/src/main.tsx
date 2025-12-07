import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ipcLink } from 'electron-trpc/renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../../main/router'
import './main.css'

export const trpc = createTRPCReact<AppRouter>()
const queryClient = new QueryClient()
const trpcClient = trpc.createClient({
    links: [ipcLink()]
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </trpc.Provider>
    </React.StrictMode>
)
