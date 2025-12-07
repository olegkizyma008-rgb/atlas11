export const SettingsView = () => {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
                <p className="text-slate-400 text-sm">Configure ATLAS system preferences</p>
            </div>

            <div className="glass-card p-6 rounded-2xl space-y-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">System Configuration</h3>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/40 border border-white/5">
                            <div>
                                <div className="font-medium text-white">Auto-start on Login</div>
                                <div className="text-sm text-slate-400">Launch ATLAS automatically when system starts</div>
                            </div>
                            <div className="w-12 h-6 bg-slate-700 rounded-full relative cursor-not-allowed opacity-50">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full transition-transform"></div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/40 border border-white/5">
                            <div>
                                <div className="font-medium text-white">Voice Interface</div>
                                <div className="text-sm text-slate-400">Enable TETYANA voice assistant</div>
                            </div>
                            <div className="w-12 h-6 bg-indigo-500 rounded-full relative cursor-not-allowed opacity-50">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"></div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/40 border border-white/5">
                            <div>
                                <div className="font-medium text-white">Security Monitoring</div>
                                <div className="text-sm text-slate-400">GRISHA real-time threat detection</div>
                            </div>
                            <div className="w-12 h-6 bg-indigo-500 rounded-full relative cursor-not-allowed opacity-50">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                    <p className="text-xs text-slate-500 italic">Settings configuration coming soon...</p>
                </div>
            </div>
        </div>
    )
}
