
import { GoogleGenerativeAI } from '@google/generative-ai'; // Fallback / Types
import { GoogleGenAI } from '@google/genai'; // New SDK for Gemini 3
import { createPacket, KPP_Packet, PacketIntent } from '../../kontur/protocol/nexus';
import { Core } from '../../kontur/core/dispatcher';

/**
 * ReasoningCapsule - "The Deep Thinker"
 * Wraps Gemini 3 Pro for advanced reasoning tasks using `thinking_level`.
 */
export class ReasoningCapsule {
    private client: GoogleGenAI;
    private core?: Core;
    private lastThoughtSignature?: string;

    constructor(apiKey: string) {
        // Init new GenAI client (v1alpha needed for some features, but using stable if available)
        // Note: SDK v0.1.0+ of @google/genai maps to new API
        this.client = new GoogleGenAI({ apiKey });
        console.log("🧠 REASONING: ReasoningCapsule (Gemini 3) initialized.");
    }

    public register(core: Core) {
        this.core = core;
        // Listen for "think" commands
        // In a real system we'd check route.to === 'kontur://organ/reasoning'
    }

    /**
     * Think deeply about a problem.
     * @param prompt The complex query or code snippet
     * @param level 'low' | 'high' (default 'high')
     */
    public async think(prompt: string, level: 'low' | 'high' = 'high'): Promise<string> {
        console.log(`🧠 REASONING: Thinking about "${prompt.substring(0, 50)}..." (Level: ${level})`);

        try {
            // Using the new SDK structure based on docs
            const model = "gemini-3-pro-preview";

            const config: any = {
                thinkingConfig: {
                    thinkingLevel: level,
                }
            };

            const result = await this.client.models.generateContent({
                model: model,
                contents: [{
                    parts: [{ text: prompt }]
                }],
                config: config
            });

            // Capture signature if present (for future turns)
            // Note: The new SDK response structure might differ, we assume standard response
            // console.log("Response parts:", result.response.candidates?.[0]?.content?.parts);

            // Extract text
            const text = result.text || "";
            console.log(`🧠 REASONING: Thought complete. Length: ${text.length}`);

            return text;

        } catch (error: any) {
            console.error("🧠 REASONING: Thinking failed", error);
            // Fallback?
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

// Factory for initialization
export function createReasoningCapsule(apiKey: string): ReasoningCapsule {
    return new ReasoningCapsule(apiKey);
}
