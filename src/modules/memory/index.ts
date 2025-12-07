import { MemoryAPI } from './contract';
import { initDB } from './db';
import { memories } from './schema';
import { like, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class MemoryCapsule implements MemoryAPI {
    private db = initDB();

    async store(args: { content: string; type: 'episode' | 'fact' | 'heuristic'; metadata?: Record<string, any> }) {
        console.log(`💾 MemoryCapsule: Storing ${args.type} memory...`);
        this.db.insert(memories).values({
            id: uuidv4(),
            type: args.type,
            content: args.content,
            metadata: args.metadata,
        }).run();
    }

    async retrieve(args: { query: string; limit?: number }) {
        console.log(`🔍 MemoryCapsule: Retrieving memories for "${args.query}"...`);
        const results = this.db.select()
            .from(memories)
            .where(or(
                like(memories.content, `%${args.query}%`),
                // simplistic keyword search for now
            ))
            .limit(args.limit || 5)
            .all();

        return results.map(r => ({
            id: r.id,
            content: r.content,
            type: r.type as 'episode' | 'fact' | 'heuristic',
            metadata: r.metadata,
            created_at: r.created_at
        }));
    }
}
