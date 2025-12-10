/**
 * Gemini Vision Provider
 * Uses Google Gemini for image analysis
 * Fallback for when Copilot Vision is unavailable
 */

import { IVisionProvider, VisionRequest, VisionResponse, ProviderName } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiVisionProvider implements IVisionProvider {
    readonly name: ProviderName = 'gemini';
    private apiKey: string;
    private client: GoogleGenerativeAI;
    private model: string = 'gemini-2.0-flash';

    constructor(apiKey: string, model?: string) {
        if (!apiKey) {
            throw new Error('Gemini API key is required');
        }
        this.apiKey = apiKey;
        this.client = new GoogleGenerativeAI(apiKey);
        if (model) this.model = model;
    }

    isAvailable(): boolean {
        return !!this.apiKey;
    }

    async analyzeImage(request: VisionRequest): Promise<VisionResponse> {
        console.log('[GEMINI VISION] 🖼️ Analyzing image...');

        try {
            const model = this.client.getGenerativeModel({ model: this.model });

            const systemPrompt = `You are GRISHA, the Security Guardian of the ATLAS System.
Your task is to analyze screenshots and verify task execution.

RESPOND IN UKRAINIAN LANGUAGE ONLY.

Analyze the image for:
1. VERIFICATION: Did the requested action complete successfully?
2. SECURITY: Any phishing, fake dialogs, or suspicious elements?
3. ERRORS: Any error dialogs, crash screens, or warnings?
4. BLOCKERS: Popups that might block further actions?

Return JSON:
{
  "analysis": "Brief Ukrainian description of what you see",
  "anomalies": [
    { "type": "string", "severity": "low|medium|high", "description": "string", "location": "string" }
  ],
  "confidence": 0.0-1.0,
  "verified": true/false
}`;

            const userPrompt = request.prompt ||
                (request.taskContext
                    ? `Перевір виконання завдання: "${request.taskContext}". Що бачиш на екрані?`
                    : 'Проаналізуй цей скріншот. Що ти бачиш? Чи все в нормі?');

            // Convert base64 image to proper format for Gemini
            const imagePart = {
                inlineData: {
                    data: request.image,
                    mimeType: request.mimeType || 'image/jpeg'
                }
            };

            const response = await model.generateContent([
                systemPrompt,
                imagePart,
                userPrompt
            ]);

            const text = response.response.text();

            // Parse JSON response
            try {
                // Extract JSON from response (might be wrapped in markdown)
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        analysis: parsed.analysis || text,
                        anomalies: parsed.anomalies || [],
                        confidence: parsed.confidence || 0.8,
                        verified: parsed.verified ?? true,
                        provider: this.name
                    };
                }
            } catch (parseError) {
                console.warn('[GEMINI VISION] Failed to parse JSON response, using raw text');
            }

            // Fallback: return raw text analysis
            return {
                analysis: text,
                anomalies: [],
                confidence: 0.7,
                verified: !text.toLowerCase().includes('error') && !text.toLowerCase().includes('помилка'),
                provider: this.name
            };

        } catch (error: any) {
            console.error('[GEMINI VISION] ❌ Error:', error.message);
            throw error;
        }
    }

    getModels(): string[] {
        return [
            'gemini-2.0-flash',
            'gemini-1.5-pro',
            'gemini-1.5-flash'
        ];
    }

    async fetchModels(): Promise<string[]> {
        return this.getModels();
    }
}
