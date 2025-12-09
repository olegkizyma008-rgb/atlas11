
import { ILLMProvider, LLMRequest, LLMResponse, ProviderName } from './types';

export class MockLLMProvider implements ILLMProvider {
    readonly name: ProviderName = 'mock';

    async generate(request: LLMRequest): Promise<LLMResponse> {
        console.warn(`[MOCK PROVIDER] Generating response for: "${request.prompt.slice(0, 50)}..."`);

        const isPlanning = request.responseFormat === 'json';

        let text = '';
        if (isPlanning) {
            text = JSON.stringify({
                thought: "System is in offline mode. Simulating plan execution.",
                response: "I am running in offline mode. I cannot perform real intelligence tasks, but I can demonstrate the workflow.",
                plan: [
                    {
                        tool: "notify_user",
                        action: "notify",
                        args: { message: "System is offline (Mock Provider active)." }
                    }
                ]
            });
        } else {
            text = "I am Atlas (Mock Mode). No active AI provider was found, so I am responding with this placeholder message. Please configure your API keys in .env to enable real intelligence.";
        }

        return {
            text,
            usage: {
                promptTokens: 10,
                completionTokens: 20,
                totalTokens: 30
            },
            model: 'mock-v1',
            provider: 'mock'
        };
    }

    isAvailable(): boolean {
        return true;
    }
}
