/**
 * Synapse - Organ Connector
 * Handles process spawning, resurrection, and packet routing for isolated Python/Node organs
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import {
  KPP_Schema,
  KPP_Packet,
  OrganState,
  verifyPacket,
  computeIntegrity,
} from '../protocol/nexus';

export class Synapse extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer: string = '';
  private opStack: any[] = [];

  public urn: string;
  public cmd: string;
  public args: string[];

  public state: OrganState = OrganState.IDLE;
  public loadFactor: number = 0;
  public lastHeartbeat: number = Date.now();
  public energyUsage: number = 0;
  public gravityFactor: number = 1;

  private maxBufferSize = 1048576; // 1MB
  private heartbeatTimeout = 10000; // 10s
  private lastHeartbeatSent = 0;
  private resurrectionAttempts = 0;
  private maxResurrectionAttempts = 5;

  constructor(urn: string, cmd: string, args: string[]) {
    super();
    this.urn = urn;
    this.cmd = cmd;
    this.args = args;
    this.resurrect();
  }

  /**
   * Resurrect (spawn) the organ process with exponential backoff
   */
  private resurrect() {
    if (this.resurrectionAttempts >= this.maxResurrectionAttempts) {
      console.error(`[SYNAPSE] 💀 ${this.urn} exceeded max resurrection attempts`);
      this.state = OrganState.DEAD;
      this.emit('dead', this.urn);
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.resurrectionAttempts) * this.gravityFactor, 30000);
    console.log(`[SYNAPSE] 🌱 Levitating Spawn: ${this.urn} (g=${this.gravityFactor}, attempt=${this.resurrectionAttempts + 1})`);

    setTimeout(() => {
      this.process = spawn(this.cmd, this.args);
      this.state = OrganState.IDLE;
      this.energyUsage = 0;
      this.resurrectionAttempts++;

      this.process!.stdout?.on('data', (data) => this.handleData(data));
      this.process!.stderr?.on('data', (data) => {
        console.error(`[ERR ${this.urn}]: ${data.toString()}`);
        this.undoLastOp();
      });

      this.process!.on('exit', (code) => {
        console.warn(`[SYNAPSE] 💀 ${this.urn} crashed (code ${code}). Levitating resurrection...`);
        this.state = OrganState.DEAD;
        this.resurrect();
      });
    }, delay);
  }

  /**
   * Undo the last operation (AEDS/reversible operations)
   */
  private undoLastOp() {
    if (this.opStack.length > 0) {
      const lastOp = this.opStack.pop();
      console.log(`[AG-REVERSIBLE] Undoing: ${lastOp?.instruction?.op_code || 'unknown'}`);
      this.energyUsage = Math.max(0, this.energyUsage - 0.1 * this.gravityFactor);
    }
  }

  /**
   * Handle incoming data from organ stdout
   */
  private handleData(data: Buffer) {
    this.buffer += data.toString();

    if (this.buffer.length > this.maxBufferSize) {
      console.error(`[BUFFER OVERFLOW ${this.urn}]: Clearing buffer`);
      this.buffer = '';
      this.emit('error', new Error('Buffer overflow'));
      return;
    }

    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const json = JSON.parse(line);
        const packet = KPP_Schema.parse(json);

        // Update organ metrics
        if (packet.nexus.gravity_factor) {
          this.gravityFactor = packet.nexus.gravity_factor;
        }

        if (packet.health) {
          this.loadFactor = packet.health.load_factor || 0;
          this.state = packet.health.state || OrganState.IDLE;
          this.energyUsage = packet.health.energy_usage || 0;
        }

        this.lastHeartbeat = Date.now();
        this.resurrectionAttempts = 0; // Reset on successful communication

        if (packet.instruction.intent !== 'HEARTBEAT') {
          this.opStack.push(packet);
          this.emit('packet', packet);
        }
      } catch (e) {
        console.error(`[PARSE ERR ${this.urn}]: ${e instanceof Error ? e.message : String(e)}`);
        this.emit('error', e);
      }
    }
  }

  /**
   * Send packet to organ via stdin
   */
  public send(packet: KPP_Packet) {
    if (this.state === OrganState.DEAD || !this.process?.stdin) {
      console.warn(`[SYNAPSE] Cannot send to ${this.urn}: dead or no stdin`);
      return;
    }

    try {
      // Re-verify before sending
      if (!verifyPacket(packet)) {
        packet.nexus.integrity = computeIntegrity(packet.payload);
      }

      this.process.stdin.write(JSON.stringify(packet) + '\n');
    } catch (e) {
      console.error(`[SYNAPSE SEND ERR ${this.urn}]:`, e);
    }
  }

  /**
   * Send heartbeat (PING) to check if organ is alive
   */
  public sendHeartbeat(packet: KPP_Packet) {
    if (Date.now() - this.lastHeartbeatSent < 1000) return; // Rate limit
    this.lastHeartbeatSent = Date.now();
    this.send(packet);
  }

  /**
   * Check if organ is still alive
   */
  public isAlive(): boolean {
    const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;
    return this.state !== OrganState.DEAD && timeSinceHeartbeat < this.heartbeatTimeout;
  }

  /**
   * Kill the organ process
   */
  public kill() {
    if (this.process) {
      this.process.kill();
      this.state = OrganState.DEAD;
    }
  }

  /**
   * Get organ health metrics
   */
  public getMetrics() {
    return {
      urn: this.urn,
      state: this.state,
      load_factor: this.loadFactor,
      energy_usage: this.energyUsage,
      gravity_factor: this.gravityFactor,
      is_alive: this.isAlive(),
      uptime: Date.now() - this.lastHeartbeat,
    };
  }
}
