import React from 'react'
import { Monitor, Cpu, Terminal as TerminalIcon, Settings } from 'lucide-react'

export const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
            <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none z-50"></div>
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 flex h-screen">
                {/* Sidebar */}
                <aside className="w-20 lg:w-64 border-r border-white/5 bg-slate-900/40 backdrop-blur-2xl flex flex-col items-center lg:items-stretch py-6 gap-8">
                    <div className="flex items-center justify-center lg:justify-start lg:px-6 gap-3 group">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-blue-600 shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center">
                                <Cpu className="w-5 h-5 text-white" />
                            </div>
                            <div className="absolute inset-0 bg-indigo-500/50 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        </div>
                        <div className="hidden lg:block">
                            <h1 className="font-bold tracking-widest text-lg font-mono text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">ATLAS</h1>
                            <p className="text-[10px] text-slate-500 font-mono tracking-[0.2em]">KONTUR OS v2.0</p>
                        </div>
                    </div>

                    <nav className="flex-1 flex flex-col gap-2 px-3">
                        <NavItem icon={<Monitor />} label="Dashboard" active />
                        <NavItem icon={<TerminalIcon />} label="System Logs" />
                        <NavItem icon={<Cpu />} label="Agent Status" />
                        <div className="flex-1" />
                        <NavItem icon={<Settings />} label="Settings" />
                    </nav>

                    <div className="px-6 hidden lg:block">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/5">
                            <div className="text-xs text-slate-400 font-mono mb-2">SYSTEM STATUS</div>
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                ONLINE
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-auto p-4 lg:p-8 scroll-smooth scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}

function NavItem({ icon, label, active }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <button className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${active ? 'bg-white/10 text-white shadow-lg shadow-indigo-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />}
            <div className="relative z-10">{React.cloneElement(icon as React.ReactElement, { size: 20 })}</div>
            <span className="hidden lg:block font-medium tracking-wide relative z-10">{label}</span>
            {active && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-transparent opacity-50" />}
        </button>
    )
}
