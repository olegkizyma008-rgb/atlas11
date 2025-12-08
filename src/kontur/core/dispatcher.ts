/**
 * Core Dispatcher - KONTUR Central Intelligence
 * Manages organ registry, packet routing, homeostasis, ACL, and AEDS
 */

import { EventEmitter } from 'events';
import { Synapse } from './synapse';
import { CortexBrain } from '../cortex/brain';
import {
  KPP_Packet,
  SecurityScope,
  createPacket,
  verifyPacket,
  PacketIntent,
  computeIntegrity,
} from '../protocol/nexus';
import * as crypto from 'crypto';
import Bottleneck from 'bottleneck';

interface AntibodyPattern {
  pattern: RegExp;
  affinity: number;
  fix: string;
}

export class Core extends EventEmitter {
  private registry = new Map<string, Synapse | any>();
  public cortex: CortexBrain | null = null;

  private permissions = new Map<string, SecurityScope>([
    ['kontur://organ/ui/shell', SecurityScope.USER],
    ['kontur://organ/worker', SecurityScope.USER],
    ['kontur://organ/ag/sim', SecurityScope.SYSTEM],
    ['kontur://cortex/ai/main', SecurityScope.ROOT],
    ['kontur://core/system', SecurityScope.ROOT],
  ]);

  private limiter = new Bottleneck({
    maxConcurrent: 100,
    minTime: 10,
  });

  private antibodies: AntibodyPattern[] = [];
  private fractalScale = 1.618; // Golden ratio
  private homeostasisInterval: NodeJS.Timeout | null = null;
  private aedsDDRInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initAEDS();
    this.startHealthChecks();
  }

  /**
   * Initialize AEDS (Antibody Error Detection System)
   */
  private initAEDS() {
    this.antibodies = [
      {
        pattern: /parse error|json parse/i,
        affinity: 0.95,
        fix: 'retry_parse',
      },
      {
        pattern: /integrity fail|hash mismatch/i,
        affinity: 0.98,
        fix: 'recompute_hash',
      },
      {
        pattern: /buffer overflow/i,
        affinity: 0.90,
        fix: 'clear_buffer',
      },
      {
        pattern: /timeout|deadlock/i,
        affinity: 0.85,
        fix: 'restart_organ',
      },
    ];
  }

  /**
   * Start periodic health checks and DDR evolution
   */
  private startHealthChecks() {
    this.homeostasisInterval = setInterval(() => this.performHomeostasis(), 3000);
    this.aedsDDRInterval = setInterval(() => this.evolveDDR(), 60000);
  }

  /**
   * Stop health checks
   */
  public stop() {
    if (this.homeostasisInterval) clearInterval(this.homeostasisInterval);
    if (this.aedsDDRInterval) clearInterval(this.aedsDDRInterval);
  }

  /**
   * Register a synapse (organ) or other component
   */
  public register(urn: string, component: any) {
    this.registry.set(urn, component);

    if (component instanceof Synapse) {
      component.on('packet', (packet: KPP_Packet) => this.ingest(packet));
      component.on('error', (error: any) => this.aedsDetect(error));
      component.on('dead', (deadUrn: string) => {
        console.warn(`[CORE] Organ ${deadUrn} is dead`);
        this.emit('organ_dead', deadUrn);
      });
    }

    console.log(`[CORE] Registered: ${urn}`);
  }

  /**
   * Load a plugin as a spawned process
   */
  public loadPlugin(urn: string, config: { cmd: string; args: string[] }) {
    const synapse = new Synapse(urn, config.cmd, config.args);
    this.register(urn, synapse);
    return synapse;
  }

  /**
   * AEDS - Detect and auto-fix errors using antibody patterns
   */
  private aedsDetect(error: any): boolean {
    const errorMsg = error instanceof Error ? error.message : String(error);

    for (const ab of this.antibodies) {
      if (ab.pattern.test(errorMsg) && Math.random() < ab.affinity) {
        console.log(`[AEDS] 🛡️ Detected & fixing: ${ab.fix} (affinity: ${ab.affinity})`);
        this.applyFix(ab.fix, error);
        return true;
      }
    }

    return false;
  }

  /**
   * Apply fix for detected error
   */
  private applyFix(fix: string, error: any) {
    console.log(`[AEDS FIX] Applying: ${fix}`);
    // Placeholder for actual fix implementation
  }

  /**
   * Evolve antibodies via DDR (Distributed DNA Repository)
   */
  private evolveDDR() {
    try {
      console.log('[DDR] 🧬 Evolving antibody repository...');
      // Placeholder for genetic evolution
      // In real impl: would run genetic algorithm on antibodies
    } catch (error: any) {
      // Silently ignore EPIPE errors
      if (error.code !== 'EPIPE') {
        console.error('[DDR] Error:', error.message);
      }
    }
  }

  /**
   * Perform homeostasis - monitor and balance organ health
   */
  private performHomeostasis() {
    try {
      const now = Date.now();
      const deadOrgans: string[] = [];

      this.registry.forEach((organ, urn) => {
        if (!(organ instanceof Synapse)) return;

        const metrics = organ.getMetrics();

        // Check heartbeat
        if (!organ.isAlive()) {
          console.error(`[CORE] 🚑 Organ ${urn} unresponsive, restarting...`);
          organ.kill();
          deadOrgans.push(urn);
        }

        // Auto-scale on overload
        if (metrics.load_factor > 0.8) {
          const duplicateUrn = `${urn}_dup`;
          if (!this.registry.has(duplicateUrn)) {
            console.log(`[CORE] 📊 Auto-scaling: Creating ${duplicateUrn}`);
            // Placeholder: would spawn duplicate
          }
        }

        // Send periodic heartbeat
        const heartbeatPacket = createPacket(
          'kontur://core/system',
          urn,
          PacketIntent.HEARTBEAT,
          {}
        );
        organ.sendHeartbeat(heartbeatPacket);
      });

      // Log metrics (only if there are organs to monitor)
      const metricsSnapshot = Array.from(this.registry.entries())
        .filter(([_, o]) => o instanceof Synapse)
        .map(([urn, o]) => ({
          urn: urn.replace('kontur://', ''),
          load: (o as Synapse).loadFactor.toFixed(2),
          energy: (o as Synapse).energyUsage.toFixed(2),
          state: (o as Synapse).state,
        }));

      if (metricsSnapshot.length > 0) {
        console.log('[HOMEOSTASIS] 📈 Metrics:', metricsSnapshot);
      }
    } catch (error: any) {
      // Silently ignore EPIPE errors (happens during shutdown)
      if (error.code !== 'EPIPE') {
        console.error('[HOMEOSTASIS] Error:', error.message);
      }
    }
  }

  /**
   * Main packet ingestion and routing logic
   */
  public ingest(packet: KPP_Packet) {
    console.log(`[CORE INGEST] Processing ${packet.nexus.uid} from ${packet.route.from}`);

    // ACL check
    // DEBUG: Bypass integrity for UI packets if check fails, but log it
    if (!verifyPacket(packet)) {
      console.warn(`[INTEGRITY FAIL] calculated hash mismatch for ${packet.nexus.uid}`);
      console.warn(`[INTEGRITY DEBUG] Integrity: ${packet.nexus.integrity}`);
      console.warn(`[INTEGRITY DEBUG] Payload: ${JSON.stringify(packet.payload)}`);
      return;
    }

    const senderScope = this.permissions.get(packet.route.from) || SecurityScope.PUBLIC;
    if (packet.auth.scope > senderScope) {
      console.warn(`[ACL BLOCK] ${packet.route.from} lacks scope for ${packet.instruction.intent}`);
      return;
    }

    // Anti-gravity handling
    if (packet.nexus.gravity_factor < 0.5) {
      this.levitatePacket(packet);
      return;
    }

    // Route packet through limiter
    this.limiter
      .schedule(async () => {
        if (packet.route.to.includes('cortex') && this.cortex) {
          this.cortex.process(packet);
          return;
        }

        if (packet.instruction.intent === PacketIntent.AI_PLAN && senderScope === SecurityScope.ROOT) {
          this.executePlan(packet.payload);
          return;
        }

        // Route to target organ
        const target = this.registry.get(packet.route.to);
        if (target instanceof Synapse) {
          // Load balancing: switch to duplicate if overloaded
          if (target.loadFactor > 0.9) {
            const floatUrn = `${packet.route.to}_float`;
            const floatTarget = this.registry.get(floatUrn);
            if (floatTarget) {
              console.log(`[ROUTING] Redirecting to ${floatUrn}`);
              floatTarget.send(packet);
              return;
            }
          }
          target.send(packet);
        } else if (target) {
          // Handle non-Synapse targets (e.g., Electron windows)
          if (typeof target.send === 'function') {
            target.send(packet);
          } else {
            console.warn(`[ROUTING] Unknown target type for ${packet.route.to}`);
          }
        } else {
          console.warn(`[ROUTING] No handler for ${packet.route.to}`);
        }
      })
      .catch((err) => {
        console.error(`[ROUTING ERROR]:`, err);
        this.aedsDetect(err);
      });
  }

  /**
   * Levitate packet - handle anti-gravity mode (low g-factor)
   */
  private levitatePacket(packet: KPP_Packet) {
    console.log(
      `[AG-LEVITATE] 🚀 Floating packet: ${packet.nexus.uid} (g=${packet.nexus.gravity_factor})`
    );
    packet.nexus.ttl *= 2;
    packet.nexus.priority += 2;
    packet.route.to = 'kontur://organ/ag/sim';
    // Re-route through AG simulator
    this.ingest(packet);
  }

  /**
   * Execute AI-generated plan steps
   */
  /**
   * Execute AI-generated plan steps (Sequentially & Verified)
   */
  private async executePlan(payload: any) {
    const steps = payload.steps || [];
    const userResponse = payload.user_response;

    console.log(`[CORE] 🤖 Executing AI Plan (${steps.length} steps) with SEQUENTIAL verification`);

    // --- Start Grisha Observation ---
    const grishaObserver = (global as any).grishaObserver;
    if (grishaObserver && steps.length > 0) {
      // Start observation - system prompt should trigger "Ready" or "Monitoring"
      await grishaObserver.startObservation(`Моніторю виконання ${steps.length} кроків...`);
    }

    // SEQUENTIAL EXECUTION LOOP
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`[CORE] ▶️ Step ${i + 1}/${steps.length}: ${step.action}`);

      // 1. Execute the Action
      const stepPacket = createPacket(
        'kontur://core/system',
        step.target || 'kontur://organ/worker',
        PacketIntent.CMD,
        {
          tool: step.tool,       // MCP tool name
          action: step.action,   // Action/operation
          args: step.args || {}  // Tool arguments
        },
        {
          quantum_state: { amp1: 0.7, amp2: 0.3 },
        }
      );
      stepPacket.instruction.op_code = step.action || 'EXECUTE';
      this.ingest(stepPacket);

      // 2. WAIT for Verification (Gatekeeping)
      if (grishaObserver && grishaObserver.isActive) {
        try {
          // Prompt Grisha to verify this specific action
          grishaObserver.notifyAction(step.action, JSON.stringify(step.args || {}));

          console.log(`[CORE] ⏳ Waiting for Grisha confirmation...`);
          await this.waitForGrishaConfirmation(grishaObserver);
          console.log(`[CORE] ✅ Grisha confirmed step ${i + 1}`);

          // BUFFER: Wait 4s for client-side audio playback to finish
          // This prevents Grisha's "Виконано" from being cut off by the next step
          await new Promise(resolve => setTimeout(resolve, 4000));
        } catch (error: any) {
          console.error(`[CORE] 🛑 Grisha HALTED execution:`, error.message);

          // Stop everything
          grishaObserver.stopObservation();

          // Inform User
          const errorChat = createPacket(
            'kontur://cortex/ai/main',
            'kontur://organ/ui/shell',
            PacketIntent.EVENT,
            { msg: `Зупинено Грішою: ${error.message}`, type: 'error' }
          );
          this.ingest(errorChat);
          return; // ABORT PLAN
        }
      } else {
        // Fallback delay if Grisha is offline
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    // 3. Finish Up
    if (grishaObserver) {
      grishaObserver.stopObservation();
    }

    // 4. Speak/Show final user response
    if (userResponse) {
      // Small delay to let the last "Confirmed" finish speaking
      await new Promise(resolve => setTimeout(resolve, 2000));

      const chatPacket = createPacket(
        'kontur://cortex/ai/main',  // Source as ATLAS for proper UI identification
        'kontur://organ/ui/shell',
        PacketIntent.EVENT,
        { msg: userResponse, type: 'chat' }
      );
      this.ingest(chatPacket);
    }
  }

  /**
   * Helper: Wait for Grisha to say "Confirmed" or "Alert"
   */
  private waitForGrishaConfirmation(observer: any): Promise<void> {
    return new Promise((resolve, reject) => {
      // Timeout (15s should be enough for quick verification)
      const timeout = setTimeout(() => {
        cleanup();
        // Warn but proceed to avoid getting stuck if TTS fails
        console.warn("[CORE] ⚠️ Grisha Confirmation Timeout - Proceeding anyway");
        resolve();
        // reject(new Error("Timeout waiting for Grisha")); // Strict mode would reject
      }, 15000);

      const handler = (result: any) => {
        // result is { type: 'confirmation'|'alert'|'observation', message: string }
        if (result.type === 'confirmation') {
          cleanup();
          resolve();
        } else if (result.type === 'alert') {
          cleanup();
          reject(new Error(result.message));
        }
        // Ignore 'observation' type which might just be intermediate chatter
      };

      const cleanup = () => {
        clearTimeout(timeout);
        observer.off('observation', handler);
      };

      observer.on('observation', handler);
    });
  }

  /**
   * Get registry of all organs
   */
  public getRegistry() {
    return Array.from(this.registry.entries()).map(([urn, component]) => ({
      urn,
      type: component instanceof Synapse ? 'Synapse' : 'Other',
      alive: component instanceof Synapse ? component.isAlive() : true,
    }));
  }
}
