
import { ISTTProvider, STTRequest, STTResponse, ProviderName } from './types';

/**
 * Web STT Provider (Server-Side Placeholder)
 * 
 * This provider is intended to be used directly by the frontend (Renderer process).
 * If accessed from the Main process (Node.js), it acts as a placeholder.
 * 'window.webkitSpeechRecognition' is only available in Chrome/Chromium renderer.
 */
export class WebSTTProvider implements ISTTProvider {
    readonly name: ProviderName = 'web';

    constructor() {
        // No API key needed
    }

    isAvailable(): boolean {
        return true;
    }

    async transcribe(request: STTRequest): Promise<STTResponse> {
        console.warn("[WebSTTProvider] ⚠️ 'transcribe' called on backend. Web STT should be handled by Frontend (Renderer).");

        return {
            text: '',
            provider: 'web',
            confidence: 0
        };
    }
}
