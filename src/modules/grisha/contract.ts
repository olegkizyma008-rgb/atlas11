import { z } from 'zod';

export const GrishaContract = {
    // Methods
    observe: z.function()
        .args(z.void()) // Takes screenshot/vision input
        .returns(z.promise(z.object({
            summary: z.string(),
            threats: z.array(z.string())
        }))),

    audit: z.function()
        .args(z.object({ action: z.string(), params: z.record(z.any()) }))
        .returns(z.promise(z.object({ allowed: z.boolean(), reason: z.string().optional() }))),

    // Signals
    signals: {
        threat_detected: z.object({ level: z.enum(['low', 'high', 'critical']), description: z.string() }),
        audit_log: z.object({ action: z.string(), verdict: z.string() })
    }
};

export type GrishaAPI = {
    observe: () => Promise<{ summary: string; threats: string[] }>;
    audit: (args: z.infer<typeof GrishaContract.audit.args>) => Promise<{ allowed: boolean; reason?: string }>;
};
