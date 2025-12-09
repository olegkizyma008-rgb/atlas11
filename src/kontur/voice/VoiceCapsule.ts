import { getProviderRouter } from '../providers';
import { synapse } from '../synapse';
import { VoiceAPI } from './contract';

export interface TTSConfig {
    voiceName?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
}

export interface MultiSpeakerConfig {
    speakers: Array<{
        name: string;
        voiceName: string;
    }>;
}

export class VoiceCapsule implements VoiceAPI {
    private apiKey: string | undefined;

    constructor(apiKey?: string) {
        // Resolve API key with priority: explicit > GEMINI_API_KEY > GOOGLE_API_KEY > GEMINI_LIVE_API_KEY
        this.apiKey = apiKey
            || process.env.GEMINI_API_KEY
            || process.env.GOOGLE_API_KEY
            || process.env.GEMINI_LIVE_API_KEY;

        if (!this.apiKey) {
            console.warn('[VOICE CAPSULE] ⚠️ No API key found for TTS. Check GEMINI_API_KEY, GOOGLE_API_KEY, or GEMINI_LIVE_API_KEY.');
        }

        // Initialization handled by ProviderRouter
        // We trigger router initialization just in case
        console.log('[VOICE CAPSULE] 🔊 Initialized (Using ProviderRouter)');
        getProviderRouter();
    }

    /**
    * Generate single-speaker audio from text
    * Supports both modern (text, config) and legacy ({text, voice, speed}) signatures
    */
    async speak(textOrArgs: string | { text: string, voice?: string, speed?: number }, config: TTSConfig = {}): Promise<ArrayBuffer | null> {
        const router = getProviderRouter();
        const MAX_RETRIES = 3;

        // Parse arguments to support both signatures
        let text = '';
        let voiceName = config.voiceName;
        let speed = config.rate;

        if (typeof textOrArgs === 'object' && textOrArgs !== null) {
            text = textOrArgs.text;
            voiceName = textOrArgs.voice || voiceName;
            speed = textOrArgs.speed || speed;
        } else {
            text = textOrArgs as string;
        }

        // NOTE: Removed synapse emit - was causing unnecessary packet routing via bridge
        // synapse.emit('voice', 'request_tts', { text, voice: voiceName });

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await router.speak('tts', {
                    text,
                    voice: voiceName,
                    speed: speed
                });

                console.log(`[VOICE CAPSULE] ✅ Generated audio (Attempt ${attempt}):`, response.audio.byteLength, 'bytes');

                return response.audio;

            } catch (error: any) {
                console.warn(`[VOICE CAPSULE] ⚠️ TTS Attempt ${attempt} failed:`, error.message);
                // Wait briefly before retry
                await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            }
        }

        console.error('[VOICE CAPSULE] ❌ TTS failed after', MAX_RETRIES, 'attempts');
        return null;
    }

    /**
     * Generate multi-speaker audio from text
     */
    async speakMulti(text: string, config: MultiSpeakerConfig): Promise<ArrayBuffer | null> {
        const router = getProviderRouter();

        try {
            const response = await router.speakMulti('tts', {
                text,
                speakers: config.speakers.map(s => ({
                    name: s.name,
                    voice: s.voiceName
                }))
            });

            console.log('[VOICE CAPSULE] ✅ Generated multi-speaker audio:', response.audio.byteLength, 'bytes');
            return response.audio;
        } catch (error: any) {
            console.error('[VOICE CAPSULE] ❌ Multi-speaker TTS error:', error.message);
            return null;
        }
    }

    /**
     * Listen for audio input (Stub for VoiceAPI compatibility).
     * In KONTUR architecture, listening is handled by STTService or GeminiLiveService directly.
     * This stub exists to satisfy Tetyana's dependency contract.
     */
    async listen(args: { timeout?: number } = {}): Promise<{ text?: string; error?: string }> {
        console.warn('[VOICE CAPSULE] ⚠️ listen() called but not implemented in VoiceCapsule directly.');
        console.warn('[VOICE CAPSULE] Use GeminiLiveService or STTService for audio input.');
        // For now, return empty or error so caller knows it's not supported via this path
        return { error: 'Not implemented in KONTUR VoiceCapsule. Use STTService.' };
    }
}

// Singleton instance
let voiceCapsuleInstance: VoiceCapsule | null = null;

export function getVoiceCapsule(): VoiceCapsule {
    if (!voiceCapsuleInstance) {
        voiceCapsuleInstance = new VoiceCapsule();
    }
    return voiceCapsuleInstance;
}
