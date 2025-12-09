/**
 * Provider Config - Reads provider configuration from environment
 * Supports Vision with separate Live and On-Demand configurations
 */

import { ProviderName, ServiceType, ProviderConfig, VisionConfig, VisionMode, VisionModeConfig, ServiceConfig } from './types';

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

// Vision-specific defaults - SEPARATE for Live and On-Demand
const VISION_LIVE_DEFAULTS: VisionModeConfig = {
    provider: 'gemini',
    fallbackProvider: undefined, // Live is Gemini-only for now
    model: 'gemini-2.5-flash-native-audio-preview-09-2025'
};

const VISION_ONDEMAND_DEFAULTS: VisionModeConfig = {
    provider: 'copilot',
    fallbackProvider: 'gemini',
    model: 'gpt-4o'
};

/**
 * Get provider configuration for a service from environment
 */
export function getProviderConfig(service: ServiceType): ProviderConfig {
    if (service === 'vision') {
        // For vision, return the active mode's config as ProviderConfig
        const visionConfig = getVisionConfig();
        const activeConfig = visionConfig.mode === 'live' ? visionConfig.live : visionConfig.onDemand;
        return activeConfig;
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
 * Get Vision-specific configuration with separate Live and On-Demand settings
 */
export function getVisionConfig(): VisionConfig {
    const mode = (process.env.VISION_MODE as VisionMode) || 'live';

    // === LIVE MODE CONFIG ===
    const liveProviderRaw = process.env.VISION_LIVE_PROVIDER;
    const liveFallbackRaw = process.env.VISION_LIVE_FALLBACK_PROVIDER;

    const live: VisionModeConfig = {
        provider: (liveProviderRaw as ProviderName) || VISION_LIVE_DEFAULTS.provider,
        fallbackProvider: liveFallbackRaw === '' ? undefined : (liveFallbackRaw as ProviderName) || VISION_LIVE_DEFAULTS.fallbackProvider,
        model: process.env.VISION_LIVE_MODEL || VISION_LIVE_DEFAULTS.model,
        apiKey: process.env.VISION_LIVE_API_KEY ||
            process.env.GEMINI_LIVE_API_KEY ||
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_API_KEY || ''
    };

    // === ON-DEMAND MODE CONFIG ===
    const onDemandProviderRaw = process.env.VISION_ONDEMAND_PROVIDER;
    const onDemandFallbackRaw = process.env.VISION_ONDEMAND_FALLBACK_PROVIDER;

    const onDemand: VisionModeConfig = {
        provider: (onDemandProviderRaw as ProviderName) || VISION_ONDEMAND_DEFAULTS.provider,
        fallbackProvider: onDemandFallbackRaw === '' ? undefined : (onDemandFallbackRaw as ProviderName) || VISION_ONDEMAND_DEFAULTS.fallbackProvider,
        model: process.env.VISION_ONDEMAND_MODEL || VISION_ONDEMAND_DEFAULTS.model,
        apiKey: process.env.VISION_ONDEMAND_API_KEY ||
            process.env.COPILOT_API_KEY ||
            process.env.GEMINI_API_KEY || ''
    };

    return {
        mode,
        live,
        onDemand
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
        if (service === 'vision') {
            const visionConfig = config as VisionConfig;
            console.log(`  vision [mode: ${visionConfig.mode}]:`);
            console.log(`    live: ${visionConfig.live.provider} (${visionConfig.live.model})${visionConfig.live.fallbackProvider ? ` -> fallback: ${visionConfig.live.fallbackProvider}` : ''}`);
            console.log(`    on-demand: ${visionConfig.onDemand.provider} (${visionConfig.onDemand.model})${visionConfig.onDemand.fallbackProvider ? ` -> fallback: ${visionConfig.onDemand.fallbackProvider}` : ''}`);
        } else {
            const providerConfig = config as ProviderConfig;
            let line = `  ${service}: ${providerConfig.provider} (model: ${providerConfig.model})`;
            if (providerConfig.fallbackProvider) {
                line += ` -> fallback: ${providerConfig.fallbackProvider}`;
            }
            console.log(line);
        }
    }
}

