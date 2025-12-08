
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoiceCapsule } from '../src/kontur/voice/VoiceCapsule';

describe('VoiceCapsule API Key Handling', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        delete process.env.GEMINI_API_KEY;
        delete process.env.GOOGLE_API_KEY;
        delete process.env.GEMINI_LIVE_API_KEY;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should initialize with GEMINI_API_KEY', () => {
        process.env.GEMINI_API_KEY = 'test-gemini-key';
        const capsule = new VoiceCapsule();
        // @ts-ignore - accessing private property for testing
        expect(capsule.apiKey).toBe('test-gemini-key');
    });

    it('should initialize with GOOGLE_API_KEY if GEMINI_API_KEY is missing', () => {
        process.env.GOOGLE_API_KEY = 'test-google-key';
        const capsule = new VoiceCapsule();
        // @ts-ignore
        expect(capsule.apiKey).toBe('test-google-key');
    });

    it('should initialize with GEMINI_LIVE_API_KEY if others are missing', () => {
        process.env.GEMINI_LIVE_API_KEY = 'test-live-key';
        const capsule = new VoiceCapsule();
        // @ts-ignore
        expect(capsule.apiKey).toBe('test-live-key');
    });

    it('should prioritize GEMINI_API_KEY over others', () => {
        process.env.GEMINI_API_KEY = 'test-gemini-key';
        process.env.GOOGLE_API_KEY = 'test-google-key';
        const capsule = new VoiceCapsule();
        // @ts-ignore
        expect(capsule.apiKey).toBe('test-gemini-key');
    });

    it('should prioritize GOOGLE_API_KEY over GEMINI_LIVE_API_KEY', () => {
        process.env.GOOGLE_API_KEY = 'test-google-key';
        process.env.GEMINI_LIVE_API_KEY = 'test-live-key';
        const capsule = new VoiceCapsule();
        // @ts-ignore
        expect(capsule.apiKey).toBe('test-google-key');
    });

    it('should warn if no key is found', () => {
        const consoleSpy = vi.spyOn(console, 'warn');
        new VoiceCapsule();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No API key found'));
    });
});
