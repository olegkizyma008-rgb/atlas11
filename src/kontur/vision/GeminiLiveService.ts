/**
 * Gemini Live Service - Real-time Vision & Audio Bridge
 * Connects KONTUR to Gemini Live API via WebSockets
 */

import { GoogleGenAI, LiveServerMessage, Session, Modality } from '@google/genai';
import { EventEmitter } from 'events';
import WebSocket from 'ws';

// Polyfill WebSocket for Node.js environment if needed by SDK
global.WebSocket = WebSocket as any;

export class GeminiLiveService extends EventEmitter {
    private session: Session | null = null;
    private isConnected: boolean = false;
    private config: any;

    constructor(private apiKey: string) {
        super();
        this.config = {
            model: "gemini-2.5-flash-native-audio-preview-09-2025", // Latest multimodal model
            generationConfig: {
                responseModalities: [Modality.AUDIO, Modality.TEXT],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } // Grisha-like voice
                }
            },
            systemInstruction: {
                parts: [{
                    text: `You are GRISHA, the Security Observer of the KONTUR system. 
                    Your job is to watch the screen stream of the autonomous agent executing tasks.
                    Speak UKRAINIAN (Українська). Be concise, analytical, and alert.
                    1. VERIFY actions: confirm when you see typing, windows opening, or commands running.
                    2. DETECT errors: If you see a terminal error or unexpected behavior, shout "ALERT" and explain.
                    3. If the task is proceeding correctly, say "Спостерігаю виконання... Норма." or "Підтверджую дію."`
                }]
            }
        };
    }

    /**
     * Connect to Gemini Live Session
     */
    async connect() {
        if (this.isConnected) return;

        try {
            console.log('[GEMINI LIVE] 🔌 Connecting...');
            const genAI = new GoogleGenAI({ apiKey: this.apiKey });

            // Flattened config structure to fix deprecation warning
            const liveConfig = {
                responseModalities: this.config.generationConfig.responseModalities,
                speechConfig: this.config.generationConfig.speechConfig,
                systemInstruction: this.config.systemInstruction
            };

            // Let's retry connecting WITH callbacks to handle messages properly
            this.session = await genAI.live.connect({
                model: this.config.model,
                config: liveConfig,
                callbacks: {
                    onmessage: (msg: LiveServerMessage) => this.handleIncomingMessage(msg),
                    onerror: (err) => console.error('[GEMINI LIVE] Stream Error:', err),
                    onclose: (e) => {
                        console.log(`[GEMINI LIVE] Stream Closed. Code: ${e.code}, Reason: ${e.reason}`);
                        this.isConnected = false;
                        this.emit('disconnected');
                    }
                }
            });

            this.isConnected = true;
            console.log('[GEMINI LIVE] ✅ Connected!');
            this.emit('connected');

        } catch (error) {
            console.error('[GEMINI LIVE] ❌ Connection failed:', error);
            this.emit('error', error);
        }
    }

    private handleIncomingMessage(msg: LiveServerMessage) {
        if (msg.serverContent?.modelTurn?.parts) {
            const parts = msg.serverContent.modelTurn.parts;
            for (const part of parts) {
                if (part.inlineData) {
                    this.emit('audio', part.inlineData.data);
                }
                if (part.text) {
                    console.log(`[GRISHA LIVE]: ${part.text}`);
                    this.emit('text', part.text);
                }
            }
        }
    }

    /**
     * Disconnect session
     */
    async disconnect() {
        if (this.session) {
            // Check if close exists or end
            // this.session.close(); 
            // It seems 'close' might be the method, but let's be safe
            if (typeof this.session.close === 'function') {
                await this.session.close();
            }
            this.session = null;
            this.isConnected = false;
            console.log('[GEMINI LIVE] 🔌 Disconnected');
            this.emit('disconnected');
        }
    }

    /**
     * Stream Audio Input (PCM 16kHz)
     */
    sendAudioChunk(base64Audio: string) {
        if (!this.isConnected || !this.session) return;

        // Fix: Payload structure
        this.session.sendRealtimeInput({
            audio: {
                mimeType: "audio/pcm;rate=16000",
                data: base64Audio
            }
        });
    }

    /**
     * Stream Video Frame (JPEG/PNG Base64)
     */
    sendVideoFrame(base64Image: string) {
        if (!this.isConnected || !this.session) return;

        // Fix: Payload structure
        this.session.sendRealtimeInput({
            media: {
                mimeType: "image/jpeg",
                data: base64Image
            }
        });
    }
}
