import 'dotenv/config';
import { initializeDeepIntegration } from '../main/initialize-deep-integration';
import { createPacket, PacketIntent } from './protocol/nexus';
import { synapse } from './synapse';
import { UnifiedBrain } from './cortex/unified-brain';
import { createReasoningCapsule } from '../modules/reasoning'; // Import factory

async function run() {
    console.log("🚀 Starting Atlas Seafood Task Runner...");

    // Mock Electron IPC (we don't need real IPC for this test, but DeepIntegration might expect it if we call setupIPC)
    // We won't call setupIPC. We just use the system instance.

    const system = await initializeDeepIntegration();

    // Enable detailed logging
    console.log("✅ System Initialized. Waiting for subsystems...");

    // Give it a moment to stabilize
    await new Promise(r => setTimeout(r, 2000));

    console.log("📤 Sending Prompt to Atlas...");

    // User prompt
    const prompt = "створити сайт на робочому столі продаж онлайн криветок і інших морепродуктів. Використовуй Vite + React.";

    // 3. Initialize Capsules
    // The following lines are placeholders and assume existence of MemoryCapsule, GrishaCapsule, TetyanaCapsule, createReasoningCapsule, unifiedBrain, atlas, and deep.
    // These would typically be imported and instantiated based on the actual DeepIntegration setup.
    // For this specific test runner, these lines might not be directly functional without the full context of the DeepIntegration setup.
    /*
    const memory = new MemoryCapsule();
    const grisha = new GrishaCapsule(process.env.GEMINI_API_KEY || '');
    const tetyana = new TetyanaCapsule(unifiedBrain);
    const reasoning = createReasoningCapsule(process.env.GEMINI_API_KEY || '');
    // ... other capsules

    await deep.registerCapsule('kontur://organ/atlas', atlas);
    await deep.registerCapsule('kontur://organ/tetyana', tetyana);
    await deep.registerCapsule('kontur://organ/grisha', grisha);
    
    // Register Reasoning Organ (Gemini 3)
    deep.core.register('kontur://organ/reasoning', (packet) => reasoning.handlePacket(packet));
    reasoning.register(deep.core);
    console.log('[CORE] Registered: kontur://organ/reasoning (Gemini 3)');

    // 4. Start Event Loop
    */

    // Determine target URN. 
    // Usually UI sends to 'kontur://organ/atlas' or similar.
    // DeepIntegration registers 'kontur://organ/atlas'.

    const packet = createPacket(
        'kontur://organ/ui/shell', // From UI
        'kontur://organ/atlas',    // To Atlas
        PacketIntent.CMD,
        {
            goal: prompt,
            msg: prompt
        }
    );
    packet.instruction.op_code = 'PLAN';

    // Subscribe to Synapse to see what's happening (UI events)
    synapse.monitor().subscribe(event => {
        const { source, type, payload } = event;
        // console.log(`[BUS] ${source} -> ${type}:`, payload);

        if (source === 'TETYANA') {
            console.log(`[TETYANA REPORT] ${type}:`, typeof payload === 'object' ? JSON.stringify(payload) : payload);
            if (type === 'EVENT' && payload?.type === 'completed') {
                console.log("✅ TASK COMPLETED SUCCESSFULLY!");
                process.exit(0);
            }
            if (type === 'EVENT' && payload?.type === 'error') {
                console.error("❌ TASK FAILED!");
                process.exit(1);
            }
        }
        if (source === 'GRISHA' && type === 'ALERT') { // Grisha alerts might use different intent
            console.warn(`[GRISHA ALERT]`, payload);
        }
    });

    // Ingest the packet
    system.core.ingest(packet);

    console.log("⏳ Task running... (Press Ctrl+C if stuck)");
}

run().catch(e => {
    console.error("Fatal Error:", e);
    process.exit(1);
});
