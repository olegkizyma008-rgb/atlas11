import { z } from 'zod';

export const ToolDefinitionSchema = z.object({
    name: z.string(),
    description: z.string(),
    path: z.string().optional(),
    status: z.enum(['draft', 'verified', 'installed'])
});

export const ForgeContract = {
    // Methods
    synthesize: z.function()
        .args(z.object({
            name: z.string(),
            description: z.string(),
            code: z.string()
        }))
        .returns(z.promise(ToolDefinitionSchema)),

    validate: z.function()
        .args(z.object({ tool_name: z.string() }))
        .returns(z.promise(z.object({ valid: z.boolean(), error: z.string().optional() }))),

    execute: z.function()
        .args(z.object({
            tool_name: z.string(),
            args: z.record(z.any())
        }))
        .returns(z.promise(z.any())),

    // Signals
    signals: {
        tool_created: z.object({ name: z.string() }),
        execution_complete: z.object({ tool: z.string(), success: z.boolean() })
    }
};

export type ForgeAPI = {
    synthesize: (args: z.infer<typeof ForgeContract.synthesize.args>) => Promise<z.infer<typeof ToolDefinitionSchema>>;
    validate: (args: z.infer<typeof ForgeContract.validate.args>) => Promise<{ valid: boolean; error?: string }>;
    execute: (args: z.infer<typeof ForgeContract.execute.args>) => Promise<any>;
};
