/**
 * Gemini TTS Provider
 * Implements ITTSProvider using Google GenAI SDK
 */

import { GoogleGenAI } from '@google/genai';
import { ITTSProvider, TTSRequest, TTSResponse, ProviderName } from './types';

export class GeminiTTSProvider implements ITTSProvider {
    readonly name: ProviderName = 'gemini';
    private client: GoogleGenAI | null = null;
    private apiKey: string;
    private defaultModel: string;

    constructor(apiKey: string, defaultModel: string = 'gemini-2.5-flash-preview-tts') {
        this.apiKey = apiKey;
        this.defaultModel = defaultModel;

        if (apiKey) {
            this.client = new GoogleGenAI({ apiKey });
            console.log(`[GEMINI TTS] 🔊 Initialized with model: ${defaultModel}`);
        } else {
            console.warn('[GEMINI TTS] ⚠️ No API key provided');
        }
    }

    isAvailable(): boolean {
        return !!this.client && !!this.apiKey;
    }

    async speak(request: TTSRequest): Promise<TTSResponse> {
        if (!this.client) {
            throw new Error('Gemini TTS provider not initialized');
        }

        const voiceName = request.voice || 'Kore';
        const model = this.defaultModel;

        try {
            const response = await this.client.models.generateContent({
                model,
                contents: [{ parts: [{ text: request.text }] }],
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
                throw new Error('No audio data received from Gemini TTS');
            }

            // Convert base64 to ArrayBuffer
            const buffer = Buffer.from(audioData, 'base64');
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

            return {
                audio: arrayBuffer,
                mimeType: 'audio/mp3', // Gemini usually returns generic audio, wrapper handles format
                provider: this.name
            };

        } catch (error: any) {
            console.error('[GEMINI TTS] ❌ Speak Error:', error.message);
            throw error;
        }
    }

    getVoices(): string[] {
        return ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];
    }

    async speakMulti(request: { text: string; speakers: { name: string; voice: string }[] }): Promise<TTSResponse> {
        if (!this.client) {
            throw new Error('Gemini TTS provider not initialized');
        }

        try {
            const speakerVoiceConfigs = request.speakers.map(s => ({
                speaker: s.name,
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: s.voice
                    }
                }
            }));

            const response = await this.client.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: [{ parts: [{ text: request.text }] }],
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
                throw new Error('No audio data received from Gemini TTS (Multi-speaker)');
            }

            const buffer = Buffer.from(audioData, 'base64');
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

            return {
                audio: arrayBuffer,
                mimeType: 'audio/mp3',
                provider: this.name
            };
        } catch (error: any) {
            console.error('[GEMINI TTS] ❌ Multi-speaker Speak Error:', error.message);
            throw error;
        }
    }
}
