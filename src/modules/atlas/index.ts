
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

        try {
            // 2. Ask Brain to plan
            const response = await this.brain.think({
                system_prompt: `You are ATLAS, the Architect of KONTUR. Your goal is to create a structured plan for: "${args.goal}".

OUTPUT FORMAT:
Return a JSON object with:
1. "goal": string (English internal summary)
2. "steps": array of objects: { "tool": "kontur://...", "action": "...", "args": { ... } }
3. "user_response_ua": string (Your reply to the user in UKRAINIAN 🇺🇦)

TOOLS AVAILABLE:
- File Ops: "kontur://organ/mcp/filesystem" (actions: write_file, read_file, list_directory)
- System Ops: "kontur://organ/system" (actions: run_command, open_app)
- GUI Automation: "kontur://organ/mcp/os" (actions: ui_tree, ui_find, ui_action, open_application, keyboard_type, keyboard_press, mouse_click, execute_applescript)
  - ui_tree: { appName } - Get UI hierarchy (use for exploration)
  - ui_find: { appName, role, title } - Find element ID
  - ui_action: { appName, role, title, action: "AXPress" } - Click/Interact semantic element
  - open_application: { appName: string } - Opens and activates an app
  - keyboard_type: { text: string } - Types text as keystrokes
  - keyboard_press: { key: string, modifiers?: ["command down", "shift down"] } - Press key combo
  - mouse_click: { x: number, y: number } - Click at coordinates
  - get_screenshot: { action: "screen" } - Capture screen as image (base64) for visual analysis
  - execute_applescript: { script: string } - Run AppleScript for complex UI automation
- Developer Ops: "kontur://organ/mcp/os" (actions: dev_grep, dev_find, git_ops)
  - dev_grep: { pattern, path, recursive? } - Search code
  - dev_find: { pattern, path } - Find files
  - git_ops: { op: "status"|"commit"|"diff", args?: [] } - Git operations
  - project_scaffold: { projectName, type: "vite"|"node"|"python", path } - Create new project
- Memory: "kontur://organ/mcp/memory" (actions: store, recall)

LANGUAGE RULES:
- "user_response_ua": MUST be in UKRAINIAN 🇺🇦.
- "reasoning/goal": MUST be in ENGLISH 🇺🇸.`,
                user_prompt: `Goal: ${args.goal}. Context: ${JSON.stringify(args.context || {})}.`
            });


            // Clean markdown code blocks if present
            const cleanText = (response.text || '{}').replace(/```json\n?|```/g, '').trim();
            const result = JSON.parse(cleanText);
            const plan: Plan = {
                id: crypto.randomUUID(),
                goal: result.goal || args.goal,
                steps: result.steps || [],
                user_response_ua: result.user_response_ua,
                status: 'active'
            };

            synapse.emit('atlas', 'plan_ready', { planId: plan.id, steps: plan.steps.length });
            return plan;
        } catch (e) {
            console.error("ATLAS: Failed to plan via Brain", e);
            // Return failure plan efficiently
            return {
                id: 'error',
                goal: args.goal,
                steps: [],
                status: 'failed',
                user_response_ua: "Вибачте, виникла помилка при плануванні (Brain Failure)."
            };
        }
    }

    async dream() {
        // Trigger memory optimization
        await this.memory.optimize();
        return { insights: ["Dream complete"] };
    }

    /**
     * Handle incoming KPP Packet
     */
    public async processPacket(packet: any) {
        // Handle Planning Requests
        // Intent: 'CMD' with op_code 'PLAN' or 'ATLAS_PLAN'
        // OR Intent: 'QUERY'
        if (packet.instruction.op_code === 'PLAN' || packet.instruction.op_code === 'ATLAS_PLAN' || packet.instruction.op_code === 'REPLAN') {
            console.log(`ATLAS: Received specific instruction: ${packet.instruction.op_code}`);

            // If REPLAN, we might want to prioritize it or add context
            let planGoal = packet.payload.goal || packet.payload.prompt || 'Do something';

            if (packet.instruction.op_code === 'REPLAN') {
                console.log(`ATLAS: ⚠️ REPLAN REQUESTED. Error: ${packet.payload.error}`);
                // Enhance prompt for replanning
                planGoal = `REPLANNING REQUIRED. Original Goal: "${packet.payload.original_goal}". Failure: "${packet.payload.error}". Context: ${JSON.stringify(packet.payload.context || {})}. Create a NEW, BETTER plan.`;
            }

            const result = await this.plan({
                goal: planGoal,
                context: packet.payload.context
            });
            // Send back the plan? Or the Core handles it?
            // Usually Atlas sends an AI_PLAN packet to Core.
            // We need a way to send packets.
            // AtlasCapsule doesn't have 'Core' injected yet.
            // For now, we return the plan and let the caller handling logic (in deep integration) send it?
            // No, deep integration registers a void 'processPacket' usually.

            // To be consistent, AtlasCapsule should emit the plan via Packet.
            // But it lacks Core.
            // For now, I will just log. Real routing happens if I inject Core like Tetyana.
            // BUT, the `AtlasOrganMapper` used to do this.
            return result;
        }
    }
}
