import React from 'react'

export const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
            <div className="relative z-10 flex h-screen overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl p-4 flex flex-col gap-4">
                    <div className="flex items-center gap-2 px-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                        <h1 className="font-bold tracking-wider text-sm">ATLAS KONTUR</h1>
                    </div>
                    <nav className="flex-1 space-y-1">
                        {/* Nav items would go here */}
                    </nav>
                    <div className="text-xs text-slate-500 font-mono">
                        v2.0.0 KONTUR
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-auto p-6 scroll-smooth">
                    {children}
                </main>
            </div>
        </div>
    )
}
