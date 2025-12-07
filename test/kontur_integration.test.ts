import { describe, it, expect } from 'vitest';
import { synapse } from '../src/kontur/synapse';
import { AtlasGhost } from '../src/modules/atlas/ghost';
import { TetyanaGhost } from '../src/modules/tetyana/ghost';
import { GrishaGhost } from '../src/modules/grisha/ghost';

describe('KONTUR 2.0 Integration (Ghost Mode)', () => {
    const atlas = new AtlasGhost();
    const tetyana = new TetyanaGhost();
    const grisha = new GrishaGhost();

    it('should run a full Continuous Existence Cycle', async () => {
        const signals: any[] = [];

        // 1. Monitor Synapse
        const sub = synapse.monitor().subscribe(s => signals.push(s));

        // 2. Atlas Plans
        console.log("TEST: Atlas planning...");
        synapse.emit('atlas', 'planning_started', { goal: 'Integrate KONTUR' });
        const plan = await atlas.plan({ goal: 'Integrate KONTUR' });
        expect(plan.status).toBe('active');
        synapse.emit('atlas', 'plan_ready', { planId: plan.id, steps: plan.steps.length });

        // 3. Tetyana Executes
        console.log("TEST: Tetyana executing...");
        synapse.emit('tetyana', 'execution_started', { tool: 'forge' });
        const execution = await tetyana.execute({ tool: 'forge', args: { task: 'build' } });
        expect(execution.success).toBe(true);
        synapse.emit('tetyana', 'execution_finished', { tool: 'forge', success: true });

        // 4. Grisha Observes
        console.log("TEST: Grisha observing...");
        const observation = await grisha.observe();
        expect(observation.threats).toHaveLength(0);
        synapse.emit('grisha', 'threat_detected', { level: 'low', description: 'All systems nominal' });

        // 5. Verify Synapse Flow
        // We emitted 5 signals manually + agents did work
        expect(signals.length).toBeGreaterThanOrEqual(5);
        expect(signals.find(s => s.source === 'atlas' && s.type === 'plan_ready')).toBeDefined();
        expect(signals.find(s => s.source === 'tetyana' && s.type === 'execution_finished')).toBeDefined();

        sub.unsubscribe();
    });
});
