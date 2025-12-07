import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { synapse } from '../../kontur/synapse';
import { observable } from '@trpc/server/observable';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
    health: publicProcedure.query(() => 'KONTUR 2.0 Alive'),

    synapse: publicProcedure.subscription(() => {
        return observable((emit) => {
            const sub = synapse.monitor().subscribe({
                next: (signal) => emit.next(signal),
                error: (err) => emit.error(err),
                complete: () => emit.complete()
            });
            return () => sub.unsubscribe();
        });
    })
});

export type AppRouter = typeof appRouter;
