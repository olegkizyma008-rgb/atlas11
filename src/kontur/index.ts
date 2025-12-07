/**
 * KONTUR v11.0 - Main Integration Module
 * Exports all core systems and utilities
 */

export { Core } from './core/dispatcher';
export { Synapse } from './core/synapse';
export { CortexBrain } from './cortex/brain';
export { UnifiedBrain, createUnifiedBrain } from './cortex/unified-brain';
export { SynapseBridge, createSynapseBridge } from './adapters/synapse-bridge';
export { AtlasOrganMapper, createAtlasOrganMapper } from './adapters/atlas-organ-mapper';

export {
  KPP_Schema,
  type KPP_Packet,
  SecurityScope,
  OrganState,
  PacketIntent,
  verifyPacket,
  computeIntegrity,
  compressPayload,
  decompressPayload,
  createPacket,
} from './protocol/nexus';

/**
 * Initialize KONTUR system with given configuration
 */
export interface KONTURConfig {
  aiProvider?: string;
  aiApiKey?: string;
  enableAG?: boolean;
  enablePython?: boolean;
  pythonCmd?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export async function initializeKONTUR(config: KONTURConfig = {}) {
  const { Core } = await import('./core/dispatcher');
  const { CortexBrain } = await import('./cortex/brain');

  const core = new Core();
  const cortex = new CortexBrain();

  core.cortex = cortex;
  cortex.on('decision', (packet) => core.ingest(packet));

  return { core, cortex };
}
