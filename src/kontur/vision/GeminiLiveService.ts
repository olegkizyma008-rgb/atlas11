/**
 * Gemini Live Service - Real-time Vision & Audio Bridge
 * Connects KONTUR to Gemini Live API via WebSockets
 */

import { GoogleGenAI, LiveServerMessage, Session, Modality, MediaResolution } from '@google/genai';
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
        // Model from official docs: gemini-2.5-flash-native-audio-preview-09-2025
        this.config = {
            model: "models/gemini-2.5-flash-native-audio-preview-09-2025", // Adding models/ prefix back
            generationConfig: {
                responseModalities: [Modality.AUDIO, Modality.TEXT],
                // mediaResolution removed for debug
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } // Official voice from docs
                },
                // Context window compression for long sessions
                contextWindowCompression: {
                    triggerTokens: '25600',
                    slidingWindow: { targetTokens: '12800' }
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

            // Flattened config structure as per official docs
            const liveConfig = {
                responseModalities: [Modality.AUDIO], // TEXT is not supported in responseModalities for Live API yet
                speechConfig: this.config.generationConfig.speechConfig,
                systemInstruction: `ВАЖЛИВО: ТИ МАЄШ ГОВОРИТИ ТІЛЬКИ УКРАЇНСЬКОЮ МОВОЮ. НІКОЛИ НЕ ВИКОРИСТОВУЙ АНГЛІЙСЬКУ.

Ти - ГРІША (GRISHA), Охоронець системи KONTUR. Твоя задача - перевіряти виконання завдань.

ПРОТОКОЛ ВІДПОВІДЕЙ (ТІЛЬКИ УКРАЇНСЬКА!):
1. Якщо дія ВИКОНАНА: Скажи коротко "Виконано: [опис]". Приклад: "Виконано: відкрито калькулятор".
2. Якщо дія НЕ виконана: Скажи "НЕ Виконано: [опис помилки]".
3. НЕ використовуй англійську мову. Всі відповіді - українською.`
            };

            // Let's retry connecting WITH callbacks to handle messages properly
            this.session = await genAI.live.connect({
                model: this.config.model,
                config: liveConfig,
                callbacks: {
                    onmessage: (msg: LiveServerMessage) => this.handleIncomingMessage(msg),
                    onerror: (err) => console.error('[GEMINI LIVE] Stream Error:', err),
                    onclose: (e) => {
                        const reason = e.reason || '';
                        const code = e.code;

                        // DEBUG: Full dump of close event
                        console.log('[GEMINI LIVE] 🔌 CLOSE EVENT DUMP:', JSON.stringify({ code: e.code, reason: e.reason, wasClean: e.wasClean }, null, 2));
                        // Debug: log actual close reason
                        console.log(`[GEMINI LIVE] 🔌 Connection closed. Code: ${code}, Reason: "${reason}"`);

                        // Check for specific error conditions
                        if (reason.toLowerCase().includes('expired')) {
                            console.error('\n\n[CRITICAL ERROR] 🛑 GEMINI API KEY EXPIRED');
                            console.error('Please renew your API key in the .env file immediately.');
                            console.error('Visit: https://aistudio.google.com/app/apikey\n\n');
                            this.emit('error', new Error('API_KEY_EXPIRED'));
                        } else if (code === 1011 || reason.toLowerCase().includes('quota')) {
                            console.error('\n\n[CRITICAL ERROR] 🛑 GEMINI QUOTA EXCEEDED');
                            console.error('You have hit the usage limits for your API Key.');
                            console.error('Please check billing/quota at: https://aistudio.google.com/app/apikey\n\n');
                            this.emit('error', new Error('QUOTA_EXCEEDED'));
                        } else if (code === 1008 || reason.toLowerCase().includes('model')) {
                            console.error('\n\n[CRITICAL ERROR] 🛑 MODEL NOT FOUND OR ACCESS DENIED');
                            console.error(`Model: ${this.config.model}`);
                            console.error('The preview model may require special access.\n\n');
                            this.emit('error', new Error('MODEL_ACCESS_DENIED'));
                        } else if (code === 1007) {
                            console.error('\n\n[CRITICAL ERROR] 🛑 INVALID ARGUMENT / CONFIGURATION');
                            console.error('The configuration sent to Gemini Live API is invalid (Code 1007).');
                            console.error('Checking model compatibility...\n\n');
                            this.emit('error', new Error('INVALID_CONFIG'));
                        } else if (reason) {
                            console.warn(`[GEMINI LIVE] ⚠️ Closed with reason: ${reason}`);
                        }

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
        // Check for turn completion (Grisha finished speaking)
        if (msg.serverContent?.turnComplete) {
            console.log('[GEMINI LIVE] ✅ Turn complete - Grisha finished speaking');
            this.emit('turnComplete');
        }

        if (msg.serverContent?.modelTurn?.parts) {
            const parts = msg.serverContent.modelTurn.parts;
            for (const part of parts) {
                if (part.inlineData) {
                    console.log('[GEMINI LIVE] 🔊 Audio chunk received');
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
     * Trigger generation with text (useful for starting conversation)
     */
    sendText(text: string) {
        if (!this.isConnected || !this.session) return;
        this.session.sendClientContent({
            turns: [{ parts: [{ text }] }]
        });
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
