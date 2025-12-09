import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider, LLMRequest, LLMResponse, ProviderName } from './types';

export class AnthropicProvider implements ILLMProvider {
    readonly name: ProviderName = 'anthropic';
    private client: Anthropic | null = null;
    private apiKey: string;
    private defaultModel: string;

    constructor(apiKey: string, defaultModel: string = 'claude-3-5-sonnet-20241022') {
        this.apiKey = apiKey;
        this.defaultModel = defaultModel;

        if (apiKey) {
            this.client = new Anthropic({ apiKey });
            console.log(`[ANTHROPIC PROVIDER] ✅ Initialized with model: ${defaultModel}`);
        } else {
            console.warn('[ANTHROPIC PROVIDER] ⚠️ No API key provided');
        }
    }

    isAvailable(): boolean {
        return !!this.client && !!this.apiKey;
    }

    getModels(): string[] {
        return ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'];
    }

    async fetchModels(): Promise<string[]> {
        // Anthropic doesn't have a public listModels endpoint in this SDK version
        return this.getModels();
    }

    async generate(request: LLMRequest): Promise<LLMResponse> {
        if (!this.client) {
            throw new Error('Anthropic provider not initialized');
        }

        const model = request.model || this.defaultModel;

        try {
            const response = await this.client.messages.create({
                model,
                max_tokens: request.maxTokens || 4096,
                system: request.systemPrompt,
                messages: [
                    { role: 'user', content: request.prompt }
                ],
                temperature: request.temperature || 0.7
            });

            // Handle content block response (Claude 3)
            let text = '';
            if (response.content && response.content.length > 0) {
                const firstBlock = response.content[0];
                if (firstBlock.type === 'text') {
                    text = firstBlock.text;
                }
            }

            const usage = response.usage;

            return {
                text,
                usage: usage ? {
                    promptTokens: usage.input_tokens,
                    completionTokens: usage.output_tokens,
                    totalTokens: usage.input_tokens + usage.output_tokens
                } : undefined,
                model,
                provider: this.name
            };

        } catch (error: any) {
            console.error(`[ANTHROPIC PROVIDER] ❌ Error:`, error.message);
            throw error;
        }
    }

}
