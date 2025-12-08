
import { describe, it, expect, vi } from 'vitest';
import { AtlasCapsule } from '../index';
import { MemoryAPI } from '../../memory/contract';
import { BrainAPI } from '../../brain/contract';

describe('AtlasCapsule Integration', () => {
    it('should generate a structured plan', async () => {
        // Mock Dependencies
        const mockMemory = { recall: vi.fn(), optimize: vi.fn() } as unknown as MemoryAPI;
        const mockBrain = {
            think: vi.fn().mockResolvedValue({
                text: JSON.stringify({
                    goal: 'Test Goal',
                    steps: [
                        { tool: 'kontur://organ/system', action: 'exec', args: { cmd: 'echo hello' } }
                    ],
                    user_response_ua: 'Привіт'
                })
            })
        } as unknown as BrainAPI;

        const atlas = new AtlasCapsule(mockMemory, mockBrain);
        const plan = await atlas.plan({ goal: 'Test Goal' });

        expect(plan.id).toBeDefined();
        expect(plan.steps).toHaveLength(1);
        expect(plan.steps[0].tool).toBe('kontur://organ/system');
        expect(plan.steps[0].action).toBe('exec');
        expect(plan.user_response_ua).toBe('Привіт');
    });

    it('should handle brain errors gracefully', async () => {
        const mockMemory = {} as any;
        const mockBrain = { think: vi.fn().mockRejectedValue(new Error('Brain fail')) } as any;

        const atlas = new AtlasCapsule(mockMemory, mockBrain);
        const plan = await atlas.plan({ goal: 'Fail' });

        expect(plan.status).toBe('failed');
        expect(plan.user_response_ua).toContain('помилка');
    });
});
