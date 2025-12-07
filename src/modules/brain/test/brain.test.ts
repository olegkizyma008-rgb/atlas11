import { describe, it, expect } from 'vitest';
import { BrainGhost } from '../ghost';

describe('Brain Capsule (Ghost)', () => {
    const brain = new BrainGhost();

    it('should think and return text', async () => {
        const result = await brain.think({
            system_prompt: 'You are a test brain',
            user_prompt: 'Hello'
        });
        expect(result.text).toBeDefined();
        expect(result.text).toContain('Ghost Brain');
    });

    it('should simulate ATLAS planning', async () => {
        const result = await brain.think({
            system_prompt: 'You are ATLAS',
            user_prompt: 'Plan integration'
        });
        expect(result.text).toContain('Simulated Plan');
    });
});
