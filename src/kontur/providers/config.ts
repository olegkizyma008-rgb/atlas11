/**
 * Provider Config - Reads provider configuration from environment
 */

import { ProviderName, ServiceType, ProviderConfig, ServiceConfig } from './types';

// Default configurations
const DEFAULTS: Record<ServiceType, ProviderConfig> = {
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
    vision: {
        provider: 'gemini',
        fallbackProvider: undefined,
        model: 'gemini-2.5-flash-native-audio-preview-09-2025'
    },
    reasoning: {
        provider: 'gemini',
        fallbackProvider: undefined,
        model: 'gemini-3-pro-preview'
    }
};

/**
 * Get provider configuration for a service from environment
 */
export function getProviderConfig(service: ServiceType): ProviderConfig {
    const prefix = service.toUpperCase();

    const provider = (process.env[`${prefix}_PROVIDER`] as ProviderName) || DEFAULTS[service].provider;
    const fallbackProvider = process.env[`${prefix}_FALLBACK_PROVIDER`] as ProviderName | undefined;
    const model = process.env[`${prefix}_MODEL`] || DEFAULTS[service].model;

    // API Key fallback chain
    const apiKey =
        process.env[`${prefix}_API_KEY`] ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.GEMINI_LIVE_API_KEY ||
        '';

    return {
        provider,
        fallbackProvider,
        model,
        apiKey
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
        vision: getProviderConfig('vision'),
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
        console.log(`  ${service}: ${config.provider} (model: ${config.model})${config.fallbackProvider ? ` -> fallback: ${config.fallbackProvider}` : ''}`);
    }
}
