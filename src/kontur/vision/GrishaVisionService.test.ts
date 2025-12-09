import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Use vi.hoisted for variables used in vi.mock
const mocks = vi.hoisted(() => ({
    desktopCapturer: {
        getSources: vi.fn().mockResolvedValue([{
            id: 'screen:1',
            name: 'Screen 1',
            thumbnail: { toJPEG: () => Buffer.from('mock-image'), toDataURL: () => 'data:image/jpeg;base64,mock' }
        }])
    },
    providerRouter: {
        analyzeVision: vi.fn().mockResolvedValue({
            verified: true,
            analysis: 'Fallback analysis successful',
            confidence: 0.9,
            anomalies: []
        })
    },
    visionConfig: {
        mode: 'live'
    }
}));

// Mock modules using hoisted variables
vi.mock('electron', () => ({
    desktopCapturer: mocks.desktopCapturer
}));

vi.mock('../providers/config', () => ({
    getVisionConfig: () => mocks.visionConfig
}));

vi.mock('../providers/router', () => ({
    getProviderRouter: () => mocks.providerRouter
}));

// Import service after mocking
import { GrishaVisionService, VisionObservationResult } from './GrishaVisionService';

describe('GrishaVisionService Fallback', () => {
    let service: GrishaVisionService;

    beforeEach(() => {
        vi.useFakeTimers();
        service = new GrishaVisionService();
        // Reset mocks
        mocks.providerRouter.analyzeVision.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should fallback to On-Demand verification when Live mode times out', async () => {
        // Mock notifyActionLive to do nothing (simulate no response)
        // @ts-ignore - accessing private methods for testing
        service.notifyActionLive = vi.fn().mockResolvedValue(undefined);
        // @ts-ignore
        service.captureFrame = vi.fn().mockResolvedValue('base64-image-data');

        // Start verification
        const verificationPromise = service.verifyStep('Test Action', 'Details');

        // Fast-forward time past 10 seconds (10000ms)
        await vi.advanceTimersByTimeAsync(11000);

        // Await result
        const result = await verificationPromise;

        // Assertions
        expect(result.type).toBe('verification'); // Should succeed via fallback
        expect(result.message).toBe('Fallback analysis successful');
        expect(result.mode).toBe('on-demand'); // Mode should be recorded as on-demand fallback

        // Verify fallback was called
        expect(mocks.providerRouter.analyzeVision).toHaveBeenCalled();
    });

    it('should handle Live verification if response comes in time', async () => {
        // @ts-ignore
        service.notifyActionLive = vi.fn().mockImplementation(async () => {
            // Simulate response after 1s
            setTimeout(() => {
                // @ts-ignore
                service.emit('observation', {
                    type: 'confirmation',
                    message: 'Live confirmed',
                    verified: true,
                    timestamp: Date.now(),
                    mode: 'live'
                });
            }, 1000);
        });

        const verificationPromise = service.verifyStep('Test Action');

        // Advance time a bit but less than timeout
        await vi.advanceTimersByTimeAsync(2000);

        const result = await verificationPromise;

        expect(result.type).toBe('confirmation');
        expect(result.mode).toBe('live');
        expect(mocks.providerRouter.analyzeVision).not.toHaveBeenCalled();
    });
});
