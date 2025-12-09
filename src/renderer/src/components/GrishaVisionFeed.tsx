/**
 * GrishaVisionFeed Component
 * Live vision feed window showing what GRISHA is monitoring
 * Supports both LIVE (Gemini streaming) and ON-DEMAND (Copilot/GPT-4o) modes
 * Supports webcam, screen capture, or specific window capture
 * Can auto-select source based on current task
 */
import { useEffect, useRef, useState } from 'react'

interface SourceInfo {
    id: string
    name: string
    thumbnail: string
    isScreen: boolean
}

interface GrishaVisionFeedProps {
    isActive: boolean
    status?: 'stable' | 'analyzing' | 'alert'
    targetApp?: string // Auto-select window by app name (e.g., "Terminal", "Calculator")
    activeSource?: { id: string; name: string } // Explicit source from backend
}

export const GrishaVisionFeed = ({ isActive, status = 'stable', targetApp, activeSource }: GrishaVisionFeedProps) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [streamActive, setStreamActive] = useState(false)
    const [streamType, setStreamType] = useState<'camera' | 'screen' | 'window'>('camera')
    const [sources, setSources] = useState<SourceInfo[]>([])
    const [showSourcePicker, setShowSourcePicker] = useState(false)
    const [selectedSource, setSelectedSource] = useState<SourceInfo | null>(null)

    // Vision mode and status
    const [visionMode, setVisionMode] = useState<'live' | 'on-demand'>('live')
    const [modelStatus, setModelStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected')
    const [modelError, setModelError] = useState<string | null>(null)

    const statusColors = {
        stable: { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981', text: 'text-emerald-400' },
        analyzing: { bg: 'rgba(234, 179, 8, 0.1)', border: '#eab308', text: 'text-yellow-400' },
        alert: { bg: 'rgba(244, 63, 94, 0.1)', border: '#f43f5e', text: 'text-rose-400' }
    }

    const currentStatus = statusColors[status]
    const electron = (window as any).electron

    // Poll model status every 2 seconds
    useEffect(() => {
        const pollModelStatus = async () => {
            try {
                const result = await electron.ipcRenderer.invoke('vision:get_model_status')
                setModelStatus(result.status)
                setModelError(result.error)
                if (result.mode) {
                    setVisionMode(result.mode)
                }
            } catch (err) {
                setModelStatus('error')
                setModelError('IPC Error')
            }
        }

        pollModelStatus() // Initial check
        const interval = setInterval(pollModelStatus, 2000)
        return () => clearInterval(interval)
    }, [electron])

    // Load available sources
    const loadSources = async () => {
        try {
            const result = await electron.ipcRenderer.invoke('vision:get_sources')
            setSources(result)

            // Auto-select if targetApp is specified
            if (targetApp && result.length > 0) {
                const matched = result.find((s: SourceInfo) =>
                    s.name.toLowerCase().includes(targetApp.toLowerCase())
                )
                if (matched) {
                    startWindowStream(matched)
                }
            }
            return result;
        } catch (err) {
            console.error('Failed to load sources:', err)
            return [];
        }
    }

    // Start camera/screen stream
    const startStream = async (type: 'camera' | 'screen') => {
        try {
            let stream: MediaStream

            if (type === 'camera') {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 320, height: 180 },
                    audio: false
                })
            } else {
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: { width: 320, height: 180 },
                    audio: false
                })
            }

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                setStreamActive(true)
                setStreamType(type)
            }
        } catch (err) {
            console.error('Failed to start stream:', err)
        }
    }

    // Start specific window stream using desktopCapturer source
    const startWindowStream = async (source: SourceInfo) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: source.id,
                        maxWidth: 320,
                        maxHeight: 180
                    }
                } as any
            })

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                setStreamActive(true)
                setStreamType('window')
                setSelectedSource(source)
                setShowSourcePicker(false)

                // Notify backend Vision service about selected source
                electron.ipcRenderer.invoke('vision:select_source', {
                    sourceId: source.id,
                    sourceName: source.name
                })
            }
        } catch (err) {
            console.error('Failed to start window stream:', err)
        }
    }

    const stopStream = () => {
        if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
            tracks.forEach(track => track.stop())
            videoRef.current.srcObject = null
            setStreamActive(false)
            setSelectedSource(null)
        }
    }

    // Auto-start based on targetApp
    useEffect(() => {
        if (isActive && targetApp) {
            loadSources()
        }
    }, [isActive, targetApp])

    // Auto-switch to activeSource from backend
    // Auto-switch to activeSource from backend
    useEffect(() => {
        if (isActive && activeSource && activeSource.id) {
            console.log("🔄 [FEED] Auto-switching requested:", activeSource);

            const switchSource = async () => {
                // 1. Stop current stream if any
                stopStream();

                // 2. Load sources to find match
                let currentSources = await loadSources();
                // Simple retry loop (3 attempts)
                for (let i = 0; i < 3; i++) {
                    const match = currentSources.find((s: any) => s.id === activeSource.id || s.name === activeSource.name);

                    if (match) {
                        console.log("✅ [FEED] Source match found:", match.name);
                        await startWindowStream(match);
                        return;
                    }

                    console.warn(`⚠️ [FEED] Source not found (attempt ${i + 1}), retrying...`);
                    await new Promise(r => setTimeout(r, 1000));
                    currentSources = await loadSources();
                }
                console.error("❌ [FEED] Failed to find source after retries:", activeSource);
            };

            switchSource();
        }
    }, [activeSource]); // Removed isActive dependency to force switch even if re-rendering

    // Send frames to Grisha Brain
    useEffect(() => {
        let interval: NodeJS.Timeout

        if (streamActive && videoRef.current) {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            interval = setInterval(() => {
                const video = videoRef.current
                if (!video || !ctx) return

                canvas.width = 320
                canvas.height = 180
                ctx.drawImage(video, 0, 0, 320, 180)

                const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1]
                electron.ipcRenderer.invoke('vision:stream_frame', { image: base64 })
            }, 1000)
        }

        return () => {
            if (interval) clearInterval(interval)
            stopStream()
        }
    }, [streamActive])

    if (!isActive) return null

    return (
        <div className="absolute left-4 top-4 w-80 z-30 animate-fade-in">
            <div
                className="rounded-xl overflow-hidden"
                style={{
                    background: 'rgba(10, 10, 15, 0.95)',
                    border: `1px solid ${currentStatus.border}40`,
                    boxShadow: `0 0 30px ${currentStatus.border}20`
                }}
            >
                {/* Header */}
                <div
                    className="px-3 py-2 flex items-center gap-2 border-b"
                    style={{
                        background: currentStatus.bg,
                        borderColor: `${currentStatus.border}30`
                    }}
                >
                    {/* Model Status Indicator */}
                    <div
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${modelStatus === 'connected' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' :
                            modelStatus === 'connecting' ? 'bg-yellow-400 animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.6)]' :
                                'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'
                            }`}
                        title={modelError ? `Помилка: ${modelError}` : `${visionMode === 'live' ? 'Gemini Live' : 'Copilot'}: ${modelStatus}`}
                    />
                    <span className={visionMode === 'on-demand' ? 'text-cyan-400 text-sm' : 'text-rose-400 text-sm'}>◎</span>
                    <span className="text-[10px] font-bold text-rose-300 tracking-wider uppercase flex-1">
                        GRISHA: {visionMode === 'live' ? 'Live Stream' : 'On-Demand'}
                    </span>
                    <span className={`text-[9px] font-bold ${visionMode === 'on-demand' ? 'text-cyan-400' : 'text-rose-400'}`}>
                        {visionMode === 'live' ? 'LIVE' : 'OD'}
                    </span>
                </div>

                {/* Status bar */}
                <div
                    className="px-3 py-1 border-b flex items-center gap-2"
                    style={{ borderColor: `${currentStatus.border}20` }}
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'stable' ? 'bg-emerald-400' :
                        status === 'analyzing' ? 'bg-yellow-400 animate-pulse' :
                            'bg-rose-400 animate-ping'
                        }`} />
                    <span className={`text-[9px] font-mono uppercase tracking-wider ${currentStatus.text}`}>
                        {status === 'stable' ? 'STABLE' : status === 'analyzing' ? 'ANALYZING...' : 'ALERT!'}
                    </span>
                    {selectedSource && (
                        <span className="text-[8px] text-slate-500 ml-auto truncate max-w-[100px]">
                            {selectedSource.name}
                        </span>
                    )}
                </div>

                {/* Video feed area */}
                <div className="relative aspect-video bg-slate-950">
                    {streamActive ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    ) : showSourcePicker ? (
                        /* Window/Source Picker */
                        <div className="absolute inset-0 overflow-y-auto p-2 grid grid-cols-2 gap-1">
                            {sources.map(source => (
                                <button
                                    key={source.id}
                                    onClick={() => startWindowStream(source)}
                                    className="flex flex-col items-center p-1 rounded bg-slate-800/50 border border-rose-500/20
                                        hover:bg-rose-500/20 hover:border-rose-500/50 transition-all"
                                >
                                    <img
                                        src={source.thumbnail}
                                        alt={source.name}
                                        className="w-full h-10 object-cover rounded"
                                    />
                                    <span className="text-[7px] text-slate-400 truncate w-full text-center mt-1">
                                        {source.name.slice(0, 20)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* Source Selection Buttons */
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <div className="text-slate-600 text-[10px] mb-2">Оберіть джерело:</div>
                            <div className="flex gap-2 flex-wrap justify-center">
                                <button
                                    onClick={() => startStream('camera')}
                                    className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-rose-500/30 text-rose-400 text-[9px] font-mono
                                        hover:bg-rose-500/20 hover:border-rose-500/50 transition-all flex items-center gap-1.5"
                                >
                                    📷 КАМЕРА
                                </button>
                                <button
                                    onClick={() => startStream('screen')}
                                    className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-rose-500/30 text-rose-400 text-[9px] font-mono
                                        hover:bg-rose-500/20 hover:border-rose-500/50 transition-all flex items-center gap-1.5"
                                >
                                    🖥️ ЕКРАН
                                </button>
                                <button
                                    onClick={() => { loadSources(); setShowSourcePicker(true); }}
                                    className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-cyan-500/30 text-cyan-400 text-[9px] font-mono
                                        hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all flex items-center gap-1.5"
                                >
                                    🪟 ВІКНО
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Scan line effect */}
                    {streamActive && (
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)'
                            }}
                        />
                    )}

                    {/* Corner markers */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2" style={{ borderColor: currentStatus.border }} />
                    <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2" style={{ borderColor: currentStatus.border }} />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2" style={{ borderColor: currentStatus.border }} />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2" style={{ borderColor: currentStatus.border }} />
                </div>

                {/* Controls */}
                {(streamActive || showSourcePicker) && (
                    <div className="px-3 py-2 flex items-center justify-between border-t" style={{ borderColor: `${currentStatus.border}20` }}>
                        <span className="text-[9px] text-slate-500 font-mono">
                            {streamType === 'camera' ? '📷 Camera' :
                                streamType === 'screen' ? '🖥️ Screen' :
                                    `🪟 ${selectedSource?.name.slice(0, 15) || 'Window'}`}
                        </span>
                        <button
                            onClick={() => { stopStream(); setShowSourcePicker(false); }}
                            className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-[9px] font-mono
                                hover:bg-rose-500/30 transition-all"
                        >
                            STOP
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
