/**
 * KONTUR CLI - Model Registry
 * Provides model lists for each provider with dynamic fetching
 */

import {
    GeminiProvider,
    OpenAIProvider,
    AnthropicProvider,
    MistralProvider,
    VSCodeCopilotProvider
} from '../../kontur/providers/index.js';

export interface ModelInfo {
    id: string;
    name: string;
    description?: string;
}

export class ModelRegistry {
    private models: Record<string, ModelInfo[]> = {
        gemini: [
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
            { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)' },
            { id: 'gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash TTS' },
            { id: 'gemini-2.5-flash-native-audio-preview-09-2025', name: 'Gemini Live Audio/Vision' }
        ],
        openai: [
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
            { id: 'gpt-4', name: 'GPT-4' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
            { id: 'o1', name: 'O1 Reasoning' },
            { id: 'o1-mini', name: 'O1 Mini' }
        ],
        anthropic: [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
            { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
        ],
        mistral: [
            { id: 'mistral-large-latest', name: 'Mistral Large' },
            { id: 'mistral-medium-latest', name: 'Mistral Medium' },
            { id: 'mistral-small-latest', name: 'Mistral Small' },
            { id: 'codestral-latest', name: 'Codestral' },
            { id: 'pixtral-large-latest', name: 'Pixtral Large (Vision)' }
        ],
        copilot: [
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-4.1', name: 'GPT-4.1' },
            { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
            { id: 'claude-sonnet-4', name: 'Claude Sonnet 4' },
            { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
            { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5' },
            { id: 'claude-opus-4.5', name: 'Claude Opus 4.5 (Preview)' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
            { id: 'gemini-3-pro', name: 'Gemini 3 Pro (Preview)' },
            { id: 'gpt-5', name: 'GPT-5' },
            { id: 'gpt-5-codex', name: 'GPT-5-Codex (Preview)' },
            { id: 'gpt-5.1', name: 'GPT-5.1 (Preview)' },
            { id: 'gpt-5.1-codex', name: 'GPT-5.1-Codex (Preview)' },
            { id: 'gpt-5.1-codex-max', name: 'GPT-5.1-Codex-Max (Preview)' },
            { id: 'gpt-5.1-codex-mini', name: 'GPT-5.1-Codex-Mini (Preview)' },
            { id: 'grok-code-fast-1', name: 'Grok Code Fast 1' },
            { id: 'raptor-mini', name: 'Raptor Mini (Preview)' }
        ]
    };

    public getModels(provider: string): ModelInfo[] {
        return this.models[provider] || [];
    }

    public async fetchModels(provider: string, apiKey: string): Promise<ModelInfo[]> {
        // If no API key, return static list
        if (!apiKey) {
            return this.getModels(provider);
        }

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
                    // Merge with static list (prefer static names)
                    const staticModels = this.getModels(provider);
                    const merged: ModelInfo[] = [];
                    const seen = new Set<string>();

                    // First, add all fetched models with proper names
                    for (const id of fetchedIds) {
                        const staticInfo = staticModels.find(m => m.id === id);
                        merged.push({
                            id,
                            name: staticInfo?.name || id
                        });
                        seen.add(id);
                    }

                    // Add any static models not in fetched list (useful for preview/special models)
                    for (const m of staticModels) {
                        if (!seen.has(m.id)) {
                            merged.push(m);
                        }
                    }

                    return merged;
                }
            }
        } catch (error: any) {
            // Silent fail - return static list
        }

        return this.getModels(provider);
    }
}

export const modelRegistry = new ModelRegistry();
