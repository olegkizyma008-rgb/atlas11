import { AtlasAPI } from './contract';
import { MemoryAPI } from '../memory/contract';

export class AtlasCapsule implements AtlasAPI {
    private memory: MemoryAPI;

    constructor(memory: MemoryAPI) {
        this.memory = memory;
    }

    async plan(args: { goal: string }) {
        // 1. Ask Memory for context
        const context = await this.memory.recall({ query: args.goal });
        console.log("ATLAS: Retrieved context", context.summary);

        // 2. Mock Logic for now (Real logic would use LLM)
        return {
            id: 'real-plan-1',
            goal: args.goal,
            steps: ['Step 1 from Real Atlas'],
            status: 'active' as const
        };
    }

    async dream() {
        // Trigger memory optimization
        await this.memory.optimize();
        return { insights: ["Dream complete"] };
    }
}
