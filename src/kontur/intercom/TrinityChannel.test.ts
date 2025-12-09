
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrinityChannel, getTrinity } from './TrinityChannel';
import { PacketIntent } from '../protocol/nexus';

// Mock dependencies
const mockCore = {
    ingest: vi.fn(),
    on: vi.fn(),
    emit: vi.fn(),
    removeListener: vi.fn()
};

vi.mock('../protocol/nexus', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../protocol/nexus')>();
    return {
        ...actual,
        createPacket: vi.fn().mockReturnValue({
            instruction: { intent: 'EVENT', op_code: 'TEST' },
            payload: {},
            nexus: {},
            route: {}
        })
    };
});

describe('TrinityChannel', () => {
    let trinity: TrinityChannel;

    beforeEach(() => {
        // Reset Singleton for testing if possible or just get instance
        trinity = getTrinity();
        trinity.setCore(mockCore as any);
        vi.clearAllMocks();
    });

    it('should be a singleton', () => {
        const t1 = TrinityChannel.getInstance();
        const t2 = getTrinity();
        expect(t1).toBe(t2);
    });

    it('should emit UA chat and EN log packets to Core', () => {
        const actor = 'TETYANA';
        const msgUA = 'Привіт світ';
        const msgEN = 'Hello World';

        trinity.talk(actor, msgUA, msgEN);

        // Core.ingest should be called twice: once for chat, once for log
        expect(mockCore.ingest).toHaveBeenCalledTimes(2);
    });

    it('should emit only UA chat if no logEN provided', () => {
        const actor = 'GRISHA';
        const msgUA = 'Бачу все';

        trinity.talk(actor, msgUA);

        expect(mockCore.ingest).toHaveBeenCalledTimes(1);
    });

    it('should send heartbeat packets', () => {
        trinity.heartbeat('ATLAS', 'Thinking...');
        expect(mockCore.ingest).toHaveBeenCalledTimes(1);
    });
});
