import { MemoryAPI, ContextItemSchema, RecallResultSchema } from './contract';
import { z } from 'zod';

export class MemoryGhost implements MemoryAPI {
    private storage: z.infer<typeof ContextItemSchema>[] = [];

    constructor() {
        console.log("👻 MemoryGhost Initialized");
    }

    async store(args: { content: string; type: 'episode' | 'fact' | 'heuristic'; metadata?: Record<string, any> }) {
        const item = {
            id: Math.random().toString(36).substring(7),
            content: args.content,
            type: args.type,
            timestamp: Date.now(),
            metadata: args.metadata
        };
        this.storage.push(item);
        console.log(`👻 MemoryGhost: Stored [${args.type}] "${args.content}"`);
    }

    async recall(args: { query: string; limit?: number }) {
        const limit = args.limit || 5;
        // Simple keyword matching for ghost
        const items = this.storage
            .filter(item => item.content.toLowerCase().includes(args.query.toLowerCase()))
            .slice(0, limit);

        console.log(`👻 MemoryGhost: Recalled ${items.length} items for "${args.query}"`);

        return {
            items,
            summary: items.length > 0 ? `Found ${items.length} memories related to ${args.query}` : "No memories found."
        };
    }

    async optimize() {
        console.log("👻 MemoryGhost: Optimizing...");
        return { nodes_merged: 0 }; // Mock response
    }
}
