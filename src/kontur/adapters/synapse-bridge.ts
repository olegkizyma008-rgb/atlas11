/**
 * Synapse Bridge - Atlas ↔ KONTUR Adapter
 * Converts between RxJS Signals and KPP Packets
 * Enables bidirectional flow of data between Atlas Synapse and KONTUR Core
 */

import { Signal, SignalSchema } from '../../kontur/synapse';
import {
  KPP_Packet,
  PacketIntent,
  createPacket,
} from '../protocol/nexus';
import { Core } from '../core/dispatcher';

export class SynapseBridge {
  private callbacks: Map<string, Function[]> = new Map();

  constructor(
    private synapse: any,
    private core: Core
  ) {
    this.initSync();
  }

  /**
   * Initialize bidirectional synchronization
   */
  private initSync(): void {
    // 1. Listen to Atlas Synapse signals and convert to KPP packets
    this.synapse.monitor().subscribe((signal: Signal) => {
      const packet = this.convertSignalToPacket(signal);
      if (packet) {
        this.core.ingest(packet);
      }
    });
  }

  /**
   * Convert Synapse Signal → KPP Packet
   * Maps Atlas signals to KONTUR protocol format
   */
  convertSignalToPacket(signal: Signal): KPP_Packet | null {
    const result = SignalSchema.safeParse(signal);
    if (!result.success) {
      console.warn('[BRIDGE] Invalid signal:', result.error);
      return null;
    }

    const { source, type, payload } = signal;

    // Map signal types to packet intents
    let intent = PacketIntent.EVENT;
    let op_code = type;

    if (type === 'plan_ready' || type === 'planning_started') {
      intent = PacketIntent.AI_PLAN;
      op_code = 'ATLAS_PLAN';
    } else if (type === 'execution_started' || type === 'execution_complete') {
      op_code = 'TETYANA_EXEC';
    } else if (type === 'threat_detected' || type === 'audit_log') {
      op_code = 'GRISHA_AUDIT';
    } else if (type === 'memory_updated' || type === 'optimization_complete') {
      op_code = 'MEMORY_STORE';
    } else if (type === 'speaking_started' || type === 'listening_finished') {
      op_code = 'VOICE_SPEAK';
    }

    const packet = createPacket(
      `kontur://atlas/${source}`,
      'kontur://core/system',
      intent,
      {
        signal_type: type,
        signal_source: source,
        ...payload,
      }
    );

    return packet;
  }

  /**
   * Convert KPP Packet → Synapse Signal
   * Maps KONTUR responses back to Atlas signal format
   */
  convertPacketToSignal(packet: KPP_Packet): Signal | null {
    const { instruction, payload, route } = packet;

    // Extract source from route
    const source = route.from.split('/').pop() || 'kontur';
    const type = instruction.op_code.toLowerCase();

    const signal: Signal = {
      source,
      type,
      payload: {
        ...payload,
        packet_intent: instruction.intent,
        timestamp: packet.nexus.timestamp,
      },
    };

    return signal;
  }

  /**
   * Get observable-like interface for sync packets
   */
  getSyncObservable(): any {
    return {
      subscribe: (observer: any) => {
        // Register observer callback
        if (!this.callbacks.has('sync')) {
          this.callbacks.set('sync', []);
        }
        this.callbacks.get('sync')!.push(observer.next);

        return {
          unsubscribe: () => {
            const handlers = this.callbacks.get('sync') || [];
            handlers.splice(handlers.indexOf(observer.next), 1);
          }
        };
      }
    };
  }

  /**
   * Get observable-like interface for signal packets
   */
  getSignalObservable(): any {
    return {
      subscribe: (observer: any) => {
        // Register observer callback
        if (!this.callbacks.has('signal')) {
          this.callbacks.set('signal', []);
        }
        this.callbacks.get('signal')!.push(observer.next);

        return {
          unsubscribe: () => {
            const handlers = this.callbacks.get('signal') || [];
            handlers.splice(handlers.indexOf(observer.next), 1);
          }
        };
      }
    };
  }

  /**
   * Manual sync - Convert array of signals to packets
   */
  syncSignalsToPackets(signals: Signal[]): KPP_Packet[] {
    return signals
      .map(s => this.convertSignalToPacket(s))
      .filter((p): p is KPP_Packet => p !== null);
  }

  /**
   * Manual sync - Convert array of packets to signals
   */
  syncPacketsToSignals(packets: KPP_Packet[]): Signal[] {
    return packets
      .map(p => this.convertPacketToSignal(p))
      .filter((s): s is Signal => s !== null);
  }
}

export function createSynapseBridge(synapse: any, core: Core): SynapseBridge {
  return new SynapseBridge(synapse, core);
}
