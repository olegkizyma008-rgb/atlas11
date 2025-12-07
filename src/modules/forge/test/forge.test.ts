import { describe, it, expect, beforeEach } from 'vitest';
import { ForgeGhost } from '../ghost';

describe('Forge Capsule (Ghost)', () => {
    let forge: ForgeGhost;

    beforeEach(() => {
        forge = new ForgeGhost();
    });

    it('should synthesize and validate a tool', async () => {
        // 1. Synthesize
        const tool = await forge.synthesize({
            name: 'weather_checker',
            description: 'Checks the weather',
            code: 'console.log("Sun")'
        });

        expect(tool.status).toBe('verified');

        // 2. Validate
        const validation = await forge.validate({ tool_name: 'weather_checker' });
        expect(validation.valid).toBe(true);
    });

    it('should execute a tool', async () => {
        await forge.synthesize({ name: 'calc', description: 'add', code: 'return 1+1' });
        const result = await forge.execute({ tool_name: 'calc', args: { a: 1 } });
        expect(result.success).toBe(true);
    });
});
