import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const memories = sqliteTable('memories', {
    id: text('id').primaryKey(), // UUID
    type: text('type', { enum: ['episode', 'fact', 'heuristic'] }).notNull(),
    content: text('content').notNull(),
    embedding: blob('embedding', { mode: 'buffer' }), // For future vector search
    metadata: text('metadata', { mode: 'json' }), // Flexible JSON storage
    created_at: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
});

export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
