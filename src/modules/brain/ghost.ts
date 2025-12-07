import { BrainAPI } from './contract';

export class BrainGhost implements BrainAPI {
    constructor() {
        console.log("🧠 BrainGhost Initialized");
    }

    async think(args: { system_prompt: string; user_prompt: string }) {
        console.log(`🧠 BrainGhost Thinking...`);
        console.log(`   > System: ${args.system_prompt.slice(0, 50)}...`);
        console.log(`   > User: ${args.user_prompt.slice(0, 50)}...`);

        // Simulate latency
        await new Promise(r => setTimeout(r, 500));

        // Basic heuristic response simulation based on prompt content
        if (args.system_prompt.includes("ATLAS")) {
            return { text: JSON.stringify({ goal: "Simulated Plan", steps: ["Step 1", "Step 2"] }) };
        }
        if (args.user_prompt.includes("code")) {
            return { text: "console.log('Simulated Code Response');" };
        }

        return {
            text: "I am a Ghost Brain. I simulate intelligence.",
            tool_calls: [],
            usage: { input_tokens: 0, output_tokens: 0 }
        };
    }
}
