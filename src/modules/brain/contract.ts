import { z } from 'zod';

export const BrainContract = {
    // Methods
    think: z.function()
        .args(z.object({
            system_prompt: z.string(),
            user_prompt: z.string(),
            model: z.enum(['gemini-2.0-flash-exp', 'gemini-1.5-pro']).optional().default('gemini-2.0-flash-exp'),
            tools: z.array(z.any()).optional() // For function calling schemas
        }))
        .returns(z.promise(z.object({
            text: z.string().optional(),
            tool_calls: z.array(z.object({
                name: z.string(),
                args: z.record(z.any())
            })).optional(),
            usage: z.object({
                input_tokens: z.number().optional(),
                output_tokens: z.number().optional()
            }).optional()
        }))),
};

export type BrainAPI = {
    think: (args: Parameters<z.infer<typeof BrainContract.think>>[0]) => Promise<{
        text?: string;
        tool_calls?: { name: string; args: Record<string, any> }[];
        usage?: { input_tokens?: number; output_tokens?: number };
    }>;
};
