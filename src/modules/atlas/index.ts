
import { AtlasAPI, Plan } from './contract';
import { MemoryAPI } from '../memory/contract';
import { BrainAPI } from '../brain/contract';
import { synapse } from '../../kontur/synapse';

export class AtlasCapsule implements AtlasAPI {
    private memory: MemoryAPI;
    private brain: BrainAPI;

    constructor(memory: MemoryAPI, brain: BrainAPI) {
        this.memory = memory;
        this.brain = brain;
    }

    async plan(args: { goal: string; context?: Record<string, any> }): Promise<Plan> {
        console.log(`ATLAS: Planning for "${args.goal}" using Brain...`);

        // 1. Recall relevant memories
        // const memories = await this.memory.recall({ query: args.goal }); 

        // 2. Ask Brain to plan
        const response = await this.brain.think({
            system_prompt: `You are ATLAS, the Architect of KONTUR. Your goal is to create a structured plan for: "${args.goal}".
IMPORTANT: You MUST speak and reply to the user in UKRAINIAN (Українська).
For the 'steps' array, use clear and precise technical steps.
Return a JSON object with 'goal' and 'steps'(array of strings).`,
            user_prompt: `Goal: ${args.goal}. Context: ${JSON.stringify(args.context || {})}. Remember: Language = Ukrainian.`
        });

        try {
            const result = JSON.parse(response.text || '{}');
            const plan: Plan = {
                id: crypto.randomUUID(),
                goal: args.goal,
                steps: result.steps || ["Step 1 (Fallback)", "Step 2 (Fallback)"],
                status: 'active'
            };

            synapse.emit('atlas', 'plan_ready', { planId: plan.id, steps: plan.steps.length });
            return plan;
        } catch (e) {
            console.error("ATLAS: Failed to parse Brain response", e);
            return { id: 'error', goal: args.goal, steps: [], status: 'failed' };
        }
    }

    async dream() {
        // Trigger memory optimization
        await this.memory.optimize();
        return { insights: ["Dream complete"] };
    }
}
