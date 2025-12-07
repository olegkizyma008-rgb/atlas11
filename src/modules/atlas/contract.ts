import { z } from 'zod';

export const PlanSchema = z.object({
    id: z.string(),
    goal: z.string(),
    steps: z.array(z.string()),
    status: z.enum(['pending', 'active', 'completed', 'failed'])
});

export type Plan = z.infer<typeof PlanSchema>;


export const AtlasContract = {
    // Methods
    plan: z.function()
        .args(z.object({ goal: z.string() }))
        .returns(z.promise(PlanSchema)),

    dream: z.function()
        .args(z.void())
        .returns(z.promise(z.object({ insights: z.array(z.string()) }))),

    // Signals
    signals: {
        planning_started: z.object({ goal: z.string() }),
        plan_ready: z.object({ planId: z.string(), steps: z.number() })
    }
};

export type AtlasAPI = {
    plan: (args: z.infer<typeof AtlasContract.plan.args>) => Promise<z.infer<typeof PlanSchema>>;
    dream: () => Promise<{ insights: string[] }>;
};
