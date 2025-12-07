---
description: Technical Specification for the MEMORY CAPSULE (System Module) - The Storage Layer for ATLAS.
---

# MEMORY: The Storage Capsule

## Scope
**This is NOT an Agent.**
This is a **System Capsule** (`src/modules/memory`) responsible for data persistence.
**ATLAS** (The Agent) is the exclusive owner and user of this module.

## Capsule Definition
*   **Type**: KONTUR System Capsule.
*   **Location**: `src/modules/memory`.
*   **Consumer**: `src/modules/atlas`.

## 1. Capsule Structure
Standard KONTUR 2.0 layout:
*   `contract.ts`: The Interface (Zod).
*   `schema.ts`: The Database (Drizzle).
*   `index.ts`: The Logic (Implementation).
*   `ghost.ts`: The Mock (Simulation).

## 2. The Contract (`contract.ts`)
Strictly defines how ATLAS stores and retrieves information.

```typescript
// src/modules/memory/contract.ts
export const MemoryContract = {
  // ATLAS asks to remember something
  store_episode: z.function()
    .args(z.object({ log: z.string(), mood: z.string() }))
    .returns(z.promise(z.void())),

  // ATLAS asks to recall context
  recall_context: z.function()
    .args(z.object({ query: z.string() }))
    .returns(z.promise(ContextObject)),
    
  // Signal: Memory optimization complete
  signals: {
    optimized: z.object({ nodes_merged: z.number() })
  }
};
```

## 3. Internal Architecture (`schema.ts`)
*   **`episodes_table`**: High-fidelity logs of what Tetyana did.
*   **`heuristics_table`**: "Sticky Notes" that ATLAS wrote to itself.
*   **`knowledge_graph`**: Nodes and Edges representing ATLAS's World Model.

## 4. The "Dreaming" Process (Maintenance)
When ATLAS enters "Sleep Mode" (Idle):
1.  ATLAS triggers `Memory.optimize()`.
2.  The Memory Capsule runs background algorithms to merge duplicate nodes and compress logs.
3.  It emits `optimized` signal when done.

## 5. The Ghost (`ghost.ts`)
Used when developing ATLAS logic without a real database.

```typescript
export class MemoryGhost implements MemoryAPI {
  async recall_context() {
    return { summary: "I am a mock memory.", last_action: "None" };
  }
}
```
