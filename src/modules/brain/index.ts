import { BrainAPI } from './contract';
import { getProviderRouter } from '../../kontur/providers/router';
import { getProviderConfig } from '../../kontur/providers/config';

/**
 * BrainCapsule - Uses configured provider via ProviderRouter
 * No longer hardcoded to Gemini - respects CLI configuration
 */
export class BrainCapsule implements BrainAPI {
    constructor(_apiKey?: string) {
        // API key is now managed by ProviderRouter, not passed directly
        const config = getProviderConfig('brain');
        console.log(`🧠 BrainCapsule: Using ${config.provider} / ${config.model}`);
    }

    async think(args: { system_prompt: string; user_prompt: string; model?: string }) {
        const config = getProviderConfig('brain');
        console.log(`🧠 BrainCapsule: calling ${args.model || config.model || 'default model'}`);

        try {
            const router = getProviderRouter();

            const response = await router.generateLLM('brain', {
                prompt: args.user_prompt,
                systemPrompt: args.system_prompt,
                model: args.model || config.model,
                temperature: 0.7,
                maxTokens: 4096
            });

            return {
                text: response.text,
                usage: {
                    input_tokens: response.usage?.promptTokens || 0,
                    output_tokens: response.usage?.completionTokens || 0
                }
            };
        } catch (error: any) {
            console.error("🧠 BrainCapsule Error:", error);
            return { text: `Error: ${error.message}` };
        }
    }
}
