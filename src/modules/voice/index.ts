import { VoiceAPI } from './contract';
import { synapse } from '../../kontur/synapse';
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
// import mic from 'mic';
// import Speaker from 'speaker';
import { Readable } from 'stream';

export class VoiceCapsule implements VoiceAPI {
    private session: Session | null = null;
    private micInstance: any;
    private speakerInstance: any;
    private isListening: boolean = false;
    private apiKey: string;
    private audioQueue: Buffer[] = [];
    private isPlaying: boolean = false;

    constructor() {
        this.apiKey = process.env.GEMINI_LIVE_API_KEY || process.env.GEMINI_API_KEY || '';
        if (!this.apiKey) {
            console.error("❌ VoiceCapsule: GEMINI_LIVE_API_KEY (or GEMINI_API_KEY) is missing!");
        }
    }

    async connect() {
        if (this.session) return;

        console.log("VOICE: Connecting to Gemini Live API...");
        const ai = new GoogleGenAI({ apiKey: this.apiKey });
        const model = 'models/gemini-2.0-flash-exp'; // Using experimental model for Live API

        const config = {
            responseModalities: [Modality.AUDIO],
            systemInstruction: "You are ATLAS, an advanced autonomous AI agent. Speak ONLY in Ukrainian. Be concise and professional.",
        };

        try {
            this.session = await ai.live.connect({
                model,
                config,
                callbacks: {
                    onopen: () => {
                        console.log('VOICE: ✅ Connected to Gemini Live API');
                        synapse.emit('voice', 'connected');
                    },
                    onmessage: (message: LiveServerMessage) => this.handleMessage(message),
                    onerror: (e: any) => console.error('VOICE: ❌ Error:', e.message),
                    onclose: (e: any) => console.log('VOICE: 🔒 Closed:', e.reason),
                },
            });

            this.startAudioPlaybackLoop();

        } catch (error) {
            console.error("VOICE: Failed to connect", error);
        }
    }

    private handleMessage(message: LiveServerMessage) {
        if (message.serverContent && message.serverContent.modelTurn && message.serverContent.modelTurn.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData && part.inlineData.data) {
                    const audioBuffer = Buffer.from(part.inlineData.data, 'base64');
                    this.audioQueue.push(audioBuffer);
                    synapse.emit('voice', 'speaking_started', { text: "Audio stream..." }); // Placeholder text
                }
            }
        }

        if (message.serverContent && message.serverContent.turnComplete) {
            synapse.emit('voice', 'speaking_finished');
        }
    }

    private async startAudioPlaybackLoop() {
        // Continuous loop to play audio from queue
        setInterval(async () => {
            if (this.audioQueue.length > 0 && !this.isPlaying) {
                this.isPlaying = true;
                const chunk = this.audioQueue.shift();
                if (chunk) {
                    await this.playAudioChunk(chunk);
                }
                this.isPlaying = false;
            }
        }, 10);
    }

    private playAudioChunk(chunk: Buffer): Promise<void> {
        return new Promise((resolve) => {
            if (!this.speakerInstance) {
                this.speakerInstance = new Speaker({
                    channels: 1,
                    bitDepth: 16,
                    sampleRate: 24000,
                });

                this.speakerInstance.on('error', (err: any) => {
                    console.error('Speaker Error:', err);
                    // Attempt to recover or ignore
                    this.speakerInstance = null;
                    resolve(); // Resolve to avoid hanging
                });
            }

            // Create a temporary readable stream for the chunk/buffer
            const bufferStream = new Readable();
            bufferStream.push(chunk);
            bufferStream.push(null);

            // Pipe to speaker, but since Speaker is a Writable, we write directly if we can,
            // or just rely on 'finish' event if we pipe. 
            // Issue: Speaker instance might need to be kept alive.
            // Simplified approach: WRITE directly.

            this.speakerInstance.write(chunk, (err: any) => {
                if (err) console.error("Speaker write error", err);
                resolve();
            });
        });
    }


    async speak(args: any) {
        // Cast args to expected type internally to satisfy interface strictness if needed, 
        // or just use 'any' in signature to match 'unknown' from Zod inference sometimes
        const typedArgs = args as { text: string; voice?: 'atlas' | 'tetyana' | 'grisha' };

        if (!this.session) await this.connect();

        console.log("VOICE: Speaking...", typedArgs.text);
        // Send text to the model to trigger audio response
        this.session?.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: typedArgs.text }] }],
            turnComplete: true
        });
    }

    async listen(args: any) {
        const typedArgs = args as { timeout?: number };

        if (!this.session) await this.connect();

        if (this.isListening) {
            console.warn("VOICE: Already listening.");
            return { error: "Already listening" };
        }

        console.log("VOICE: Listening...");
        synapse.emit('voice', 'listening_started', {});
        this.isListening = true;

        this.micInstance = mic({
            rate: '16000',
            channels: '1',
            debug: false,
            exitOnSilence: 6
        });

        const micInputStream = this.micInstance.getAudioStream();

        micInputStream.on('data', (data: any) => {
            if (!this.isListening) return;

            this.session?.sendRealtimeInput({
                audio: {
                    mimeType: "audio/pcm;rate=16000",
                    data: data.toString('base64')
                }
            } as any);
        });

        micInputStream.on('error', (err: any) => {
            console.error("Microphone error:", err);
            this.stopListening();
        });

        this.micInstance.start();

        // Stop listening after timeout (default 10s for now to avoid open mic)
        setTimeout(() => {
            this.stopListening();
        }, typedArgs.timeout || 10000);

        return { text: "Listening started..." }; // Async return
    }

    stopListening() {
        if (this.isListening && this.micInstance) {
            this.micInstance.stop();
            this.isListening = false;
            synapse.emit('voice', 'listening_finished');
            console.log("VOICE: Stopped listening.");
        }
    }
}
