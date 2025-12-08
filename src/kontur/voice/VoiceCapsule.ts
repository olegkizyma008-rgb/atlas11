/**
 * Voice Capsule - Gemini TTS Integration
 * Handles Text-to-Speech using Gemini 2.5 Flash Preview TTS
 */

import { GoogleGenAI } from '@google/genai';

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
    private genAI: GoogleGenAI | null = null;
    private apiKey: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_LIVE_API_KEY || '';

        if (this.apiKey) {
            this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
            const keySource = apiKey ? 'Custom' :
                process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' :
                    process.env.GOOGLE_API_KEY ? 'GOOGLE_API_KEY' :
                        process.env.GEMINI_LIVE_API_KEY ? 'GEMINI_LIVE_API_KEY' : 'Unknown';
            console.log(`[VOICE CAPSULE] 🔊 Initialized with Gemini TTS (Key Source: ${keySource})`);
        } else {
            console.warn('[VOICE CAPSULE] ⚠️ No API key found (Checked: GEMINI_API_KEY, GOOGLE_API_KEY, GEMINI_LIVE_API_KEY)');
        }
    }

    /**
   * Generate single-speaker audio from text
   */
    async speak(text: string, config: TTSConfig = {}): Promise<ArrayBuffer | null> {
        if (!this.genAI) {
            console.error('[VOICE CAPSULE] ❌ Not initialized');
            return null;
        }

        try {
            const voiceName = config.voiceName || 'Kore'; // Default voice

            const response = await this.genAI.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName
                            }
                            // Enforce Ukrainian locale (model auto-detects from text, but good to note)
                            // locale: 'uk-UA' 
                        }
                    }
                }
            });

            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

            if (!audioData) {
                console.error('[VOICE CAPSULE] ❌ No audio data received');
                return null;
            }

            // Convert base64 to ArrayBuffer using Node.js Buffer
            const buffer = Buffer.from(audioData, 'base64');

            // Convert Node Buffer to ArrayBuffer
            // This is necessary because IPC might handle ArrayBuffer better than Node Buffer
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

            console.log('[VOICE CAPSULE] ✅ Generated audio:', arrayBuffer.byteLength, 'bytes');
            return arrayBuffer;
        } catch (error: any) {
            console.error('[VOICE CAPSULE] ❌ TTS error:', error.message);
            return null;
        }
    }

    /**
     * Generate multi-speaker audio from text
     */
    async speakMulti(text: string, config: MultiSpeakerConfig): Promise<ArrayBuffer | null> {
        if (!this.genAI) {
            console.error('[VOICE CAPSULE] ❌ Not initialized');
            return null;
        }

        try {
            const speakerVoiceConfigs = config.speakers.map(speaker => ({
                speaker: speaker.name,
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: speaker.voiceName
                    }
                }
            }));

            const response = await this.genAI.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        multiSpeakerVoiceConfig: {
                            speakerVoiceConfigs
                        }
                    }
                }
            });

            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

            if (!audioData) {
                console.error('[VOICE CAPSULE] ❌ No audio data received');
                return null;
            }

            // Convert base64 to ArrayBuffer using Node.js Buffer
            const buffer = Buffer.from(audioData, 'base64');

            // Convert Node Buffer to ArrayBuffer
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

            console.log('[VOICE CAPSULE] ✅ Generated multi-speaker audio:', arrayBuffer.byteLength, 'bytes');
            return arrayBuffer;
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
