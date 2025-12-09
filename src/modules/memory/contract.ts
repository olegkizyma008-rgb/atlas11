import { z } from 'zod';

// Data types
export const ContextItemSchema = z.object({
    id: z.string(),
    content: z.string(),
    type: z.enum(['episode', 'fact', 'heuristic']),
    timestamp: z.number(),
    metadata: z.record(z.any()).optional()
});

export const RecallResultSchema = z.object({
    items: z.array(ContextItemSchema),
    summary: z.string().optional()
});

// The Contract
export const MemoryContract = {
    // Methods
    store: z.function()
        .args(z.object({
            content: z.string(),
            type: z.enum(['episode', 'fact', 'heuristic']),
            metadata: z.record(z.any()).optional()
        }))
        .returns(z.promise(z.void())),

    recall: z.function()
        .args(z.object({
            query: z.string(),
            limit: z.number().optional().default(5)
        }))
        .returns(z.promise(RecallResultSchema)),

    optimize: z.function()
        .args(z.void())
        .returns(z.promise(z.object({ nodes_merged: z.number() }))),

    // Signals (Events emitted to Synapse)
    signals: {
        memory_updated: z.object({ type: z.string(), count: z.number() }),
        optimization_complete: z.object({ stats: z.any() })
    }
};

export type MemoryAPI = {
    store: (args: Parameters<z.infer<typeof MemoryContract.store>>[0]) => Promise<void>;
    recall: (args: Parameters<z.infer<typeof MemoryContract.recall>>[0]) => Promise<Awaited<ReturnType<z.infer<typeof MemoryContract.recall>>>>;
    optimize: () => Promise<{ nodes_merged: number }>;
};
