import { z } from 'zod';

export const PlanStepSchema = z.object({
    tool: z.string(),
    action: z.string(),
    args: z.record(z.any())
});

export type PlanStep = z.infer<typeof PlanStepSchema>;

export const PlanSchema = z.object({
    id: z.string(),
    goal: z.string(),
    steps: z.array(PlanStepSchema),
    user_response_ua: z.string().optional(), // Localized response for the user
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
