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

    // KONTUR MIGRATION: This module is deprecated/broken. Use src/kontur/voice/VoiceCapsule.ts
    // Keeping interface but disabling implementation to fix build.

    async connect() {
        console.warn('VoiceCapsule (Old Module) is deprecated. Use KONTUR VoiceCapsule.');
    }

    private handleMessage(message: LiveServerMessage) {
        // Deprecated
    }

    private async startAudioPlaybackLoop() {
        // Deprecated
    }

    private playAudioChunk(chunk: Buffer): Promise<void> {
        return Promise.resolve();
    }


    async speak(args: any) {
        console.warn('VoiceCapsule (Old Module) speak() called. Ignoring.');
    }

    async listen(args: any) {
        console.warn('VoiceCapsule (Old Module) listen() called. Ignoring.');
        return { error: "Module deprecated" };
    }

    stopListening() {
        // Deprecated
    }
}
