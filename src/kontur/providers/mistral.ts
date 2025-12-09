/**
 * Mistral Provider
 * Implements ILLMProvider for Mistral models
 */

import { Mistral } from '@mistralai/mistralai';
import { ILLMProvider, LLMRequest, LLMResponse, ProviderName } from './types';

export class MistralProvider implements ILLMProvider {
    readonly name: ProviderName = 'mistral';
    private client: Mistral | null = null;
    private apiKey: string;
    private defaultModel: string;

    constructor(apiKey: string, defaultModel: string = 'mistral-large-latest') {
        this.apiKey = apiKey;
        this.defaultModel = defaultModel;

        if (apiKey) {
            this.client = new Mistral({ apiKey });
            console.log(`[MISTRAL PROVIDER] ✅ Initialized with model: ${defaultModel}`);
        } else {
            console.warn('[MISTRAL PROVIDER] ⚠️ No API key provided');
        }
    }

    isAvailable(): boolean {
        return !!this.client && !!this.apiKey;
    }

    getModels(): string[] {
        return ['mistral-large-latest', 'mistral-medium', 'mistral-small', 'pixtral-12b'];
    }

    async fetchModels(): Promise<string[]> {
        if (!this.client) return this.getModels();
        try {
            const list = await this.client.models.list();
            return list.data.map((m: any) => m.id);
        } catch (e) {
            console.warn('[MISTRAL] Failed to fetch models:', e);
            return this.getModels();
        }
    }

    async generate(request: LLMRequest): Promise<LLMResponse> {
        if (!this.client) {
            throw new Error('Mistral provider not initialized');
        }

        const model = request.model || this.defaultModel;

        try {
            const response = await this.client.chat.complete({
                model,
                messages: [
                    { role: 'system', content: request.systemPrompt || '' },
                    { role: 'user', content: request.prompt }
                ],
                temperature: request.temperature || 0.7,
                responseFormat: request.responseFormat === 'json' ? { type: 'json_object' } : undefined
            });

            const text = response.choices?.[0]?.message?.content || '';
            const usage = response.usage;

            return {
                text: typeof text === 'string' ? text : JSON.stringify(text),
                usage: usage ? {
                    promptTokens: usage.promptTokens,
                    completionTokens: usage.completionTokens,
                    totalTokens: usage.totalTokens
                } : undefined,
                model,
                provider: this.name
            };

        } catch (error: any) {
            console.error(`[MISTRAL PROVIDER] ❌ Error:`, error.message);
            throw error;
        }
    }

}
