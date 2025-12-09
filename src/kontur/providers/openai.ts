/**
 * OpenAI Provider
 * Implements ILLMProvider for OpenAI models
 */

import OpenAI from 'openai';
import { ILLMProvider, LLMRequest, LLMResponse, ProviderName } from './types';

export class OpenAIProvider implements ILLMProvider {
    readonly name: ProviderName = 'openai';
    private client: OpenAI | null = null;
    private apiKey: string;
    private defaultModel: string;

    constructor(apiKey: string, defaultModel: string = 'gpt-4o') {
        this.apiKey = apiKey;
        this.defaultModel = defaultModel;

        if (apiKey) {
            this.client = new OpenAI({ apiKey });
            console.log(`[OPENAI PROVIDER] ✅ Initialized with model: ${defaultModel}`);
        } else {
            console.warn('[OPENAI PROVIDER] ⚠️ No API key provided');
        }
    }

    isAvailable(): boolean {
        return !!this.client && !!this.apiKey;
    }

    getModels(): string[] {
        return ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    }

    async fetchModels(): Promise<string[]> {
        if (!this.client) return this.getModels();
        try {
            const list = await this.client.models.list();
            return list.data.map(m => m.id).filter(id => id.includes('gpt'));
        } catch (e) {
            console.warn('[OPENAI] Failed to fetch models:', e);
            return this.getModels();
        }
    }

    async generate(request: LLMRequest): Promise<LLMResponse> {
        if (!this.client) {
            throw new Error('OpenAI provider not initialized');
        }

        const model = request.model || this.defaultModel;

        try {
            const response = await this.client.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: request.systemPrompt || '' },
                    { role: 'user', content: request.prompt }
                ],
                temperature: request.temperature || 0.7,
                response_format: request.responseFormat === 'json' ? { type: 'json_object' } : undefined
            });

            const text = response.choices[0]?.message?.content || '';
            const usage = response.usage;

            return {
                text,
                usage: usage ? {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens: usage.total_tokens
                } : undefined,
                model,
                provider: this.name
            };

        } catch (error: any) {
            console.error(`[OPENAI PROVIDER] ❌ Error:`, error.message);
            throw error;
        }
    }

}
