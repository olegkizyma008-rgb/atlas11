/**
 * Voice Capsule - TTS Integration via Provider Router
 * Handles Text-to-Speech using configured providers (Gemini, etc.)
 */

import { getProviderRouter } from '../providers';
import { synapse } from '../synapse';

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

export class VoiceCapsule {
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
    */
    async speak(text: string, config: TTSConfig = {}): Promise<ArrayBuffer | null> {
        const router = getProviderRouter();
        const MAX_RETRIES = 3;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await router.speak('tts', {
                    text,
                    voice: config.voiceName,
                    speed: config.rate
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
}

// Singleton instance
let voiceCapsuleInstance: VoiceCapsule | null = null;

export function getVoiceCapsule(): VoiceCapsule {
    if (!voiceCapsuleInstance) {
        voiceCapsuleInstance = new VoiceCapsule();
    }
    return voiceCapsuleInstance;
}
