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
                    Your job is to watch the video stream and identifying security risks, errors, or anomalies.
                    Speak UKRAINIAN (Українська). Be concise, analytical, and alert.
                    If you see a terminal error, shout "ALERT". 
                    If the screen is idle, say "Scanning... Stable".`
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

            this.session = await genAI.live.connect({
                model: this.config.model,
                config: this.config.generationConfig,
                systemInstruction: this.config.systemInstruction
            });

            this.isConnected = true;
            console.log('[GEMINI LIVE] ✅ Connected!');
            this.emit('connected');

            // Listen for incoming messages (Audio/Text from Gemini)
            this.receiveLoop();

        } catch (error) {
            console.error('[GEMINI LIVE] ❌ Connection failed:', error);
            this.emit('error', error);
        }
    }

    /**
     * Disconnect session
     */
    async disconnect() {
        if (this.session) {
            await this.session.close();
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

        this.session.sendRealtimeInput([{
            mimeType: "audio/pcm;rate=16000",
            data: base64Audio
        }]);
    }

    /**
     * Stream Video Frame (JPEG/PNG Base64)
     */
    sendVideoFrame(base64Image: string) {
        if (!this.isConnected || !this.session) return;

        // Gemini Live accepts image chunks for vision
        this.session.sendRealtimeInput([{
            mimeType: "image/jpeg",
            data: base64Image
        }]);
    }

    /**
     * Receive Loop - Handle incoming stream from Gemini
     */
    private async receiveLoop() {
        if (!this.session) return;

        try {
            for await (const message of this.session.receive()) {
                const msg = message as any; // Type casting for sdk quirks

                // Handle Audio Response
                if (msg.serverContent?.modelTurn?.parts) {
                    const parts = msg.serverContent.modelTurn.parts;
                    for (const part of parts) {
                        if (part.inlineData) {
                            // Audio chunk received
                            this.emit('audio', part.inlineData.data);
                        }
                        if (part.text) {
                            // Text transcript
                            console.log(`[GRISHA LIVE]: ${part.text}`);
                            this.emit('text', part.text);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[GEMINI LIVE] Receive Error:', err);
            this.disconnect();
        }
    }
}
