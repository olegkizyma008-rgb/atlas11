import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MemoryCapsule } from '../src/modules/memory/index';
import { initDB } from '../src/modules/memory/db';
import { memories } from '../src/modules/memory/schema';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'atlas.db');

describe('Phase 8: Persistence Verification', () => {

    // Clean up DB before test
    beforeAll(() => {
        if (fs.existsSync(DB_PATH)) {
            fs.unlinkSync(DB_PATH);
        }
    });

    it('should persist memories across capsule instances', async () => {
        // Instance 1: Store memory
        const memory1 = new MemoryCapsule();
        await memory1.store({
            content: "The sky is blue",
            type: "fact",
            metadata: { confidence: 0.9 }
        });

        // Instance 2: Retrieve memory (simulating restart)
        const memory2 = new MemoryCapsule();
        const results = await memory2.retrieve({ query: "sky" });

        expect(results).toHaveLength(1);
        expect(results[0].content).toBe("The sky is blue");
        expect(results[0].type).toBe("fact");
        // Check if DB file exists
        expect(fs.existsSync(DB_PATH)).toBe(true);
    });

    afterAll(() => {
        // Optional: Keep DB for inspection or clean up
        // fs.unlinkSync(DB_PATH); 
    });
});
