/**
 * Provider Config - Reads provider configuration from environment
 * Supports Vision mode (live vs on-demand)
 */

import { ProviderName, ServiceType, ProviderConfig, VisionConfig, VisionMode, ServiceConfig } from './types';

// Default configurations for standard services
const DEFAULTS: Record<Exclude<ServiceType, 'vision'>, ProviderConfig> = {
    brain: {
        provider: 'gemini',
        fallbackProvider: undefined,
        model: 'gemini-2.5-flash'
    },
    tts: {
        provider: 'gemini',
        fallbackProvider: undefined,
        model: 'gemini-2.5-flash-preview-tts'
    },
    stt: {
        provider: 'gemini',
        fallbackProvider: undefined,
        model: 'gemini-2.5-flash'
    },
    reasoning: {
        provider: 'gemini',
        fallbackProvider: undefined,
        model: 'gemini-3-pro-preview'
    }
};

// Vision-specific defaults
const VISION_DEFAULTS: VisionConfig = {
    provider: 'gemini',
    fallbackProvider: 'copilot',
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    mode: 'live' // Default to Gemini Live streaming
};

/**
 * Get provider configuration for a service from environment
 */
export function getProviderConfig(service: ServiceType): ProviderConfig {
    if (service === 'vision') {
        // For vision, return base config (use getVisionConfig for full config)
        return getVisionConfig();
    }

    const prefix = service.toUpperCase();

    // Type assertion: after the vision check above, service is guaranteed to be in DEFAULTS
    const serviceDefaults = DEFAULTS[service as Exclude<ServiceType, 'vision'>];

    const provider = (process.env[`${prefix}_PROVIDER`] as ProviderName) || serviceDefaults.provider;
    const fallbackProvider = process.env[`${prefix}_FALLBACK_PROVIDER`] as ProviderName | undefined;
    const model = process.env[`${prefix}_MODEL`] || serviceDefaults.model;

    // API Key fallback chain
    const apiKey =
        process.env[`${prefix}_API_KEY`] ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.GEMINI_LIVE_API_KEY ||
        '';

    return {
        provider,
        fallbackProvider: fallbackProvider || undefined,
        model,
        apiKey
    };
}

/**
 * Get Vision-specific configuration with mode support
 */
export function getVisionConfig(): VisionConfig {
    const provider = (process.env.VISION_PROVIDER as ProviderName) || VISION_DEFAULTS.provider;
    const fallbackProviderRaw = process.env.VISION_FALLBACK_PROVIDER;
    // Empty string means user explicitly removed fallback
    const fallbackProvider = fallbackProviderRaw === '' ? undefined : (fallbackProviderRaw as ProviderName) || VISION_DEFAULTS.fallbackProvider;
    const model = process.env.VISION_MODEL || VISION_DEFAULTS.model;
    const mode = (process.env.VISION_MODE as VisionMode) || VISION_DEFAULTS.mode;

    // API Key fallback chain for Vision
    const apiKey =
        process.env.VISION_API_KEY ||
        process.env.GEMINI_LIVE_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        '';

    return {
        provider,
        fallbackProvider,
        model,
        apiKey,
        mode
    };
}

/**
 * Get all service configurations
 */
export function getAllConfigs(): ServiceConfig {
    return {
        brain: getProviderConfig('brain'),
        tts: getProviderConfig('tts'),
        stt: getProviderConfig('stt'),
        vision: getVisionConfig(),
        reasoning: getProviderConfig('reasoning')
    };
}

/**
 * Log current configuration (for debugging)
 */
export function logProviderConfig(): void {
    const configs = getAllConfigs();
    console.log('[PROVIDER CONFIG] Current configuration:');
    for (const [service, config] of Object.entries(configs)) {
        let line = `  ${service}: ${config.provider} (model: ${config.model})`;
        if (config.fallbackProvider) {
            line += ` -> fallback: ${config.fallbackProvider}`;
        }
        // Vision-specific mode
        if (service === 'vision' && 'mode' in config) {
            line += ` [mode: ${(config as VisionConfig).mode}]`;
        }
        console.log(line);
    }
}
