import { Subject, filter, map } from 'rxjs';
import { z } from 'zod';

// Define the Signal Structure
export const SignalSchema = z.object({
    source: z.string(), // e.g., 'atlas', 'system', 'voice'
    type: z.string(),   // e.g., 'context_updated', 'request_tts', 'voice_command'
    payload: z.any()    // Flexible payload for now
});

export type Signal = z.infer<typeof SignalSchema>;

class Synapse {
    private bus$ = new Subject<Signal>();

    /**
     * Emit a signal to the bus.
     */
    emit(source: string, type: string, payload: any = {}) {
        const signal = { source, type, payload };
        // Runtime validation
        const result = SignalSchema.safeParse(signal);
        if (!result.success) {
            console.error("Invalid Synapse Signal:", result.error);
            return;
        }
        this.bus$.next(signal);
    }

    /**
     * Listen for specific signals.
     */
    listen(source: string, type: string) {
        return this.bus$.pipe(
            filter(s => s.source === source && s.type === type),
            map(s => s.payload)
        );
    }

    /**
     * Listen to EVERYTHING (for monitoring/UI).
     */
    monitor() {
        return this.bus$.asObservable();
    }
}

export const synapse = new Synapse();
