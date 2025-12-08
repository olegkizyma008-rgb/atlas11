/**
 * ChatPanel Component - Enhanced Version
 * Unified theme with cyan/teal colors matching the overall design
 */
import { useEffect, useRef, useState } from 'react'

interface Message {
    id: string
    source: string
    message: string
    timestamp: number
}

interface ChatPanelProps {
    messages: Message[]
    onSendMessage?: (text: string) => void
    onMicToggle?: (enabled: boolean) => void
    onSpeakerToggle?: (enabled: boolean) => void
    micEnabled?: boolean
    speakerEnabled?: boolean
}

const theme = {
    primary: '#00d4ff',
    secondary: '#0891b2',
    glow: 'rgba(0, 212, 255, 0.3)'
}

const sourceColors: Record<string, string> = {
    ATLAS: '#a855f7',
    TETYANA: '#10b981',
    GRISHA: '#f43f5e',
    USER: '#00d4ff',
    SYSTEM: '#64748b'
}

export const ChatPanel = ({
    messages,
    onSendMessage,
    onMicToggle,
    onSpeakerToggle,
    micEnabled = true,
    speakerEnabled = true
}: ChatPanelProps) => {
    const endRef = useRef<HTMLDivElement>(null)
    const [inputText, setInputText] = useState('')
    const lastSpokenMessageId = useRef<string | null>(null)

    // Auto-scroll on new messages
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Audio Context - Persistent
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Initialize AudioContext lazily
    const getAudioContext = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioCtxRef.current;
    };

    // TTS: Speak ATLAS messages when speakerEnabled
    useEffect(() => {
        if (!speakerEnabled) {
            return
        }

        // Find the latest ATLAS message
        const atlasMessages = messages.filter(m => m.source === 'ATLAS')
        const latestAtlasMessage = atlasMessages[atlasMessages.length - 1]

        // Only speak if it's a new message
        if (latestAtlasMessage && latestAtlasMessage.id !== lastSpokenMessageId.current) {
            lastSpokenMessageId.current = latestAtlasMessage.id

            // Use Gemini TTS via IPC
            const speakWithGemini = async () => {
                try {
                    console.log('[CHAT] 🗣️ Requesting TTS for:', latestAtlasMessage.message.substring(0, 20) + '...');

                    // @ts-ignore
                    const result = await window.electron.ipcRenderer.invoke('voice:speak', {
                        text: latestAtlasMessage.message,
                        voiceName: 'Charon' // ATLAS voice (Male, Informative)
                    })

                    if (result.success && result.audioBuffer) {
                        console.log(`[CHAT] 🎧 Received TTS audio (${result.audioBuffer.byteLength || result.audioBuffer.length} bytes)`);
                        await playAudioBuffer(result.audioBuffer);
                    } else {
                        console.warn('[CHAT] ⚠️ TTS failed:', result.error);
                        throw new Error(result.error);
                    }

                } catch (error) {
                    console.error('[CHAT] ❌ Gemini TTS error:', error)
                    // Fallback to Web Speech API
                    if (window.speechSynthesis) {
                        window.speechSynthesis.cancel()
                        const utterance = new SpeechSynthesisUtterance(latestAtlasMessage.message)
                        utterance.lang = 'uk-UA'
                        window.speechSynthesis.speak(utterance)
                    }
                }
            }

            speakWithGemini()
        }
    }, [messages, speakerEnabled])

    // Audio Playback Helper
    const playAudioBuffer = async (bufferData: any) => {
        try {
            if (!bufferData) return;

            const ctx = getAudioContext();

            // Resume if suspended (browser autoplay policy)
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            // Handle different buffer types (Node Buffer vs ArrayBuffer)
            let arrayBuffer: ArrayBuffer;
            if (bufferData.buffer) {
                // It's likely a Node Buffer or Uint8Array
                // IMPORTANT: Use slice to copy underlying buffer section
                arrayBuffer = bufferData.buffer.slice(
                    bufferData.byteOffset,
                    bufferData.byteOffset + bufferData.byteLength
                );
            } else {
                arrayBuffer = bufferData;
            }

            // Try decodeAudioData first (Robust for MP3/WAV)
            try {
                // clone buffer because decodeAudioData detaches it
                const bufferCopy = arrayBuffer.slice(0);
                const audioBuffer = await ctx.decodeAudioData(bufferCopy);

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.start(0);
                console.log('[CHAT] 🔊 Playing TTS audio via decodeAudioData');
                return;
            } catch (decodeErr) {
                console.warn('[CHAT] decodeAudioData failed, trying PCM fallback...', decodeErr);
            }

            // Fallback: Assume Raw PCM 16-bit 24kHz (Gemini Native)
            console.log('[CHAT] ℹ️ Using Raw PCM 24kHz Fallback');
            const sampleRate = 24000;
            const int16Array = new Int16Array(arrayBuffer);
            const audioBuffer = ctx.createBuffer(1, int16Array.length, sampleRate);
            const channelData = audioBuffer.getChannelData(0);

            for (let i = 0; i < int16Array.length; i++) {
                channelData[i] = int16Array[i] / 32768.0;
            }

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start(0);
            console.log('[CHAT] 🔊 Playing TTS audio via PCM fallback');

        } catch (error) {
            console.error('[CHAT] ❌ Playback helper error:', error);
        }
    };

    const handleSend = () => {
        if (inputText.trim()) {
            onSendMessage?.(inputText.trim())
            setInputText('')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="absolute right-4 top-4 bottom-4 w-72 z-20 flex flex-col">
            {/* Header */}
            <div
                className="rounded-t-xl px-3 py-2 border-b"
                style={{
                    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(8, 145, 178, 0.05) 100%)',
                    borderColor: `${theme.primary}20`,
                    boxShadow: `inset 0 1px 0 ${theme.primary}10`
                }}
            >
                <div className="flex items-center gap-2">
                    <span style={{ color: theme.primary }} className="text-sm font-bold">C</span>
                    <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: theme.primary }}>
                        Live Chat & Event Log
                    </span>
                    <div className="flex-1" />
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: theme.primary }} />
                </div>
            </div>

            {/* Messages */}
            <div
                className="flex-1 overflow-hidden border-x"
                style={{
                    background: 'rgba(5, 5, 10, 0.9)',
                    borderColor: `${theme.primary}15`
                }}
            >
                <div className="h-full overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
                    {messages.length === 0 && (
                        <div className="text-center py-8" style={{ color: `${theme.primary}40` }}>
                            <div className="text-2xl mb-2">◉</div>
                            <div className="text-[10px] tracking-wider">AWAITING SIGNAL...</div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className="animate-fade-in group">
                            <div className="flex items-baseline gap-2">
                                <span className="text-[8px] font-mono" style={{ color: `${theme.primary}50` }}>
                                    [{new Date(msg.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    })}]
                                </span>
                                <span
                                    className="text-[9px] font-bold tracking-wider"
                                    style={{ color: sourceColors[msg.source] || theme.primary }}
                                >
                                    {msg.source}:
                                </span>
                            </div>
                            <p
                                className="text-[10px] leading-relaxed mt-0.5 pl-2 border-l-2 transition-colors"
                                style={{
                                    color: 'rgba(200, 220, 230, 0.8)',
                                    borderColor: `${sourceColors[msg.source] || theme.primary}20`
                                }}
                            >
                                {msg.message}
                            </p>
                        </div>
                    ))}
                    <div ref={endRef} />
                </div>
            </div>

            {/* Audio Controls & Input */}
            <div
                className="rounded-b-xl p-3 space-y-3 border"
                style={{
                    background: 'rgba(5, 5, 10, 0.95)',
                    borderColor: `${theme.primary}15`
                }}
            >
                {/* Audio Controls */}
                <div className="flex items-center justify-center gap-4">
                    {/* Mic Toggle */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onMicToggle?.(!micEnabled)}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative"
                            style={{
                                background: micEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                                border: `2px solid ${micEnabled ? '#10b981' : '#475569'}`,
                                boxShadow: micEnabled ? '0 0 20px rgba(16, 185, 129, 0.3)' : 'none'
                            }}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={micEnabled ? '#10b981' : '#475569'}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                />
                            </svg>
                        </button>
                        <span className="text-[8px] font-mono tracking-wider" style={{ color: micEnabled ? '#10b981' : '#475569' }}>
                            STT
                        </span>
                    </div>

                    <div className="w-px h-8" style={{ background: `${theme.primary}20` }} />

                    {/* Speaker Toggle */}
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono tracking-wider" style={{ color: speakerEnabled ? theme.primary : '#475569' }}>
                            TTS
                        </span>
                        <button
                            onClick={() => onSpeakerToggle?.(!speakerEnabled)}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
                            style={{
                                background: speakerEnabled ? `rgba(0, 212, 255, 0.15)` : 'rgba(100, 116, 139, 0.1)',
                                border: `2px solid ${speakerEnabled ? theme.primary : '#475569'}`,
                                boxShadow: speakerEnabled ? `0 0 20px ${theme.glow}` : 'none'
                            }}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={speakerEnabled ? theme.primary : '#475569'}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Text Input */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Введіть повідомлення..."
                        className="flex-1 rounded-lg px-3 py-2 text-[10px] placeholder-slate-600 transition-all focus:outline-none"
                        style={{
                            background: 'rgba(0, 20, 30, 0.5)',
                            border: `1px solid ${theme.primary}20`,
                            color: 'rgba(200, 220, 230, 0.9)'
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim()}
                        className="px-4 py-2 rounded-lg text-[10px] font-bold transition-all disabled:opacity-30"
                        style={{
                            background: `${theme.primary}20`,
                            color: theme.primary,
                            border: `1px solid ${theme.primary}30`
                        }}
                    >
                        ▶
                    </button>
                </div>
            </div>
        </div>
    )
}
