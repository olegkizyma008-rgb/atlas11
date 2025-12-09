/**
 * KPP v11.0 - Kontur Protocol Packet
 * Bio-Cybernetic Communication Protocol for KONTUR v11.0
 * Designed for resilient, self-healing, AI-driven systems
 */

import { z } from 'zod';
import * as crypto from 'crypto';
import * as zlib from 'zlib';

export enum SecurityScope {
  PUBLIC = 0,
  USER = 1,
  SYSTEM = 50,
  ROOT = 100,
}

export enum OrganState {
  IDLE = 'IDLE',
  BUSY = 'BUSY',
  OVERLOAD = 'OVERLOAD',
  DEAD = 'DEAD',
}

export enum PacketIntent {
  CMD = 'CMD',
  EVENT = 'EVENT',
  QUERY = 'QUERY',
  RESPONSE = 'RESPONSE',
  HEARTBEAT = 'HEARTBEAT',
  AI_PLAN = 'AI_PLAN',
  ERROR = 'ERROR',
  HEAL = 'HEAL',
  EVOLVE = 'EVOLVE',
  GEN_CODE = 'GEN_CODE',
  LEVITATE = 'LEVITATE',
}

/**
 * KPP Schema - Zod validation for type-safe packet handling
 */
export const KPP_Schema = z.object({
  nexus: z.object({
    ver: z.literal('11.0'),
    uid: z.string(),
    timestamp: z.number(),
    ttl: z.number().default(5000),
    integrity: z.string(),
    priority: z.number().min(0).max(10).default(5),
    compressed: z.boolean().default(false),
    quantum_state: z.record(z.number()).optional(),
    gen_prompt: z.string().optional(),
    gravity_factor: z.number().min(0).max(1).default(1),
    correlation_id: z.string().optional(),
  }),
  route: z.object({
    from: z.string(),
    to: z.string(),
    reply_to: z.string().optional(),
  }),
  auth: z.object({ scope: z.nativeEnum(SecurityScope) }),
  instruction: z.object({
    intent: z.nativeEnum(PacketIntent),
    op_code: z.string(),
  }),
  payload: z.record(z.any()),
  health: z
    .object({
      load_factor: z.number().optional(),
      state: z.nativeEnum(OrganState).optional(),
      energy_usage: z.number().optional(),
    })
    .optional(),
});

export type KPP_Packet = z.infer<typeof KPP_Schema>;

/**
 * Verify packet integrity using SHA256
 * @param packet KPP_Packet to verify
 * @returns true if integrity check passes
 */
export function verifyPacket(packet: KPP_Packet): boolean {
  let expectedHash = packet.nexus.integrity;
  if (expectedHash.startsWith('sha256-')) {
    expectedHash = expectedHash.slice(7);
  }

  const payloadStr = sortedStringify(packet.payload);
  const computedHash = crypto.createHash('sha256').update(payloadStr).digest('hex');

  return expectedHash === computedHash;
}

/**
 * Compute SHA256 integrity hash for packet payload
 * @param payload packet payload object
 * @returns hex string hash
 */
export function computeIntegrity(payload: any): string {
  const payloadStr = sortedStringify(payload);
  return crypto.createHash('sha256').update(payloadStr).digest('hex');
}

/**
 * Deterministic JSON stringify (sorts keys recursively)
 * Matches Python's json.dumps(sort_keys=True)
 */
function sortedStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(sortedStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const parts = keys.map(key => {
    return JSON.stringify(key) + ':' + sortedStringify(obj[key]);
  });
  return '{' + parts.join(',') + '}';
}

/**
 * Compress payload using zlib deflate
 * @param payload object to compress
 * @returns Buffer with compressed data
 */
export function compressPayload(payload: any): Buffer {
  return zlib.deflateSync(JSON.stringify(payload));
}

/**
 * Decompress payload from zlib deflate
 * @param compressed Buffer with compressed data
 * @returns decompressed object
 */
export function decompressPayload(compressed: Buffer): any {
  return JSON.parse(zlib.inflateSync(compressed).toString());
}

/**
 * Factory function to create a valid KPP packet with proper defaults
 */
export function createPacket(
  from: string,
  to: string,
  intent: PacketIntent,
  payload: any,
  options?: Partial<KPP_Packet['nexus']>
): KPP_Packet {
  const integrity = computeIntegrity(payload);

  const packet: KPP_Packet = {
    nexus: {
      ver: '11.0',
      uid: crypto.randomUUID(),
      timestamp: Date.now(),
      ttl: 5000,
      integrity,
      priority: 5,
      compressed: false,
      gravity_factor: 1,
      ...options,
    },
    route: {
      from,
      to,
    },
    auth: {
      scope: SecurityScope.USER,
    },
    instruction: {
      intent,
      op_code: intent,
    },
    payload,
  };

  return packet;
}
