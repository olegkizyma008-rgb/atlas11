import { EventEmitter } from 'events';
import { createPacket, PacketIntent, KPP_Packet } from '../protocol/nexus';
import { Core } from '../core/dispatcher';

export type TrinityActor = 'ATLAS' | 'TETYANA' | 'GRISHA';

export interface TrinityMessage {
    actor: TrinityActor;
    messageUA: string;
    logEN?: string;
    timestamp: number;
}

/**
 * TRINITY CHANNEL
 * 
 * The central communication bus for the Unified Intelligence.
 * Purpose: 
 * 1. Enforce Ukrainian localization for USER-facing chat.
 * 2. Allow English internal logs.
 * 3. Provide a unified "Stream of Consciousness" for the UI.
 */
export class TrinityChannel extends EventEmitter {
    private static instance: TrinityChannel;
    private core: Core | null = null;

    private constructor() {
        super();
    }

    public static getInstance(): TrinityChannel {
        if (!TrinityChannel.instance) {
            TrinityChannel.instance = new TrinityChannel();
        }
        return TrinityChannel.instance;
    }

    /**
     * Connect to the Core dispatcher to emit UI packets
     */
    public setCore(core: Core) {
        this.core = core;
    }

    /**
     * The main method for Agents to speak.
     * @param actor The persona speaking (ATLAS, TETYANA, GRISHA)
     * @param messageUA The message in UKRAINIAN for the user
     * @param logEN (Optional) Technical english log for debugging
     */
    public talk(actor: TrinityActor, messageUA: string, logEN?: string) {
        // 1. Emit internal event for subsystems
        this.emit('message', { actor, messageUA, logEN, timestamp: Date.now() });

        // 2. Log technical detail to console (English usually)
        if (logEN) {
            console.log(`[${actor}] 🗣️ ${logEN}`);
        } else {
            console.log(`[${actor}] 🗣️ ${messageUA}`);
        }

        // 3. Emit formatted packet to UI (if Core connected)
        if (this.core) {
            // Send CHAT message (Ukrainian)
            this.sendUIPacket('chat', `**${actor}**: ${messageUA}`);

            // Send LOG message (English context)
            if (logEN) {
                this.sendUIPacket('log', `[${actor}] ${logEN}`);
            }
        }
    }

    /**
     * Send heartbeat/status update
     */
    public heartbeat(actor: TrinityActor, statusUA: string) {
        if (this.core) {
            // Create a status event that UI can display as "Computing..." or "Typing..."
            this.sendUIPacket('status', `${actor}: ${statusUA}`);
        }
    }

    private sendUIPacket(type: 'chat' | 'log' | 'status', msg: string) {
        if (!this.core) return;

        try {
            const packet = createPacket(
                'kontur://organ/trinity', // From Trinity Channel
                'kontur://organ/ui/shell', // To UI
                PacketIntent.EVENT,
                { type, msg }
            );
            this.core.ingest(packet);
        } catch (e) {
            console.error('[TRINITY] Failed to emit packet:', e);
        }
    }
}

// Global accessor
export const getTrinity = () => TrinityChannel.getInstance();
