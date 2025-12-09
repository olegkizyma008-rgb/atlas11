import { z } from 'zod';

export const VoiceContract = {
    // Methods
    speak: z.function()
        .args(z.object({
            text: z.string(),
            voice: z.enum(['atlas', 'tetyana', 'grisha']).optional().default('atlas'),
            speed: z.number().optional().default(1.0)
        }))
        .returns(z.promise(z.void())),

    listen: z.function()
        .args(z.object({
            timeout: z.number().optional().default(5000) // ms to wait for silence
        }))
        .returns(z.promise(z.object({
            text: z.string().optional(), // Text if recognized
            error: z.string().optional()
        }))),

    // Signals
    signals: {
        speaking_started: z.object({ text: z.string() }),
        speaking_finished: z.object({}),
        listening_started: z.object({}),
        listening_finished: z.object({ text: z.string().optional() }),
        voice_command: z.object({ text: z.string() }) // High-level command detected
    }
};

export type VoiceAPI = {
    speak: (args: { text: string; voice?: string; speed?: number }) => Promise<any>;
    listen: (args: { timeout?: number }) => Promise<{ text?: string; error?: string }>;
};
