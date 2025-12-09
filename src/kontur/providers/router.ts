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
    MultiSpeakerRequest,
    STTRequest,
    STTResponse,
    ProviderName,
    ServiceType
} from './types';
import { getProviderConfig } from './config';
import { GeminiProvider } from './gemini';
import { GeminiTTSProvider } from './gemini-tts';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { MistralProvider } from './mistral';
import { VSCodeCopilotProvider } from './copilot';

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

        // === LLM Providers ===
        const brainConfig = getProviderConfig('brain');

        // Gemini
        if (brainConfig.apiKey) {
            this.llmProviders.set('gemini', new GeminiProvider(brainConfig.apiKey, brainConfig.model));
        }

        // OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (openaiKey) {
            this.llmProviders.set('openai', new OpenAIProvider(openaiKey));
        }

        // Anthropic (Claude)
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (anthropicKey) {
            this.llmProviders.set('anthropic', new AnthropicProvider(anthropicKey));
        }

        // Mistral
        const mistralKey = process.env.MISTRAL_API_KEY;
        if (mistralKey) {
            this.llmProviders.set('mistral', new MistralProvider(mistralKey));
        }

        // Copilot
        // Copilot might be auto-detected, so we instantiate and check availability
        const copilotKey = process.env.COPILOT_API_KEY;
        const copilotProvider = new VSCodeCopilotProvider(copilotKey);
        if (copilotProvider.isAvailable()) {
            this.llmProviders.set('copilot', copilotProvider);
        }

        // === TTS Providers ===
        const ttsConfig = getProviderConfig('tts');
        if (ttsConfig.apiKey) {
            const geminiTTS = new GeminiTTSProvider(ttsConfig.apiKey, ttsConfig.model);
            this.ttsProviders.set('gemini', geminiTTS);
        }

        console.log(`[PROVIDER ROUTER] ✅ Initialized ${this.llmProviders.size} LLM, ${this.ttsProviders.size} TTS providers`);
    }

    /**
     * Get provider configuration helper
     */
    private getProvider<T>(
        service: ServiceType,
        map: Map<ProviderName, T>,
        isAvailable: (p: T) => boolean
    ): T {
        const config = getProviderConfig(service);
        const provider = map.get(config.provider);

        if (provider && isAvailable(provider)) {
            return provider;
        }

        if (config.fallbackProvider) {
            const fallback = map.get(config.fallbackProvider);
            if (fallback && isAvailable(fallback)) {
                console.log(`[PROVIDER ROUTER] 🔄 Using fallback provider: ${config.fallbackProvider} for ${service}`);
                return fallback;
            }
        }

        throw new Error(`No available provider for ${service}`);
    }

    /**
     * Generate LLM response
     */
    async generateLLM(service: ServiceType, request: LLMRequest): Promise<LLMResponse> {
        const provider = this.getProvider(service, this.llmProviders, p => p.isAvailable());
        const config = getProviderConfig(service);

        // Use configured model if not specified
        if (!request.model) request.model = config.model;

        try {
            return await provider.generate(request);
        } catch (error) {
            // Simple retry logic or fallback could go here
            throw error;
        }
    }

    /**
     * Generate TTS audio
     */
    async speak(service: ServiceType, request: TTSRequest): Promise<TTSResponse> {
        const provider = this.getProvider(service, this.ttsProviders, p => p.isAvailable());
        return await provider.speak(request);
    }

    /**
     * Generate Multi-Speaker TTS audio
     */
    async speakMulti(service: ServiceType, request: MultiSpeakerRequest): Promise<TTSResponse> {
        const provider = this.getProvider(service, this.ttsProviders, p => p.isAvailable());

        if (provider.speakMulti) {
            return await provider.speakMulti(request);
        }

        throw new Error(`Provider ${provider.name} does not support multi-speaker TTS`);
    }

    /**
     * Register a new LLM provider
     */
    registerLLMProvider(provider: ILLMProvider): void {
        this.llmProviders.set(provider.name, provider);
    }

    /**
     * Register a new TTS provider
     */
    registerTTSProvider(provider: ITTSProvider): void {
        this.ttsProviders.set(provider.name, provider);
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
