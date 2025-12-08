/**
 * STT Service - Standard Speech-to-Text
 * Uses Gemini 2.5 Flash for audio transcription as per docs/STT.md
 */

import { GoogleGenAI } from '@google/genai';

export class STTService {
    private genAI: GoogleGenAI;
    private model = 'gemini-2.5-flash';

    constructor(apiKey?: string) {
        const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
        if (!key) {
            console.error('[STT Service] ❌ No API key found');
        }
        this.genAI = new GoogleGenAI({ apiKey: key });
    }

    /**
     * Transcribe audio data (base64)
     * @param audioBase64 Base64 encoded audio data
     * @param mimeType Mime type of the audio (e.g., 'audio/mp3', 'audio/wav')
     */
    async transcribe(audioBase64: string, mimeType: string = 'audio/wav'): Promise<string> {
        try {
            console.log(`[STT Service] 🎤 Transcribing audio (${audioBase64.length} bytes)...`);

            const response = await this.genAI.models.generateContent({
                model: this.model,
                contents: [
                    {
                        parts: [
                            { text: "Generate a transcript of the speech." },
                            {
                                inlineData: {
                                    mimeType: mimeType,
                                    data: audioBase64
                                }
                            }
                        ]
                    }
                ]
            });

            const transcript = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log(`[STT Service] ✅ Transcript: "${transcript}"`);
            return transcript;

        } catch (error: any) {
            console.error('[STT Service] ❌ Transcription failed:', error.message);
            throw error;
        }
    }
}

// Singleton for easy access
let sttInstance: STTService | null = null;
export function getSTTService(): STTService {
    if (!sttInstance) {
        sttInstance = new STTService();
    }
    return sttInstance;
}
