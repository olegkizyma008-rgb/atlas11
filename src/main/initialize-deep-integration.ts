/**
 * Deep Integration Initializer
 * Bootstraps unified KONTUR + Atlas system
 * Spawns all organs, syncs systems, returns integrated instance
 */

import path from 'path';
import { EventEmitter } from 'events';
import { Core } from '../kontur/core/dispatcher';
import { Synapse } from '../kontur/core/synapse';
import { UnifiedBrain, createUnifiedBrain } from '../kontur/cortex/unified-brain';
import {
  SynapseBridge,
  createSynapseBridge,
} from '../kontur/adapters/synapse-bridge';
import {
  AtlasOrganMapper,
  createAtlasOrganMapper,
} from '../kontur/adapters/atlas-organ-mapper';
import { synapse } from '../kontur/synapse';

// Import Atlas Capsules
import { AtlasCapsule } from '../modules/atlas/index';
import { TetyanaCapsule } from '../modules/tetyana/index';
import { GrishaCapsule } from '../modules/grisha/index';
import { MemoryGhost } from '../modules/memory/ghost';
import { ForgeGhost } from '../modules/forge/ghost';
import { VoiceGhost } from '../modules/voice/ghost';
import { BrainGhost } from '../modules/brain/ghost';

/**
 * Deep Integration System
 * Coordinates all Atlas and KONTUR components
 */
export class DeepIntegrationSystem extends EventEmitter {
  public core: Core;
  public unifiedBrain: UnifiedBrain;
  public synapseBridge: SynapseBridge;
  public organMapper: AtlasOrganMapper;

  public atlas: AtlasCapsule | null = null;
  public tetyana: TetyanaCapsule | null = null;
  public grisha: GrishaCapsule | null = null;

  public memory: MemoryGhost | null = null;
  public forge: ForgeGhost | null = null;
  public voice: VoiceGhost | null = null;
  public brain: BrainGhost | null = null;

  private organs: Map<string, Synapse> = new Map();

  constructor() {
    super();
    console.log('[DEEP-INTEGRATION] 🚀 Initializing unified system...');

    // 1. Initialize Core
    this.core = new Core();

    // 2. Initialize Unified Brain
    this.unifiedBrain = createUnifiedBrain();
    this.core.cortex = this.unifiedBrain;

    // 3. Initialize Bridges
    this.synapseBridge = createSynapseBridge(synapse, this.core);
    this.organMapper = createAtlasOrganMapper(this.core);

    console.log('[DEEP-INTEGRATION] ✅ Core systems initialized');
  }

  /**
   * Initialize all Atlas Capsules (in-process)
   */
  private async initAtlasCapsules(): Promise<void> {
    console.log('[DEEP-INTEGRATION] Initializing Atlas Capsules...');

    // Initialize Dependencies (Ghosts)
    this.memory = new MemoryGhost();
    this.forge = new ForgeGhost();
    this.voice = new VoiceGhost();
    this.brain = new BrainGhost();

    // Initialize Capsules
    this.atlas = new AtlasCapsule(this.memory, this.brain);
    this.tetyana = new TetyanaCapsule(this.forge, this.voice, this.brain);
    this.grisha = new GrishaCapsule(this.brain);

    // Register with Unified Brain
    this.unifiedBrain.setAtlasBrain(this.brain);
    this.unifiedBrain.setAtlasOrgan(this.atlas);

    console.log('[DEEP-INTEGRATION] ✅ Atlas Capsules initialized');
  }

  /**
   * Spawn all KONTUR organs
   */
  private async spawnOrgans(): Promise<void> {
    console.log('[DEEP-INTEGRATION] Spawning KONTUR organs...');

    if (!this.memory || !this.forge || !this.voice || !this.brain) {
      throw new Error('Atlas Capsules not initialized');
    }

    // Create Atlas Organ
    const atlasOrgan = this.organMapper.createAtlasOrgan(
      this.memory,
      this.brain
    );
    this.core.register(atlasOrgan.urn, atlasOrgan);
    this.organs.set(atlasOrgan.urn, atlasOrgan);

    // Create Tetyana Organ
    const tetyanaOrgan = this.organMapper.createTetyanaOrgan(
      this.forge,
      this.voice,
      this.brain
    );
    this.core.register(tetyanaOrgan.urn, tetyanaOrgan);
    this.organs.set(tetyanaOrgan.urn, tetyanaOrgan);

    // Create Grisha Organ
    const grishaOrgan = this.organMapper.createGrishaOrgan(this.brain);
    this.core.register(grishaOrgan.urn, grishaOrgan);
    this.organs.set(grishaOrgan.urn, grishaOrgan);

    // Create Memory Organ
    const memoryOrgan = this.organMapper.createMemoryOrgan();
    this.core.register(memoryOrgan.urn, memoryOrgan);
    this.organs.set(memoryOrgan.urn, memoryOrgan);

    // Create Voice Organ
    const voiceOrgan = this.organMapper.createVoiceOrgan();
    this.core.register(voiceOrgan.urn, voiceOrgan);
    this.organs.set(voiceOrgan.urn, voiceOrgan);

    console.log('[DEEP-INTEGRATION] ✅ All organs spawned');
  }

  /**
   * Synchronize Synapse with Core
   */
  private async syncSystems(): Promise<void> {
    console.log('[DEEP-INTEGRATION] Synchronizing systems...');

    // Listen to Synapse bridge signals
    this.synapseBridge.getSyncObservable().subscribe({
      next: (packet) => {
        console.log(`[DEEP-INTEGRATION] Signal → Packet: ${packet.instruction.intent}`);
      },
      error: (err) => {
        console.error('[DEEP-INTEGRATION] Bridge error:', err);
      },
    });

    // Listen to Core decisions
    this.core.on('decision', (packet) => {
      console.log(`[DEEP-INTEGRATION] Core → Signal: ${packet.instruction.intent}`);
    });

    // Listen to organ deaths
    this.core.on('organ_dead', (deadUrn: string) => {
      console.warn(`[DEEP-INTEGRATION] Organ dead: ${deadUrn}`);
      this.organs.delete(deadUrn);
      this.emit('organ_failure', { urn: deadUrn });
    });

    console.log('[DEEP-INTEGRATION] ✅ Systems synchronized');
  }

  /**
   * Run continuous integration test
   */
  public async runIntegrationTest(): Promise<{
    success: boolean;
    signals: number;
    organs: number;
    errors: string[];
  }> {
    console.log('[DEEP-INTEGRATION] Running integration test...');

    const errors: string[] = [];
    let signalCount = 0;

    try {
      // 1. Test Atlas Planning
      console.log('[TEST] Testing Atlas Planning...');
      if (!this.atlas) throw new Error('Atlas not initialized');

      const plan = await this.atlas.plan({
        goal: 'Integrate KONTUR and Atlas',
      });
      console.log('[TEST] Atlas plan generated:', plan.id);

      // 2. Test signal flow
      console.log('[TEST] Testing signal flow...');
      const signals: any[] = [];
      const sub = synapse.monitor().subscribe((sig) => {
        signals.push(sig);
        signalCount++;
      });

      // Emit test signal
      synapse.emit('test', 'deep_integration_started', { timestamp: Date.now() });

      await new Promise((r) => setTimeout(r, 500));
      sub.unsubscribe();

      console.log(`[TEST] Captured ${signalCount} signals`);

      // 3. Test organ count
      const organCount = this.organs.size;
      console.log(`[TEST] ${organCount} organs active`);

      // 4. Test unified brain
      console.log('[TEST] Testing Unified Brain...');
      const thought = await this.unifiedBrain.think({
        system_prompt: 'You are a test brain',
        user_prompt: 'What is 2+2?',
      });
      console.log('[TEST] Brain response:', thought.text?.slice(0, 50));

      return {
        success: true,
        signals: signalCount,
        organs: organCount,
        errors,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      console.error('[TEST] Integration test failed:', msg);
      return {
        success: false,
        signals: signalCount,
        organs: this.organs.size,
        errors,
      };
    }
  }

  /**
   * Complete initialization flow
   */
  public async initialize(): Promise<void> {
    console.log('[DEEP-INTEGRATION] Starting complete initialization...');

    try {
      // 1. Initialize Atlas Capsules
      await this.initAtlasCapsules();

      // 2. Spawn KONTUR Organs
      await this.spawnOrgans();

      // 3. Synchronize Systems
      await this.syncSystems();

      console.log('[DEEP-INTEGRATION] ✅ Deep integration complete!');
      console.log('[DEEP-INTEGRATION] System ready for continuous existence');

      this.emit('ready');
    } catch (error) {
      console.error('[DEEP-INTEGRATION] Initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get system status report
   */
  public getStatus(): {
    core: string;
    brain: string;
    organs: string[];
    capsules: string[];
    timestamp: number;
  } {
    return {
      core: this.core ? 'READY' : 'DOWN',
      brain: this.unifiedBrain ? 'READY' : 'DOWN',
      organs: Array.from(this.organs.keys()),
      capsules: [
        this.atlas ? 'atlas' : null,
        this.tetyana ? 'tetyana' : null,
        this.grisha ? 'grisha' : null,
      ].filter((x): x is string => x !== null),
      timestamp: Date.now(),
    };
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    console.log('[DEEP-INTEGRATION] Shutting down...');

    // Stop core health checks
    this.core.stop();

    // Terminate all organs
    for (const [urn, organ] of this.organs) {
      console.log(`[DEEP-INTEGRATION] Terminating ${urn}`);
      organ.kill();
    }

    console.log('[DEEP-INTEGRATION] ✅ Shutdown complete');
    this.emit('shutdown');
  }
}

/**
 * Factory function to create and initialize deep integration
 */
export async function initializeDeepIntegration(): Promise<DeepIntegrationSystem> {
  const system = new DeepIntegrationSystem();
  await system.initialize();
  return system;
}

export default DeepIntegrationSystem;
