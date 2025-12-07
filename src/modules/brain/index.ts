import { BrainAPI } from './contract';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class BrainCapsule implements BrainAPI {
    private genAI: GoogleGenerativeAI;

    constructor(apiKey: string) {
        if (!apiKey) {
            console.warn("⚠️ BrainCapsule initialized without API Key! Will fail on real requests.");
        }
        this.genAI = new GoogleGenerativeAI(apiKey || 'mock-key');
    }

    async think(args: { system_prompt: string; user_prompt: string; model?: 'gemini-2.0-flash-exp' | 'gemini-1.5-pro' }) {
        console.log(`🧠 BrainCapsule: calling ${args.model || 'default model'}`);

        try {
            const model = this.genAI.getGenerativeModel({
                model: args.model || 'gemini-2.0-flash-exp',
                systemInstruction: args.system_prompt
            });

            const result = await model.generateContent(args.user_prompt);
            const response = await result.response;
            const text = response.text();

            return {
                text,
                usage: {
                    // Mock usage for now as experimental models might not return it consistently
                    input_tokens: 0,
                    output_tokens: 0
                }
            };
        } catch (error: any) {
            console.error("🧠 BrainCapsule Error:", error);
            return { text: `Error: ${error.message}` };
        }
    }
}
