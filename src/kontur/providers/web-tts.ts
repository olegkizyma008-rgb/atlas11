
import { ITTSProvider, TTSRequest, TTSResponse, ProviderName } from './types';

/**
 * Web TTS Provider (Server-Side Placeholder)
 * 
 * This provider is intended to be used directly by the frontend (Renderer process).
 * If accessed from the Main process (Node.js), it acts as a placeholder or fallback
 * signal, as 'window.speechSynthesis' is not available in Node.
 */
export class WebTTSProvider implements ITTSProvider {
    readonly name: ProviderName = 'web';

    constructor() {
        // No API key needed
    }

    isAvailable(): boolean {
        // Always "available" as a selection, but functionality depends on environment
        return true;
    }

    async speak(request: TTSRequest): Promise<TTSResponse> {
        console.warn("[WebTTSProvider] ⚠️ 'speak' called on backend. Web TTS should be handled by Frontend (Renderer).");

        // Return empty/special response indicating this is a web-only provider
        return {
            audio: new ArrayBuffer(0),
            mimeType: 'audio/mp3',
            provider: 'web'
        };
    }
}
