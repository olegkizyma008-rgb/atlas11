/**
 * KONTUR Integration Module
 * Provides ready-to-use initialization and synchronization functions
 */

import { Core, CortexBrain } from './index';
import { createPacket, PacketIntent } from './protocol/nexus';
import { join } from 'path';

export interface KONTURIntegrationConfig {
  enableAG?: boolean;
  pythonPath?: string;
  workerScript?: string;
  agScript?: string;
}

/**
 * Initialize KONTUR system with organs and cortex
 */
export async function initializeKONTURSystem(config: KONTURIntegrationConfig = {}) {
  const {
    enableAG = process.env.AG === 'true',
    pythonPath = process.platform === 'win32' ? 'python' : 'python3',
    workerScript = join(__dirname, './organs/worker.py'),
    agScript = join(__dirname, './ag/ag-worker.py'),
  } = config;

  const core = new Core();
  const cortex = new CortexBrain();

  // Setup event handlers
  cortex.on('decision', (packet) => core.ingest(packet));
  cortex.on('error', (packet) => core.ingest(packet));

  // Load worker organ
  try {
    core.loadPlugin('kontur://organ/worker', {
      cmd: pythonPath,
      args: [workerScript],
    });
    console.log('[KONTUR] Worker organ loaded');
  } catch (e) {
    console.error('[KONTUR] Failed to load worker organ:', e);
  }

  // Load AG simulator if enabled
  if (enableAG) {
    try {
      core.loadPlugin('kontur://organ/ag/sim', {
        cmd: pythonPath,
        args: [agScript],
      });
      console.log('[KONTUR] AG simulator organ loaded');
    } catch (e) {
      console.error('[KONTUR] Failed to load AG simulator:', e);
    }
  }

  return { core, cortex };
}

/**
 * Synchronize KONTUR state with UI
 */
export function syncKONTURWithUI(
  core: Core,
  cortex: CortexBrain,
  onStateChange?: (state: any) => void
) {
  const handleStateUpdate = (state: any) => {
    if (onStateChange) {
      onStateChange(state);
    }
  };

  core.on('state', handleStateUpdate);
  cortex.on('decision', handleStateUpdate);
  cortex.on('error', handleStateUpdate);

  return () => {
    core.off('state', handleStateUpdate);
    cortex.off('decision', handleStateUpdate);
    cortex.off('error', handleStateUpdate);
  };
}

/**
 * Send packet to KONTUR core
 */
export function sendToKONTUR(
  core: Core,
  intent: PacketIntent,
  payload: Record<string, any> = {}
) {
  try {
    const packet = createPacket(intent, payload);
    core.ingest(packet);
    return { success: true, packet };
  } catch (e) {
    console.error('[KONTUR] Failed to send packet:', e);
    return { success: false, error: e };
  }
}

/**
 * Get KONTUR registry snapshot
 */
export function getKONTURRegistry(core: Core) {
  try {
    return core.getRegistry();
  } catch (e) {
    console.error('[KONTUR] Failed to get registry:', e);
    return null;
  }
}

/**
 * Shutdown KONTUR system gracefully
 */
export async function shutdownKONTUR(core: Core, cortex: CortexBrain) {
  try {
    // Send shutdown signal
    const shutdownPacket = createPacket('system/shutdown', {
      timestamp: Date.now(),
    });
    core.ingest(shutdownPacket);

    // Wait for graceful shutdown
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log('[KONTUR] System shutdown complete');
    return { success: true };
  } catch (e) {
    console.error('[KONTUR] Shutdown error:', e);
    return { success: false, error: e };
  }
}
