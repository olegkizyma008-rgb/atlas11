import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryGhost } from '../ghost';

describe('Memory Capsule (Ghost)', () => {
    let memory: MemoryGhost;

    beforeEach(() => {
        memory = new MemoryGhost();
    });

    it('should store and recall a fact', async () => {
        // 1. Store
        await memory.store({
            content: 'The sky is blue',
            type: 'fact'
        });

        // 2. Recall
        const result = await memory.recall({ query: 'sky' });

        // 3. Verify
        expect(result.items).toHaveLength(1);
        expect(result.items[0].content).toBe('The sky is blue');
    });

    it('should return empty list for unknown query', async () => {
        await memory.store({ content: 'Cats have whiskers', type: 'fact' });
        const result = await memory.recall({ query: 'Dog' });
        expect(result.items).toHaveLength(0);
    });
});
