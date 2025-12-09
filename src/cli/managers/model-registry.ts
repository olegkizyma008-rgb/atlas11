import {
    ProviderName,
    GeminiProvider,
    OpenAIProvider,
    AnthropicProvider,
    MistralProvider,
    VSCodeCopilotProvider
} from '../../kontur/providers';

export interface ModelInfo {
    id: string;
    name: string;
    description?: string;
}

export class ModelRegistry {
    private models: Record<string, ModelInfo[]> = {
        gemini: [
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
            { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' }
        ],
        openai: [
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
        ],
        anthropic: [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
        ],
        mistral: [
            { id: 'mistral-large-latest', name: 'Mistral Large' },
            { id: 'mistral-medium', name: 'Mistral Medium' },
            { id: 'mistral-small', name: 'Mistral Small' }
        ],
        copilot: [
            { id: 'gpt-4.1', name: 'GPT-4.1' },
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-5-mini', name: 'GPT-5 mini' },
            { id: 'grok-code-fast-1', name: 'Grok Code Fast 1' },
            { id: 'raptor-mini', name: 'Raptor mini (Preview)' },
            { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5' },
            { id: 'claude-opus-4.5', name: 'Claude Opus 4.5 (Preview)' },
            { id: 'claude-sonnet-4', name: 'Claude Sonnet 4' },
            { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
            { id: 'gemini-3-pro', name: 'Gemini 3 Pro (Preview)' },
            { id: 'gpt-5', name: 'GPT-5' },
            { id: 'gpt-5-codex', name: 'GPT-5-Codex (Preview)' },
            { id: 'gpt-5.1', name: 'GPT-5.1 (Preview)' },
            { id: 'gpt-5.1-codex', name: 'GPT-5.1-Codex (Preview)' },
            { id: 'gpt-5.1-codex-max', name: 'GPT-5.1-Codex-Max (Preview)' },
            { id: 'gpt-5.1-codex-mini', name: 'GPT-5.1-Codex-Mini (Preview)' }
        ]
    };

    public getModels(provider: string): ModelInfo[] {
        return this.models[provider] || [];
    }

    public async fetchModels(provider: string, apiKey: string): Promise<ModelInfo[]> {
        console.log(`[CLI] 🔄 Fetching models for ${provider}...`);

        try {
            let instance: any;

            switch (provider) {
                case 'gemini':
                    instance = new GeminiProvider(apiKey);
                    break;
                case 'openai':
                    instance = new OpenAIProvider(apiKey);
                    break;
                case 'anthropic':
                    instance = new AnthropicProvider(apiKey);
                    break;
                case 'mistral':
                    instance = new MistralProvider(apiKey);
                    break;
                case 'copilot':
                    instance = new VSCodeCopilotProvider(apiKey);
                    break;
                default:
                    return this.getModels(provider);
            }

            if (instance.fetchModels) {
                const fetchedIds = await instance.fetchModels();
                if (fetchedIds && fetchedIds.length > 0) {
                    // Update cache for this session
                    this.models[provider] = fetchedIds.map((id: string) => ({ id, name: id }));
                    return this.models[provider];
                }
            }
        } catch (error: any) {
            console.warn(`[CLI] ⚠️ Failed to fetch models for ${provider}:`, error.message);
        }

        // Fallback to static list
        return this.getModels(provider);
    }
}

export const modelRegistry = new ModelRegistry();
