import { describe, it, expect } from 'vitest';
import { VoiceGhost } from '../ghost';

describe('Voice Capsule (Ghost)', () => {
    const voice = new VoiceGhost();

    it('should speak text', async () => {
        await expect(voice.speak({ text: 'Test' })).resolves.not.toThrow();
    });

    it('should listen and return mock text', async () => {
        const result = await voice.listen({});
        expect(result.text).toBeDefined();
        expect(typeof result.text).toBe('string');
    });
});
