/**
 * Atlas Organ Mapper - Capsules → KONTUR Organs
 * Transforms Atlas Capsules into KONTUR organ processes
 * Manages dependencies and lifecycle
 */

import path from 'path';
import { Synapse } from '../core/synapse';
import { Core } from '../core/dispatcher';
import {
  KPP_Packet,
  createPacket,
  PacketIntent,
} from '../protocol/nexus';

import { AtlasAPI } from '../../modules/atlas/contract';
import { TetyanaAPI } from '../../modules/tetyana/contract';
import { GrishaAPI } from '../../modules/grisha/contract';
import { MemoryAPI } from '../../modules/memory/contract';
import { VoiceAPI } from '../../kontur/voice/contract';
import { ForgeAPI } from '../../modules/forge/contract';
import { BrainAPI } from '../../modules/brain/contract';

export class AtlasOrganMapper {
  private pythonCmd: string;

  constructor(private core: Core) {
    this.pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  }

  /**
   * Create Atlas Planning Organ
   * URN: kontur://organ/atlas
   * Spawns Python worker with Atlas planning logic
   */
  createAtlasOrgan(
    memory: MemoryAPI,
    brain: BrainAPI
  ): Synapse {
    const urn = 'kontur://organ/atlas';
    const workerPath = path.resolve(
      __dirname,
      '../organs/atlas-worker.py'
    );

    const synapse = new Synapse(urn, this.pythonCmd, [workerPath]);

    // Set up packet handling for planning requests
    synapse.on('packet', (packet: KPP_Packet) => {
      if (packet.instruction.op_code === 'ATLAS_PLAN') {
        this.handleAtlasPlanRequest(synapse, packet, brain);
      }
    });

    console.log(`[MAPPER] 🧠 Created Atlas Planning Organ: ${urn}`);
    return synapse;
  }

  /**
   * Create Tetyana Execution Organ
   * URN: kontur://organ/tetyana
   * Handles tool synthesis and execution
   */
  createTetyanaOrgan(
    forge: ForgeAPI,
    voice: VoiceAPI,
    brain: BrainAPI
  ): Synapse {
    const urn = 'kontur://organ/tetyana';
    const workerPath = path.resolve(
      __dirname,
      '../organs/tetyana-worker.py'
    );
    const synapse = new Synapse(urn, this.pythonCmd, [workerPath]);

    // Note: Deep Integration now registers TetyanaCapsule directly as the primary handler.
    // This Synapse organ serves as a fallback or for python-side processing if needed.

    synapse.on('packet', (packet: KPP_Packet) => {
      // Log or forward if needed
      // console.log(`[MAPPER/TETYANA] Packet to Python Worker: ${packet.instruction.intent}`);
    });

    // FIX: We need to change `initialize-deep-integration.ts` to register `this.tetyana` (Capsule) 
    // INSTEAD of the organ from mapper.

    // For this file (Mapper), we leave it as legacy or for python-side tasks.
    // But we should clean it up to avoid confusion.

    synapse.on('packet', (packet: KPP_Packet) => {
      // Forward to python if needed, or just log
      console.log(`[MAPPER/TETYANA] Packet received: ${packet.instruction.intent}`);
    });

    console.log(`[MAPPER] ⚡ Created Tetyana Execution Organ: ${urn}`);
    return synapse;
  }

  /**
   * Create Grisha Security Organ
   * URN: kontur://organ/grisha
   * Monitors and audits system actions
   */
  createGrishaOrgan(brain: BrainAPI): Synapse {
    const urn = 'kontur://organ/grisha';
    const workerPath = path.resolve(
      __dirname,
      '../organs/grisha-worker.py'
    );

    const synapse = new Synapse(urn, this.pythonCmd, [workerPath]);

    synapse.on('packet', (packet: KPP_Packet) => {
      if (packet.instruction.op_code === 'GRISHA_AUDIT') {
        this.handleGrishaAuditRequest(synapse, packet, brain);
      }
    });

    console.log(`[MAPPER] 🛡️ Created Grisha Security Organ: ${urn}`);
    return synapse;
  }

  /**
   * Create Memory Organ
   * URN: kontur://organ/memory
   * Isolated database process for persistence
   */
  createMemoryOrgan(): Synapse {
    const urn = 'kontur://organ/memory';
    const workerPath = path.resolve(
      __dirname,
      '../organs/memory-worker.py'
    );

    const synapse = new Synapse(urn, this.pythonCmd, [workerPath]);

    synapse.on('packet', (packet: KPP_Packet) => {
      if (packet.instruction.op_code === 'MEMORY_STORE') {
        this.handleMemoryRequest(synapse, packet);
      }
    });

    console.log(`[MAPPER] 💾 Created Memory Organ: ${urn}`);
    return synapse;
  }

  /**
   * Create Voice Organ
   * URN: kontur://organ/voice
   * Handles speech synthesis and recognition
   */
  createVoiceOrgan(): Synapse {
    const urn = 'kontur://organ/voice';
    const workerPath = path.resolve(
      __dirname,
      '../organs/voice-worker.py'
    );

    const synapse = new Synapse(urn, this.pythonCmd, [workerPath]);

    synapse.on('packet', (packet: KPP_Packet) => {
      if (packet.instruction.op_code === 'VOICE_SPEAK') {
        this.handleVoiceRequest(synapse, packet);
      }
    });

    console.log(`[MAPPER] 🎤 Created Voice Organ: ${urn}`);
    return synapse;
  }

  /**
   * Handle Atlas planning request
   */
  private async handleAtlasPlanRequest(
    synapse: Synapse,
    packet: KPP_Packet,
    brain: BrainAPI
  ): Promise<void> {
    const { goal, context } = packet.payload;

    const response = await brain.think({
      system_prompt:
        'You are ATLAS, the Architect. Create a structured plan.',
      user_prompt: `Goal: ${goal}. Context: ${JSON.stringify(context || {})}`,
    });

    const responsePacket = createPacket(
      packet.route.to,
      packet.route.from,
      PacketIntent.RESPONSE,
      {
        plan: response.text,
        status: 'success',
      }
    );

    synapse.send(responsePacket);
  }

  /**
   * Handle Tetyana execution request
   */
  private async handleTetyanaExecutionRequest(
    synapse: Synapse,
    packet: KPP_Packet,
    forge: ForgeAPI,
    voice: VoiceAPI
  ): Promise<void> {
    const { tool_name, args } = packet.payload;

    const result = await forge.execute({
      tool_name,
      args,
    });

    await voice.speak({
      text: `Executed ${tool_name}`,
    });

    const responsePacket = createPacket(
      packet.route.to,
      packet.route.from,
      PacketIntent.RESPONSE,
      {
        result,
        status: 'success',
      }
    );

    synapse.send(responsePacket);
  }

  /**
   * Handle Grisha audit request
   */
  private async handleGrishaAuditRequest(
    synapse: Synapse,
    packet: KPP_Packet,
    brain: BrainAPI
  ): Promise<void> {
    const { action, params } = packet.payload;

    const response = await brain.think({
      system_prompt: 'You are GRISHA, security auditor. Assess risk.',
      user_prompt: `Action: ${action}. Params: ${JSON.stringify(params)}`,
    });

    const allowed = !response.text?.toLowerCase().includes('danger');

    const responsePacket = createPacket(
      packet.route.to,
      packet.route.from,
      PacketIntent.RESPONSE,
      {
        allowed,
        reason: response.text,
      }
    );

    synapse.send(responsePacket);
  }

  /**
   * Handle memory request
   */
  private async handleMemoryRequest(
    synapse: Synapse,
    packet: KPP_Packet
  ): Promise<void> {
    const { operation, content, type } = packet.payload;

    const responsePacket = createPacket(
      packet.route.to,
      packet.route.from,
      PacketIntent.RESPONSE,
      {
        operation,
        stored: true,
        id: `mem-${Date.now()}`,
      }
    );

    synapse.send(responsePacket);
  }

  /**
   * Handle voice request
   */
  private async handleVoiceRequest(
    synapse: Synapse,
    packet: KPP_Packet
  ): Promise<void> {
    const { text, voice } = packet.payload;

    const responsePacket = createPacket(
      packet.route.to,
      packet.route.from,
      PacketIntent.RESPONSE,
      {
        spoken: text,
        voice,
        status: 'complete',
      }
    );

    synapse.send(responsePacket);
  }
}

export function createAtlasOrganMapper(core: Core): AtlasOrganMapper {
  return new AtlasOrganMapper(core);
}
