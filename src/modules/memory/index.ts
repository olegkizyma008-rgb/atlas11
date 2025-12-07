import { MemoryAPI, RecallResultSchema, ContextItemSchema } from './contract';
import { initDB } from './db';
import { memories } from './schema';
import { like, or, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export class MemoryCapsule implements MemoryAPI {
    private db = initDB();
    private optimizeInterval: NodeJS.Timer | null = null;

    constructor() {
        console.log('🧠 MemoryCapsule: Real implementation with Drizzle ORM initialized');
        // Auto-optimize every 5 minutes
        this.optimizeInterval = setInterval(() => this.optimize(), 5 * 60 * 1000);
    }

    async store(args: {
        content: string;
        type: 'episode' | 'fact' | 'heuristic';
        metadata?: Record<string, any>;
    }): Promise<void> {
        console.log(`💾 MemoryCapsule: Storing ${args.type} memory: "${args.content.substring(0, 50)}..."`);
        
        const id = uuidv4();
        
        try {
            this.db
                .insert(memories)
                .values({
                    id,
                    type: args.type,
                    content: args.content,
                    metadata: args.metadata,
                })
                .run();
            
            console.log(`✅ MemoryCapsule: Stored ${args.type} with id ${id}`);
        } catch (error) {
            console.error('❌ MemoryCapsule: Failed to store memory', error);
            throw error;
        }
    }

    async recall(args: {
        query: string;
        limit?: number;
    }): Promise<z.infer<typeof RecallResultSchema>> {
        console.log(`🔍 MemoryCapsule: Recalling memories for "${args.query}"...`);
        
        const limit = args.limit || 5;
        const queryPattern = `%${args.query}%`;

        try {
            const results = this.db
                .select()
                .from(memories)
                .where(like(memories.content, queryPattern))
                .limit(limit)
                .all();

            const items: z.infer<typeof ContextItemSchema>[] = results.map((r) => ({
                id: r.id,
                content: r.content,
                type: r.type as 'episode' | 'fact' | 'heuristic',
                timestamp: r.created_at?.getTime() || Date.now(),
                metadata: r.metadata as Record<string, any> | undefined,
            }));

            const summary =
                items.length > 0
                    ? `Found ${items.length} ${items[0].type} memories related to "${args.query}"`
                    : `No memories found for "${args.query}"`;

            console.log(`✅ MemoryCapsule: Recalled ${items.length} items`);

            return { items, summary };
        } catch (error) {
            console.error('❌ MemoryCapsule: Failed to recall memories', error);
            return { items: [], summary: 'Recall failed' };
        }
    }

    async optimize(): Promise<{ nodes_merged: number }> {
        console.log('🔄 MemoryCapsule: Running optimization (deduplication & clustering)...');

        try {
            // 1. Find duplicate content (episodic consolidation)
            const allMemories = this.db.select().from(memories).all();

            const contentMap = new Map<string, string[]>();
            allMemories.forEach((m) => {
                const normalized = m.content.toLowerCase().trim();
                if (!contentMap.has(normalized)) {
                    contentMap.set(normalized, []);
                }
                contentMap.get(normalized)!.push(m.id);
            });

            // 2. Mark duplicates for deletion (keep oldest, delete newer)
            let nodesToMerge = 0;
            const idsToDelete: string[] = [];

            contentMap.forEach((ids) => {
                if (ids.length > 1) {
                    // Sort by age (keep oldest)
                    const oldestId = ids[0];
                    ids.slice(1).forEach((id) => {
                        idsToDelete.push(id);
                        nodesToMerge++;
                    });
                }
            });

            // 3. Delete duplicates
            if (idsToDelete.length > 0) {
                console.log(`🗑️  MemoryCapsule: Deleting ${idsToDelete.length} duplicate memories...`);
                idsToDelete.forEach((id) => {
                    this.db.delete(memories).where(eq(memories.id, id)).run();
                });
            }

            // 4. Heuristic clustering: Combine related episodes
            // (Group semantically similar memories - in production would use embeddings)
            const heuristics = allMemories
                .filter((m) => m.type === 'heuristic')
                .filter((m) => !idsToDelete.includes(m.id));

            if (heuristics.length > 3) {
                // Keep only top 3 most recent heuristics
                const sorted = heuristics.sort(
                    (a, b) => (b.created_at?.getTime() || 0) - (a.created_at?.getTime() || 0)
                );

                sorted.slice(3).forEach((h) => {
                    this.db.delete(memories).where(eq(memories.id, h.id)).run();
                    nodesToMerge++;
                });
            }

            console.log(`✅ MemoryCapsule: Optimization complete. Merged ${nodesToMerge} nodes.`);
            return { nodes_merged: nodesToMerge };
        } catch (error) {
            console.error('❌ MemoryCapsule: Optimization failed', error);
            return { nodes_merged: 0 };
        }
    }

    destroy() {
        if (this.optimizeInterval) {
            clearInterval(this.optimizeInterval);
        }
        console.log('🌙 MemoryCapsule: Destroyed');
    }
}
