import { z } from 'zod';
import { VoiceAPI } from '../../kontur/voice/contract';

export const TetyanaContract = {
    // Methods
    execute: z.function()
        .args(z.object({
            tool: z.string(),
            args: z.record(z.any())
        }))
        .returns(z.promise(z.object({
            success: z.boolean(),
            output: z.any()
        }))),

    forge_tool: z.function()
        .args(z.object({
            name: z.string(),
            spec: z.string()
        }))
        .returns(z.promise(z.string())), // Returns path to new tool

    // Signals
    signals: {
        execution_started: z.object({ tool: z.string() }),
        execution_finished: z.object({ tool: z.string(), success: z.boolean() })
    }
};

export type TetyanaAPI = {
    execute: (args: z.infer<typeof TetyanaContract.execute.args>) => Promise<{ success: boolean; output: any }>;
    forge_tool: (args: z.infer<typeof TetyanaContract.forge_tool.args>) => Promise<string>;
};
