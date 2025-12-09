/**
 * Provider Router - Routes requests to primary/fallback providers
 * Central hub for all LLM/TTS/STT requests
 */

import {
    ILLMProvider,
    ITTSProvider,
    ISTTProvider,
    LLMRequest,
    LLMResponse,
    TTSRequest,
    TTSResponse,
    STTRequest,
    STTResponse,
    ProviderName,
    ServiceType
} from './types';
import { getProviderConfig } from './config';
import { GeminiProvider } from './gemini';

export class ProviderRouter {
    private llmProviders: Map<ProviderName, ILLMProvider> = new Map();
    private ttsProviders: Map<ProviderName, ITTSProvider> = new Map();
    private sttProviders: Map<ProviderName, ISTTProvider> = new Map();

    constructor() {
        this.initializeProviders();
    }

    /**
     * Initialize all available providers
     */
    private initializeProviders(): void {
        console.log('[PROVIDER ROUTER] 🔌 Initializing providers...');

        // Initialize Gemini provider (always available if API key exists)
        const brainConfig = getProviderConfig('brain');
        if (brainConfig.apiKey) {
            const geminiProvider = new GeminiProvider(brainConfig.apiKey, brainConfig.model);
            this.llmProviders.set('gemini', geminiProvider);
        }

        // TODO: Initialize other providers when added
        // this.llmProviders.set('copilot', new CopilotProvider(...));
        // this.llmProviders.set('mistral', new MistralProvider(...));

        console.log(`[PROVIDER ROUTER] ✅ Initialized ${this.llmProviders.size} LLM providers`);
    }

    /**
     * Get LLM provider for a service
     */
    private getLLMProvider(service: ServiceType): ILLMProvider {
        const config = getProviderConfig(service);
        const provider = this.llmProviders.get(config.provider);

        if (!provider || !provider.isAvailable()) {
            // Try fallback
            if (config.fallbackProvider) {
                const fallback = this.llmProviders.get(config.fallbackProvider);
                if (fallback?.isAvailable()) {
                    console.log(`[PROVIDER ROUTER] Using fallback: ${config.fallbackProvider} for ${service}`);
                    return fallback;
                }
            }
            throw new Error(`No available provider for service: ${service}`);
        }

        return provider;
    }

    /**
     * Generate LLM response with automatic fallback
     */
    async generateLLM(service: ServiceType, request: LLMRequest): Promise<LLMResponse> {
        const config = getProviderConfig(service);
        const primaryProvider = this.llmProviders.get(config.provider);

        // Set model from config if not specified in request
        if (!request.model) {
            request.model = config.model;
        }

        // Try primary provider
        if (primaryProvider?.isAvailable()) {
            try {
                console.log(`[PROVIDER ROUTER] 🧠 ${service} -> ${config.provider} (${request.model})`);
                return await primaryProvider.generate(request);
            } catch (error: any) {
                console.warn(`[PROVIDER ROUTER] ⚠️ ${config.provider} failed: ${error.message}`);

                // Try fallback if available
                if (config.fallbackProvider) {
                    const fallbackProvider = this.llmProviders.get(config.fallbackProvider);
                    if (fallbackProvider?.isAvailable()) {
                        console.log(`[PROVIDER ROUTER] 🔄 Falling back to ${config.fallbackProvider}`);
                        return await fallbackProvider.generate(request);
                    }
                }

                throw error;
            }
        }

        throw new Error(`No available LLM provider for ${service}`);
    }

    /**
     * Get available providers
     */
    getAvailableProviders(): ProviderName[] {
        const available: ProviderName[] = [];
        const entries = Array.from(this.llmProviders.entries());
        for (const [name, provider] of entries) {
            if (provider.isAvailable()) {
                available.push(name);
            }
        }
        return available;
    }

    /**
     * Register a new provider dynamically
     */
    registerLLMProvider(provider: ILLMProvider): void {
        this.llmProviders.set(provider.name, provider);
        console.log(`[PROVIDER ROUTER] ➕ Registered provider: ${provider.name}`);
    }
}

// Singleton instance
let routerInstance: ProviderRouter | null = null;

export function getProviderRouter(): ProviderRouter {
    if (!routerInstance) {
        routerInstance = new ProviderRouter();
    }
    return routerInstance;
}
