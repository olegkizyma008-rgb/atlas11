/**
 * GrishaVisionFeed Component
 * Live vision feed window showing what GRISHA is monitoring
 * Supports webcam or screen capture via Gemini Live API
 */
import { useEffect, useRef, useState } from 'react'

interface GrishaVisionFeedProps {
    isActive: boolean
    status?: 'stable' | 'analyzing' | 'alert'
}

export const GrishaVisionFeed = ({ isActive, status = 'stable' }: GrishaVisionFeedProps) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [streamActive, setStreamActive] = useState(false)
    const [streamType, setStreamType] = useState<'camera' | 'screen'>('camera')

    const statusColors = {
        stable: { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981', text: 'text-emerald-400' },
        analyzing: { bg: 'rgba(234, 179, 8, 0.1)', border: '#eab308', text: 'text-yellow-400' },
        alert: { bg: 'rgba(244, 63, 94, 0.1)', border: '#f43f5e', text: 'text-rose-400' }
    }

    const currentStatus = statusColors[status]

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

    const stopStream = () => {
        if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
            tracks.forEach(track => track.stop())
            videoRef.current.srcObject = null
            setStreamActive(false)
        }
    }

    useEffect(() => {
        return () => stopStream()
    }, [])

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
                    <span className="text-rose-400 text-sm">◎</span>
                    <span className="text-[10px] font-bold text-rose-300 tracking-wider uppercase flex-1">
                        GRISHA: Live Vision Feed
                    </span>
                    <span className="text-[9px] font-bold text-rose-400">A</span>
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
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <div className="text-slate-600 text-[10px] mb-2">Оберіть джерело:</div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => startStream('camera')}
                                    className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-rose-500/30 text-rose-400 text-[9px] font-mono
                                        hover:bg-rose-500/20 hover:border-rose-500/50 transition-all flex items-center gap-1.5"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                    </svg>
                                    КАМЕРА
                                </button>
                                <button
                                    onClick={() => startStream('screen')}
                                    className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-rose-500/30 text-rose-400 text-[9px] font-mono
                                        hover:bg-rose-500/20 hover:border-rose-500/50 transition-all flex items-center gap-1.5"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                        />
                                    </svg>
                                    ЕКРАН
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
                {streamActive && (
                    <div className="px-3 py-2 flex items-center justify-between border-t" style={{ borderColor: `${currentStatus.border}20` }}>
                        <span className="text-[9px] text-slate-500 font-mono">
                            {streamType === 'camera' ? '📷 Camera Feed' : '🖥️ Screen Feed'}
                        </span>
                        <button
                            onClick={stopStream}
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
