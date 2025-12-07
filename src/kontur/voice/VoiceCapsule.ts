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
    private audioContext: AudioContext | null = null;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';

        if (this.apiKey) {
            this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
            console.log('[VOICE CAPSULE] 🔊 Initialized with Gemini TTS');
        } else {
            console.warn('[VOICE CAPSULE] ⚠️ No API key found');
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
                        }
                    }
                }
            });

            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

            if (!audioData) {
                console.error('[VOICE CAPSULE] ❌ No audio data received');
                return null;
            }

            // Convert base64 to ArrayBuffer
            const binaryString = atob(audioData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            console.log('[VOICE CAPSULE] ✅ Generated audio:', bytes.length, 'bytes');
            return bytes.buffer;
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

            // Convert base64 to ArrayBuffer
            const binaryString = atob(audioData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            console.log('[VOICE CAPSULE] ✅ Generated multi-speaker audio:', bytes.length, 'bytes');
            return bytes.buffer;
        } catch (error: any) {
            console.error('[VOICE CAPSULE] ❌ Multi-speaker TTS error:', error.message);
            return null;
        }
    }

    /**
     * Play audio buffer in browser
     */
    async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
        try {
            if (!this.audioContext) {
                this.audioContext = new AudioContext();
            }

            // Decode PCM to AudioBuffer
            // Gemini TTS returns 16-bit PCM at 24kHz
            const audioData = await this.decodePCM(audioBuffer);
            const source = this.audioContext.createBufferSource();
            source.buffer = audioData;
            source.connect(this.audioContext.destination);
            source.start(0);

            console.log('[VOICE CAPSULE] 🔊 Playing audio');
        } catch (error: any) {
            console.error('[VOICE CAPSULE] ❌ Playback error:', error.message);
        }
    }

    /**
     * Decode PCM data to AudioBuffer
     */
    private async decodePCM(pcmData: ArrayBuffer): Promise<AudioBuffer> {
        const sampleRate = 24000;
        const numChannels = 1;
        const int16Array = new Int16Array(pcmData);

        const audioBuffer = this.audioContext!.createBuffer(
            numChannels,
            int16Array.length,
            sampleRate
        );

        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < int16Array.length; i++) {
            channelData[i] = int16Array[i] / 32768.0; // Convert to float32 [-1, 1]
        }

        return audioBuffer;
    }

    /**
     * Stop any ongoing playback
     */
    stop(): void {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
            console.log('[VOICE CAPSULE] ⏹️ Stopped');
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
