/**
 * Provider Router - Routes requests to primary/fallback providers
 * Central hub for all LLM/TTS/STT/Vision requests
 */

import {
    ILLMProvider,
    ITTSProvider,
    ISTTProvider,
    IVisionProvider,
    LLMRequest,
    LLMResponse,
    TTSRequest,
    TTSResponse,
    MultiSpeakerRequest,
    STTRequest,
    STTResponse,
    VisionRequest,
    VisionResponse,
    ProviderName,
    ServiceType
} from './types';
import { getProviderConfig, getVisionConfig } from './config';
import { GeminiProvider } from './gemini';
import { GeminiTTSProvider } from './gemini-tts';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { MistralProvider } from './mistral';
import { VSCodeCopilotProvider } from './copilot';
import { CopilotVisionProvider } from './copilot-vision';

export class ProviderRouter {
    private llmProviders: Map<ProviderName, ILLMProvider> = new Map();
    private ttsProviders: Map<ProviderName, ITTSProvider> = new Map();
    private sttProviders: Map<ProviderName, ISTTProvider> = new Map();
    private visionProviders: Map<ProviderName, IVisionProvider> = new Map();

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

        // === Vision Providers ===
        const visionConfig = getVisionConfig();

        // Copilot Vision (GPT-4o) - works for on-demand mode
        const copilotVision = new CopilotVisionProvider(copilotKey, 'gpt-4o');
        if (copilotVision.isAvailable()) {
            this.visionProviders.set('copilot', copilotVision);
        }

        // Note: Gemini Vision for on-demand mode could be added here
        // For live mode, GeminiLiveService handles it separately

        console.log(`[PROVIDER ROUTER] ✅ Initialized ${this.llmProviders.size} LLM, ${this.ttsProviders.size} TTS, ${this.visionProviders.size} Vision providers`);
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
     * Analyze image for Vision (Grisha on-demand mode)
     * For live mode, use GeminiLiveService directly
     */
    async analyzeVision(request: VisionRequest): Promise<VisionResponse> {
        const visionConfig = getVisionConfig();

        // On-demand mode uses visionConfig.onDemand settings
        const onDemandConfig = visionConfig.onDemand;

        // Try primary provider
        let provider = this.visionProviders.get(onDemandConfig.provider);

        if (!provider || !provider.isAvailable()) {
            // Try fallback
            if (onDemandConfig.fallbackProvider) {
                provider = this.visionProviders.get(onDemandConfig.fallbackProvider);
                if (provider && provider.isAvailable()) {
                    console.log(`[PROVIDER ROUTER] 🔄 Using fallback Vision provider: ${onDemandConfig.fallbackProvider}`);
                }
            }
        }

        if (!provider || !provider.isAvailable()) {
            throw new Error('No available Vision provider for on-demand analysis');
        }

        console.log(`[PROVIDER ROUTER] 🖼️ Analyzing image with ${provider.name}...`);
        return await provider.analyzeImage(request);
    }

    /**
     * Get Vision config (for mode checking)
     */
    getVisionConfig() {
        return getVisionConfig();
    }

    /**
     * Check if Vision on-demand is available
     */
    isVisionOnDemandAvailable(): boolean {
        const config = getVisionConfig();
        const onDemandConfig = config.onDemand;
        const primary = this.visionProviders.get(onDemandConfig.provider);
        const fallback = onDemandConfig.fallbackProvider ? this.visionProviders.get(onDemandConfig.fallbackProvider) : null;

        return (primary?.isAvailable() ?? false) || (fallback?.isAvailable() ?? false);
    }

    /**
     * Check if Vision live mode is available (checks if Gemini Live would work)
     */
    isVisionLiveAvailable(): boolean {
        const config = getVisionConfig();
        // Live mode requires Gemini Live API key
        return !!config.live.apiKey;
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

    /**
     * Register a new Vision provider
     */
    registerVisionProvider(provider: IVisionProvider): void {
        this.visionProviders.set(provider.name, provider);
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

