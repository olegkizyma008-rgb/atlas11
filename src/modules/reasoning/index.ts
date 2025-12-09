
import { createPacket, KPP_Packet, PacketIntent } from '../../kontur/protocol/nexus';
import { Core } from '../../kontur/core/dispatcher';
import { getProviderRouter } from '../../kontur/providers/router';
import { getProviderConfig } from '../../kontur/providers/config';

/**
 * ReasoningCapsule - "The Deep Thinker"
 * Uses configured provider (Gemini 3, Copilot, etc.) for advanced reasoning tasks.
 * Reads configuration from REASONING_PROVIDER / REASONING_MODEL env vars.
 */
export class ReasoningCapsule {
    private core?: Core;
    private lastThoughtSignature?: string;

    constructor() {
        const config = getProviderConfig('reasoning');
        console.log(`🧠 REASONING: ReasoningCapsule initialized with ${config.provider} / ${config.model}`);
    }

    public register(core: Core) {
        this.core = core;
    }

    /**
     * Think deeply about a problem.
     * Uses the configured reasoning provider (Copilot, Gemini 3, etc.)
     */
    public async think(prompt: string, level: 'low' | 'high' = 'high'): Promise<string> {
        console.log(`🧠 REASONING: Thinking about "${prompt.substring(0, 50)}..." (Level: ${level})`);

        try {
            const router = getProviderRouter();
            const config = getProviderConfig('reasoning');

            // Use provider router to send request
            const response = await router.generateLLM('reasoning', {
                prompt: prompt,
                systemPrompt: `You are a deep reasoning engine. Think step-by-step and provide thorough analysis.
Level: ${level === 'high' ? 'Deep, multi-step reasoning' : 'Quick, efficient analysis'}`,
                model: config.model,
                temperature: level === 'high' ? 0.3 : 0.5,
                maxTokens: 4096
            });

            const text = response.text || "";
            console.log(`🧠 REASONING: Thought complete. Length: ${text.length}`);

            return text;

        } catch (error: any) {
            console.error("🧠 REASONING: Thinking failed", error);
            return `Error thinking: ${error.message}`;
        }
    }

    /**
     * Handle incoming KPP packets (Acting as an Organ)
     */
    public async handlePacket(packet: KPP_Packet) {
        if (packet.instruction.intent === PacketIntent.CMD && packet.instruction.op_code === 'think') {
            const { prompt, level } = packet.payload;

            const result = await this.think(prompt, level);

            // Send response
            const response = createPacket(
                'kontur://organ/reasoning',
                packet.route.from,
                PacketIntent.RESPONSE,
                { result }
            );
            response.route.reply_to = packet.route.reply_to;
            this.core?.ingest(response);
        }
    }
}

// Factory for initialization (no longer needs API key - uses config)
export function createReasoningCapsule(): ReasoningCapsule {
    return new ReasoningCapsule();
}
