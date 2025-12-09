import { describe, it, expect } from 'vitest';
import { synapse } from '../src/kontur/synapse';

// Use Real Capsules (Logic)
import { AtlasCapsule } from '../src/modules/atlas/index';
import { TetyanaCapsule } from '../src/modules/tetyana/index';
import { GrishaCapsule } from '../src/modules/grisha/index';
import { VoiceCapsule } from '../src/kontur/voice/VoiceCapsule'; // KONTUR 2.0 Native Capsule

// Use Ghosts for Dependencies (Data/IO)
import { MemoryGhost } from '../src/modules/memory/ghost';
import { ForgeGhost } from '../src/modules/forge/ghost';
import { BrainGhost } from '../src/modules/brain/ghost';

describe('KONTUR 2.0 Integration (Real Agents + Brain Ghost)', () => {
    // 1. Initialize Infrastructure (Ghosts)
    const memory = new MemoryGhost();
    const forge = new ForgeGhost();
    const voice = new VoiceCapsule(); // Use Real Capsule to get Synapse signals!
    const brain = new BrainGhost(); // The Mock Intelligence

    // 2. Initialize Agents (Real Logic)
    const atlas = new AtlasCapsule(memory, brain);
    const tetyana = new TetyanaCapsule(forge, voice, brain);
    const grisha = new GrishaCapsule(brain);

    it('should run a full Continuous Existence Cycle', async () => {
        const signals: any[] = [];

        // 1. Monitor Synapse
        const sub = synapse.monitor().subscribe(s => signals.push(s));

        // 2. Atlas Plans (Using Brain)
        console.log("TEST: Atlas planning...");
        synapse.emit('atlas', 'planning_started', { goal: 'Integrate KONTUR' });
        const plan = await atlas.plan({ goal: 'Integrate KONTUR' });

        // BrainGhost returns a simulated plan
        expect(plan.status).toBe('active');
        expect(plan.steps.length).toBeGreaterThan(0);
        // Synapse emission is inside AtlasCapsule now (via emit)
        // We expect Atlas to emit 'plan_ready'

        // 3. Tetyana Executes (Using Voice + Brain)
        console.log("TEST: Tetyana forging tool...");
        // First, forge the tool so it exists in the ghost
        await tetyana.forge_tool({ name: 'builder', spec: 'console.log("Building...")' });

        console.log("TEST: Tetyana executing...");
        synapse.emit('tetyana', 'execution_started', { tool: 'builder' });
        // Execute the tool we just forged
        const execution = await tetyana.execute({ tool: 'builder', args: { task: 'build' } });
        expect(execution.success).toBe(true);
        // Tetyana should have spoken (Voice contract) -> 'request_tts' signal

        // 4. Grisha Observes (Using Brain)
        console.log("TEST: Grisha observing...");
        const observation = await grisha.observe();
        expect(observation.threats).toHaveLength(0); // Ghost Brain returns safe by default

        // 5. Verify Synapse Flow
        expect(signals.length).toBeGreaterThanOrEqual(1);

        // Check specific signals
        const planReady = signals.find(s => s.source === 'atlas' && s.type === 'plan_ready');
        const ttsRequest = signals.find(s => s.source === 'voice' && s.type === 'request_tts');

        expect(planReady).toBeDefined();
        expect(ttsRequest).toBeDefined(); // Tetyana spoke!

        sub.unsubscribe();
    });
});
