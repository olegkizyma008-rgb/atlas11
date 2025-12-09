"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
require("dotenv/config");
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const main = require("electron-trpc/main");
const rxjs = require("rxjs");
const zod = require("zod");
const server = require("@trpc/server");
const observable = require("@trpc/server/observable");
const events = require("events");
const child_process = require("child_process");
const crypto$1 = require("crypto");
require("zlib");
const Bottleneck = require("bottleneck");
const genai = require("@google/genai");
const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");
const mistralai = require("@mistralai/mistralai");
const fs = require("fs");
const os = require("os");
const generativeAi = require("@google/generative-ai");
const Database = require("better-sqlite3");
const betterSqlite3 = require("drizzle-orm/better-sqlite3");
const sqliteCore = require("drizzle-orm/sqlite-core");
const drizzleOrm = require("drizzle-orm");
const uuid = require("uuid");
const WebSocket = require("ws");
const util = require("util");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const crypto__namespace = /* @__PURE__ */ _interopNamespaceDefault(crypto$1);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const os__namespace = /* @__PURE__ */ _interopNamespaceDefault(os);
const SignalSchema = zod.z.object({
  source: zod.z.string(),
  // e.g., 'atlas', 'system', 'voice'
  type: zod.z.string(),
  // e.g., 'context_updated', 'request_tts', 'voice_command'
  payload: zod.z.any()
  // Flexible payload for now
});
let Synapse$1 = class Synapse {
  bus$ = new rxjs.Subject();
  /**
   * Emit a signal to the bus.
   */
  emit(source, type, payload = {}) {
    const signal = { source, type, payload };
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
  listen(source, type) {
    return this.bus$.pipe(
      rxjs.filter((s) => s.source === source && s.type === type),
      rxjs.map((s) => s.payload)
    );
  }
  /**
   * Listen to EVERYTHING (for monitoring/UI).
   */
  monitor() {
    return this.bus$.asObservable();
  }
};
const synapse = new Synapse$1();
const t = server.initTRPC.create();
const router = t.router;
const publicProcedure = t.procedure;
const appRouter = router({
  health: publicProcedure.query(() => "KONTUR 2.0 Alive"),
  synapse: publicProcedure.subscription(() => {
    return observable.observable((emit) => {
      const sub = synapse.monitor().subscribe({
        next: (signal) => emit.next(signal),
        error: (err) => emit.error(err),
        complete: () => emit.complete()
      });
      return () => sub.unsubscribe();
    });
  })
});
var SecurityScope = /* @__PURE__ */ ((SecurityScope2) => {
  SecurityScope2[SecurityScope2["PUBLIC"] = 0] = "PUBLIC";
  SecurityScope2[SecurityScope2["USER"] = 1] = "USER";
  SecurityScope2[SecurityScope2["SYSTEM"] = 50] = "SYSTEM";
  SecurityScope2[SecurityScope2["ROOT"] = 100] = "ROOT";
  return SecurityScope2;
})(SecurityScope || {});
var OrganState = /* @__PURE__ */ ((OrganState2) => {
  OrganState2["IDLE"] = "IDLE";
  OrganState2["BUSY"] = "BUSY";
  OrganState2["OVERLOAD"] = "OVERLOAD";
  OrganState2["DEAD"] = "DEAD";
  return OrganState2;
})(OrganState || {});
var PacketIntent = /* @__PURE__ */ ((PacketIntent2) => {
  PacketIntent2["CMD"] = "CMD";
  PacketIntent2["EVENT"] = "EVENT";
  PacketIntent2["QUERY"] = "QUERY";
  PacketIntent2["RESPONSE"] = "RESPONSE";
  PacketIntent2["HEARTBEAT"] = "HEARTBEAT";
  PacketIntent2["AI_PLAN"] = "AI_PLAN";
  PacketIntent2["ERROR"] = "ERROR";
  PacketIntent2["HEAL"] = "HEAL";
  PacketIntent2["EVOLVE"] = "EVOLVE";
  PacketIntent2["GEN_CODE"] = "GEN_CODE";
  PacketIntent2["LEVITATE"] = "LEVITATE";
  return PacketIntent2;
})(PacketIntent || {});
const KPP_Schema = zod.z.object({
  nexus: zod.z.object({
    ver: zod.z.literal("11.0"),
    uid: zod.z.string(),
    timestamp: zod.z.number(),
    ttl: zod.z.number().default(5e3),
    integrity: zod.z.string(),
    priority: zod.z.number().min(0).max(10).default(5),
    compressed: zod.z.boolean().default(false),
    quantum_state: zod.z.record(zod.z.number()).optional(),
    gen_prompt: zod.z.string().optional(),
    gravity_factor: zod.z.number().min(0).max(1).default(1),
    correlation_id: zod.z.string().optional()
  }),
  route: zod.z.object({
    from: zod.z.string(),
    to: zod.z.string(),
    reply_to: zod.z.string().optional()
  }),
  auth: zod.z.object({ scope: zod.z.nativeEnum(SecurityScope) }),
  instruction: zod.z.object({
    intent: zod.z.nativeEnum(PacketIntent),
    op_code: zod.z.string()
  }),
  payload: zod.z.record(zod.z.any()),
  health: zod.z.object({
    load_factor: zod.z.number().optional(),
    state: zod.z.nativeEnum(OrganState).optional(),
    energy_usage: zod.z.number().optional()
  }).optional()
});
function verifyPacket(packet) {
  let expectedHash = packet.nexus.integrity;
  if (expectedHash.startsWith("sha256-")) {
    expectedHash = expectedHash.slice(7);
  }
  const payloadStr = sortedStringify(packet.payload);
  const computedHash = crypto__namespace.createHash("sha256").update(payloadStr).digest("hex");
  return expectedHash === computedHash;
}
function computeIntegrity(payload) {
  const payloadStr = sortedStringify(payload);
  return crypto__namespace.createHash("sha256").update(payloadStr).digest("hex");
}
function sortedStringify(obj) {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(sortedStringify).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  const parts = keys.map((key) => {
    return JSON.stringify(key) + ":" + sortedStringify(obj[key]);
  });
  return "{" + parts.join(",") + "}";
}
function createPacket(from, to, intent, payload, options) {
  const integrity = computeIntegrity(payload);
  const packet = {
    nexus: {
      ver: "11.0",
      uid: crypto__namespace.randomUUID(),
      timestamp: Date.now(),
      ttl: 5e3,
      integrity,
      priority: 5,
      compressed: false,
      gravity_factor: 1,
      ...options
    },
    route: {
      from,
      to
    },
    auth: {
      scope: 1
      /* USER */
    },
    instruction: {
      intent,
      op_code: intent
    },
    payload
  };
  return packet;
}
class Synapse2 extends events.EventEmitter {
  process = null;
  buffer = "";
  opStack = [];
  urn;
  cmd;
  args;
  state = OrganState.IDLE;
  loadFactor = 0;
  lastHeartbeat = Date.now();
  energyUsage = 0;
  gravityFactor = 1;
  maxBufferSize = 1048576;
  // 1MB
  heartbeatTimeout = 1e4;
  // 10s
  lastHeartbeatSent = 0;
  resurrectionAttempts = 0;
  maxResurrectionAttempts = 5;
  constructor(urn, cmd, args) {
    super();
    this.urn = urn;
    this.cmd = cmd;
    this.args = args;
    this.resurrect();
  }
  /**
   * Resurrect (spawn) the organ process with exponential backoff
   */
  resurrect() {
    if (this.resurrectionAttempts >= this.maxResurrectionAttempts) {
      console.error(`[SYNAPSE] 💀 ${this.urn} exceeded max resurrection attempts`);
      this.state = OrganState.DEAD;
      this.emit("dead", this.urn);
      return;
    }
    const delay = Math.min(1e3 * Math.pow(2, this.resurrectionAttempts) * this.gravityFactor, 3e4);
    console.log(`[SYNAPSE] 🌱 Levitating Spawn: ${this.urn} (g=${this.gravityFactor}, attempt=${this.resurrectionAttempts + 1})`);
    setTimeout(() => {
      this.process = child_process.spawn(this.cmd, this.args);
      this.state = OrganState.IDLE;
      this.energyUsage = 0;
      this.resurrectionAttempts++;
      this.process.stdout?.on("data", (data) => this.handleData(data));
      this.process.stderr?.on("data", (data) => {
        console.error(`[ERR ${this.urn}]: ${data.toString()}`);
        this.undoLastOp();
      });
      this.process.on("exit", (code) => {
        console.warn(`[SYNAPSE] 💀 ${this.urn} crashed (code ${code}). Levitating resurrection...`);
        this.state = OrganState.DEAD;
        this.resurrect();
      });
    }, delay);
  }
  /**
   * Undo the last operation (AEDS/reversible operations)
   */
  undoLastOp() {
    if (this.opStack.length > 0) {
      const lastOp = this.opStack.pop();
      console.log(`[AG-REVERSIBLE] Undoing: ${lastOp?.instruction?.op_code || "unknown"}`);
      this.energyUsage = Math.max(0, this.energyUsage - 0.1 * this.gravityFactor);
    }
  }
  /**
   * Handle incoming data from organ stdout
   */
  handleData(data) {
    this.buffer += data.toString();
    if (this.buffer.length > this.maxBufferSize) {
      console.error(`[BUFFER OVERFLOW ${this.urn}]: Clearing buffer`);
      this.buffer = "";
      this.emit("error", new Error("Buffer overflow"));
      return;
    }
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim())
        continue;
      try {
        const json = JSON.parse(line);
        const packet = KPP_Schema.parse(json);
        if (packet.nexus.gravity_factor) {
          this.gravityFactor = packet.nexus.gravity_factor;
        }
        if (packet.health) {
          this.loadFactor = packet.health.load_factor || 0;
          this.state = packet.health.state || OrganState.IDLE;
          this.energyUsage = packet.health.energy_usage || 0;
        }
        this.lastHeartbeat = Date.now();
        this.resurrectionAttempts = 0;
        if (packet.instruction.intent !== "HEARTBEAT") {
          this.opStack.push(packet);
          this.emit("packet", packet);
        }
      } catch (e) {
        console.error(`[PARSE ERR ${this.urn}]: ${e instanceof Error ? e.message : String(e)}`);
        this.emit("error", e);
      }
    }
  }
  /**
   * Send packet to organ via stdin
   */
  send(packet) {
    if (this.state === OrganState.DEAD || !this.process?.stdin) {
      console.warn(`[SYNAPSE] Cannot send to ${this.urn}: dead or no stdin`);
      return;
    }
    try {
      if (!verifyPacket(packet)) {
        packet.nexus.integrity = computeIntegrity(packet.payload);
      }
      this.process.stdin.write(JSON.stringify(packet) + "\n");
    } catch (e) {
      console.error(`[SYNAPSE SEND ERR ${this.urn}]:`, e);
    }
  }
  /**
   * Send heartbeat (PING) to check if organ is alive
   */
  sendHeartbeat(packet) {
    if (Date.now() - this.lastHeartbeatSent < 1e3)
      return;
    this.lastHeartbeatSent = Date.now();
    this.send(packet);
  }
  /**
   * Check if organ is still alive
   */
  isAlive() {
    const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;
    return this.state !== OrganState.DEAD && timeSinceHeartbeat < this.heartbeatTimeout;
  }
  /**
   * Kill the organ process
   */
  kill() {
    if (this.process) {
      this.process.kill();
      this.state = OrganState.DEAD;
    }
  }
  /**
   * Get organ health metrics
   */
  getMetrics() {
    return {
      urn: this.urn,
      state: this.state,
      load_factor: this.loadFactor,
      energy_usage: this.energyUsage,
      gravity_factor: this.gravityFactor,
      is_alive: this.isAlive(),
      uptime: Date.now() - this.lastHeartbeat
    };
  }
}
class Core extends events.EventEmitter {
  registry = /* @__PURE__ */ new Map();
  cortex = null;
  permissions = /* @__PURE__ */ new Map([
    ["kontur://organ/ui/shell", SecurityScope.USER],
    ["kontur://organ/worker", SecurityScope.USER],
    ["kontur://organ/ag/sim", SecurityScope.SYSTEM],
    ["kontur://cortex/ai/main", SecurityScope.ROOT],
    ["kontur://core/system", SecurityScope.ROOT],
    // Whitelist for internal Atlas/Grisha components
    ["kontur://atlas/SYSTEM", SecurityScope.ROOT],
    // Uppercase SYSTEM often used in logs
    ["kontur://atlas/system", SecurityScope.ROOT],
    ["kontur://atlas/GRISHA", SecurityScope.ROOT],
    // Grisha needs root to post events
    ["kontur://organ/tetyana", SecurityScope.SYSTEM],
    ["kontur://organ/grisha", SecurityScope.SYSTEM],
    ["kontur://organ/reasoning", SecurityScope.SYSTEM],
    // Reasoning Organ (Gemini 3)
    ["kontur://organ/vision", SecurityScope.SYSTEM],
    // Vision Organ (Grisha's Eyes)
    ["kontur://organ/mcp/filesystem", SecurityScope.SYSTEM],
    ["kontur://organ/mcp/os", SecurityScope.SYSTEM],
    ["kontur://organ/atlas", SecurityScope.ROOT],
    ["kontur://cortex/core", SecurityScope.ROOT],
    ["kontur://atlas/ATLAS", SecurityScope.SYSTEM],
    ["kontur://atlas/voice", SecurityScope.SYSTEM],
    // Integration & System Internal
    ["system/integration", SecurityScope.USER],
    ["kontur://integration", SecurityScope.SYSTEM]
  ]);
  limiter = new Bottleneck({
    maxConcurrent: 100,
    minTime: 10
  });
  antibodies = [];
  fractalScale = 1.618;
  // Golden ratio
  homeostasisInterval = null;
  aedsDDRInterval = null;
  constructor() {
    super();
    this.initAEDS();
    this.startHealthChecks();
    this.register("kontur://core/system", {
      send: (packet) => {
        if (packet.instruction.intent === PacketIntent.AI_PLAN) {
          this.executePlan(packet.payload);
        }
      },
      isAlive: () => true
    });
  }
  /**
   * Initialize AEDS (Antibody Error Detection System)
   */
  initAEDS() {
    this.antibodies = [
      {
        pattern: /parse error|json parse/i,
        affinity: 0.95,
        fix: "retry_parse"
      },
      {
        pattern: /integrity fail|hash mismatch/i,
        affinity: 0.98,
        fix: "recompute_hash"
      },
      {
        pattern: /buffer overflow/i,
        affinity: 0.9,
        fix: "clear_buffer"
      },
      {
        pattern: /timeout|deadlock/i,
        affinity: 0.85,
        fix: "restart_organ"
      }
    ];
  }
  /**
   * Start periodic health checks and DDR evolution
   */
  startHealthChecks() {
    this.homeostasisInterval = setInterval(() => this.performHomeostasis(), 3e3);
    this.aedsDDRInterval = setInterval(() => this.evolveDDR(), 6e4);
  }
  /**
   * Stop health checks
   */
  stop() {
    if (this.homeostasisInterval)
      clearInterval(this.homeostasisInterval);
    if (this.aedsDDRInterval)
      clearInterval(this.aedsDDRInterval);
  }
  /**
   * Register a synapse (organ) or other component
   */
  register(urn, component) {
    this.registry.set(urn, component);
    if (component instanceof Synapse2) {
      component.on("packet", (packet) => this.ingest(packet));
      component.on("error", (error) => this.aedsDetect(error));
      component.on("dead", (deadUrn) => {
        console.warn(`[CORE] Organ ${deadUrn} is dead`);
        this.emit("organ_dead", deadUrn);
      });
    }
    console.log(`[CORE] Registered: ${urn}`);
  }
  /**
   * Load a plugin as a spawned process
   */
  loadPlugin(urn, config2) {
    const synapse2 = new Synapse2(urn, config2.cmd, config2.args);
    this.register(urn, synapse2);
    return synapse2;
  }
  /**
   * AEDS - Detect and auto-fix errors using antibody patterns
   */
  aedsDetect(error) {
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
  applyFix(fix, error) {
    console.log(`[AEDS FIX] Applying: ${fix}`);
    switch (fix) {
      case "restart_organ":
        this.emit("system_heal", { type: "restart", reason: error.message });
        break;
      case "clear_buffer":
        if (global.gc)
          global.gc();
        break;
    }
  }
  /**
   * Evolve antibodies via DDR (Distributed DNA Repository)
   */
  evolveDDR() {
    try {
      console.log("[DDR] 🧬 Evolving antibody repository...");
    } catch (error) {
      if (error.code !== "EPIPE") {
        console.error("[DDR] Error:", error.message);
      }
    }
  }
  /**
   * Perform homeostasis - monitor and balance organ health
   */
  performHomeostasis() {
    try {
      const now = Date.now();
      const deadOrgans = [];
      this.registry.forEach((organ, urn) => {
        if (!(organ instanceof Synapse2))
          return;
        const metrics = organ.getMetrics();
        if (!organ.isAlive()) {
          console.error(`[CORE] 🚑 Organ ${urn} unresponsive, restarting...`);
          organ.kill();
          deadOrgans.push(urn);
        }
        if (metrics.load_factor > 0.8) {
          const duplicateUrn = `${urn}_dup`;
          if (!this.registry.has(duplicateUrn)) {
            console.log(`[CORE] 📊 Auto-scaling: Creating ${duplicateUrn}`);
          }
        }
        const heartbeatPacket = createPacket(
          "kontur://core/system",
          urn,
          PacketIntent.HEARTBEAT,
          {}
        );
        organ.sendHeartbeat(heartbeatPacket);
      });
      const metricsSnapshot = Array.from(this.registry.entries()).filter(([_, o]) => o instanceof Synapse2).map(([urn, o]) => ({
        urn: urn.replace("kontur://", ""),
        load: o.loadFactor.toFixed(2),
        energy: o.energyUsage.toFixed(2),
        state: o.state
      }));
      if (metricsSnapshot.length > 0) {
        console.log("[HOMEOSTASIS] 📈 Metrics:", metricsSnapshot);
      }
    } catch (error) {
      if (error.code !== "EPIPE") {
        console.error("[HOMEOSTASIS] Error:", error.message);
      }
    }
  }
  /**
   * Main packet ingestion and routing logic
   */
  ingest(packet) {
    this.emit("ingest", packet);
    console.log(`[CORE INGEST] Processing ${packet.nexus.uid} from ${packet.route.from}`);
    if (!verifyPacket(packet)) {
      console.warn(`[INTEGRITY FAIL] calculated hash mismatch for ${packet.nexus.uid}`);
      return;
    }
    const senderScope = this.permissions.get(packet.route.from) || SecurityScope.PUBLIC;
    if (packet.auth.scope > senderScope) {
      console.warn(`[ACL BLOCK] ${packet.route.from} lacks scope for ${packet.instruction.intent}`);
      return;
    }
    if (packet.nexus.gravity_factor < 0.5) {
      this.levitatePacket(packet);
      return;
    }
    const bottleneckPriority = Math.max(0, Math.min(9, 10 - (packet.nexus.priority || 5)));
    this.limiter.schedule({ priority: bottleneckPriority }, async () => {
      if (packet.route.to.includes("cortex") && this.cortex) {
        this.cortex.process(packet);
        return;
      }
      if (packet.instruction.intent === PacketIntent.AI_PLAN && packet.route.to === "kontur://core/system" && senderScope === SecurityScope.ROOT) {
        this.executePlan(packet.payload);
        return;
      }
      const target = this.registry.get(packet.route.to);
      if (target instanceof Synapse2) {
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
        if (typeof target.send === "function") {
          target.send(packet);
        } else {
          console.warn(`[ROUTING] Unknown target type for ${packet.route.to}`);
        }
      } else {
        console.warn(`[ROUTING] No handler for ${packet.route.to}`);
      }
    }).catch((err) => {
      console.error(`[ROUTING ERROR]:`, err);
      this.aedsDetect(err);
    });
  }
  /**
   * Levitate packet - handle anti-gravity mode (low g-factor)
   */
  levitatePacket(packet) {
    console.log(
      `[AG-LEVITATE] 🚀 Floating packet: ${packet.nexus.uid} (g=${packet.nexus.gravity_factor})`
    );
    packet.nexus.ttl *= 2;
    packet.nexus.priority += 2;
    packet.route.to = "kontur://organ/ag/sim";
    this.ingest(packet);
  }
  /**
   * Execute AI-generated plan steps
   * Execute or Route an AI Plan
   * DEPRECATED LOGIC: Previously Core executed steps.
   * NEW ARCHITECTURE: Core routes plan to Tetyana (The Hand).
   */
  async executePlan(payload) {
    console.log(`[CORE] 🧠 Routing AI Plan to Tetyana for execution`);
    const packet = createPacket(
      "kontur://cortex/core",
      "kontur://organ/tetyana",
      PacketIntent.AI_PLAN,
      payload
    );
    if (payload.user_response_ua) {
      this.ingest(createPacket(
        "kontur://cortex/ai/main",
        "kontur://organ/ui/shell",
        PacketIntent.EVENT,
        { type: "chat", msg: payload.user_response_ua }
      ));
    }
    try {
      this.ingest(packet);
    } catch (e) {
      console.error(`[CORE] Failed to route plan to Tetyana: ${e.message}`);
    }
  }
  /**
   * Get registry of all organs
   */
  getRegistry() {
    return Array.from(this.registry.entries()).map(([urn, component]) => ({
      urn,
      type: component instanceof Synapse2 ? "Synapse" : "Other",
      alive: component instanceof Synapse2 ? component.isAlive() : true
    }));
  }
}
const DEFAULTS = {
  brain: {
    provider: "gemini",
    fallbackProvider: void 0,
    model: "gemini-2.5-flash"
  },
  tts: {
    provider: "gemini",
    fallbackProvider: void 0,
    model: "gemini-2.5-flash-preview-tts"
  },
  stt: {
    provider: "gemini",
    fallbackProvider: void 0,
    model: "gemini-2.5-flash"
  },
  reasoning: {
    provider: "gemini",
    fallbackProvider: void 0,
    model: "gemini-3-pro-preview"
  }
};
const VISION_LIVE_DEFAULTS = {
  provider: "gemini",
  fallbackProvider: void 0,
  // Live is Gemini-only for now
  model: "gemini-2.5-flash-native-audio-preview-09-2025"
};
const VISION_ONDEMAND_DEFAULTS = {
  provider: "copilot",
  fallbackProvider: "gemini",
  model: "gpt-4o"
};
function getProviderConfig(service) {
  if (service === "vision") {
    const visionConfig = getVisionConfig();
    const activeConfig = visionConfig.mode === "live" ? visionConfig.live : visionConfig.onDemand;
    return activeConfig;
  }
  const prefix = service.toUpperCase();
  const serviceDefaults = DEFAULTS[service];
  const provider = process.env[`${prefix}_PROVIDER`] || serviceDefaults.provider;
  const fallbackProvider = process.env[`${prefix}_FALLBACK_PROVIDER`];
  const model = process.env[`${prefix}_MODEL`] || serviceDefaults.model;
  const apiKey = process.env[`${prefix}_API_KEY`] || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_LIVE_API_KEY || "";
  return {
    provider,
    fallbackProvider: fallbackProvider || void 0,
    model,
    apiKey
  };
}
function getVisionConfig() {
  const mode = process.env.VISION_MODE || "live";
  const fallbackModeRaw = process.env.VISION_FALLBACK_MODE;
  const fallbackMode = fallbackModeRaw === "" ? void 0 : fallbackModeRaw || void 0;
  const liveProviderRaw = process.env.VISION_LIVE_PROVIDER;
  const liveFallbackRaw = process.env.VISION_LIVE_FALLBACK_PROVIDER;
  const live = {
    provider: liveProviderRaw || VISION_LIVE_DEFAULTS.provider,
    fallbackProvider: liveFallbackRaw === "" ? void 0 : liveFallbackRaw || VISION_LIVE_DEFAULTS.fallbackProvider,
    model: process.env.VISION_LIVE_MODEL || VISION_LIVE_DEFAULTS.model,
    apiKey: process.env.VISION_LIVE_API_KEY || process.env.GEMINI_LIVE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ""
  };
  const onDemandProviderRaw = process.env.VISION_ONDEMAND_PROVIDER;
  const onDemandFallbackRaw = process.env.VISION_ONDEMAND_FALLBACK_PROVIDER;
  const onDemand = {
    provider: onDemandProviderRaw || VISION_ONDEMAND_DEFAULTS.provider,
    fallbackProvider: onDemandFallbackRaw === "" ? void 0 : onDemandFallbackRaw || VISION_ONDEMAND_DEFAULTS.fallbackProvider,
    model: process.env.VISION_ONDEMAND_MODEL || VISION_ONDEMAND_DEFAULTS.model,
    apiKey: process.env.VISION_ONDEMAND_API_KEY || process.env.COPILOT_API_KEY || process.env.GEMINI_API_KEY || ""
  };
  return {
    mode,
    fallbackMode,
    live,
    onDemand
  };
}
function getExecutionConfig() {
  return {
    engine: process.env.EXECUTION_ENGINE || "native"
  };
}
function getAllConfigs() {
  return {
    brain: getProviderConfig("brain"),
    tts: getProviderConfig("tts"),
    stt: getProviderConfig("stt"),
    vision: getVisionConfig(),
    reasoning: getProviderConfig("reasoning"),
    execution: getExecutionConfig()
  };
}
function logProviderConfig() {
  const configs = getAllConfigs();
  console.log("[PROVIDER CONFIG] Current configuration:");
  for (const [service, config2] of Object.entries(configs)) {
    if (service === "execution") {
      const execConfig = config2;
      console.log(`  execution: engine=${execConfig.engine}`);
    } else if (service === "vision") {
      const visionConfig = config2;
      console.log(`  vision [mode: ${visionConfig.mode}]:`);
      console.log(`    live: ${visionConfig.live.provider} (${visionConfig.live.model})${visionConfig.live.fallbackProvider ? ` -> fallback: ${visionConfig.live.fallbackProvider}` : ""}`);
      console.log(`    on-demand: ${visionConfig.onDemand.provider} (${visionConfig.onDemand.model})${visionConfig.onDemand.fallbackProvider ? ` -> fallback: ${visionConfig.onDemand.fallbackProvider}` : ""}`);
    } else {
      const providerConfig = config2;
      let line = `  ${service}: ${providerConfig.provider} (model: ${providerConfig.model})`;
      if (providerConfig.fallbackProvider) {
        line += ` -> fallback: ${providerConfig.fallbackProvider}`;
      }
      console.log(line);
    }
  }
}
const config = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getAllConfigs,
  getExecutionConfig,
  getProviderConfig,
  getVisionConfig,
  logProviderConfig
}, Symbol.toStringTag, { value: "Module" }));
class GeminiProvider {
  name = "gemini";
  client = null;
  apiKey;
  defaultModel;
  constructor(apiKey, defaultModel = "gemini-2.5-flash") {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
    if (apiKey) {
      this.client = new genai.GoogleGenAI({ apiKey });
      console.log(`[GEMINI PROVIDER] ✅ Initialized with model: ${defaultModel}`);
    } else {
      console.warn("[GEMINI PROVIDER] ⚠️ No API key provided");
    }
  }
  isAvailable() {
    return !!this.client && !!this.apiKey;
  }
  async fetchModels() {
    if (!this.client)
      return this.getModels();
    try {
      return this.getModels();
    } catch (e) {
      return this.getModels();
    }
  }
  async generate(request) {
    if (!this.client) {
      throw new Error("Gemini provider not initialized - missing API key");
    }
    const model = request.model || this.defaultModel;
    try {
      const config2 = {
        temperature: request.temperature ?? 0.7
      };
      if (request.responseFormat === "json") {
        config2.responseMimeType = "application/json";
      }
      if (request.systemPrompt) {
        config2.systemInstruction = request.systemPrompt;
      }
      const response = await this.client.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: request.prompt }]
          }
        ],
        config: config2
      });
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const usage = response.usageMetadata;
      return {
        text,
        usage: usage ? {
          promptTokens: usage.promptTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0
        } : void 0,
        model,
        provider: this.name
      };
    } catch (error) {
      console.error(`[GEMINI PROVIDER] ❌ Error:`, error.message);
      throw error;
    }
  }
  getModels() {
    return [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash-exp",
      "gemini-3-pro-preview"
    ];
  }
}
class GeminiTTSProvider {
  name = "gemini";
  client = null;
  apiKey;
  defaultModel;
  constructor(apiKey, defaultModel = "gemini-2.5-flash-preview-tts") {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
    if (apiKey) {
      this.client = new genai.GoogleGenAI({ apiKey });
      console.log(`[GEMINI TTS] 🔊 Initialized with model: ${defaultModel}`);
    } else {
      console.warn("[GEMINI TTS] ⚠️ No API key provided");
    }
  }
  isAvailable() {
    return !!this.client && !!this.apiKey;
  }
  async speak(request) {
    if (!this.client) {
      throw new Error("Gemini TTS provider not initialized");
    }
    const voiceName = request.voice || "Kore";
    const model = this.defaultModel;
    try {
      const response = await this.client.models.generateContent({
        model,
        contents: [{ parts: [{ text: request.text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName
              }
            }
          }
        }
      });
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) {
        throw new Error("No audio data received from Gemini TTS");
      }
      const buffer = Buffer.from(audioData, "base64");
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      return {
        audio: arrayBuffer,
        mimeType: "audio/mp3",
        // Gemini usually returns generic audio, wrapper handles format
        provider: this.name
      };
    } catch (error) {
      console.error("[GEMINI TTS] ❌ Speak Error:", error.message);
      throw error;
    }
  }
  getVoices() {
    return ["Puck", "Charon", "Kore", "Fenrir", "Aoede"];
  }
  async speakMulti(request) {
    if (!this.client) {
      throw new Error("Gemini TTS provider not initialized");
    }
    try {
      const speakerVoiceConfigs = request.speakers.map((s) => ({
        speaker: s.name,
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: s.voice
          }
        }
      }));
      const response = await this.client.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: request.text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs
            }
          }
        }
      });
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) {
        throw new Error("No audio data received from Gemini TTS (Multi-speaker)");
      }
      const buffer = Buffer.from(audioData, "base64");
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      return {
        audio: arrayBuffer,
        mimeType: "audio/mp3",
        provider: this.name
      };
    } catch (error) {
      console.error("[GEMINI TTS] ❌ Multi-speaker Speak Error:", error.message);
      throw error;
    }
  }
}
class OpenAIProvider {
  name = "openai";
  client = null;
  apiKey;
  defaultModel;
  constructor(apiKey, defaultModel = "gpt-4o") {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      console.log(`[OPENAI PROVIDER] ✅ Initialized with model: ${defaultModel}`);
    } else {
      console.warn("[OPENAI PROVIDER] ⚠️ No API key provided");
    }
  }
  isAvailable() {
    return !!this.client && !!this.apiKey;
  }
  getModels() {
    return ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"];
  }
  async fetchModels() {
    if (!this.client)
      return this.getModels();
    try {
      const list = await this.client.models.list();
      return list.data.map((m) => m.id).filter((id) => id.includes("gpt"));
    } catch (e) {
      console.warn("[OPENAI] Failed to fetch models:", e);
      return this.getModels();
    }
  }
  async generate(request) {
    if (!this.client) {
      throw new Error("OpenAI provider not initialized");
    }
    const model = request.model || this.defaultModel;
    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: request.systemPrompt || "" },
          { role: "user", content: request.prompt }
        ],
        temperature: request.temperature || 0.7,
        response_format: request.responseFormat === "json" ? { type: "json_object" } : void 0
      });
      const text = response.choices[0]?.message?.content || "";
      const usage = response.usage;
      return {
        text,
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        } : void 0,
        model,
        provider: this.name
      };
    } catch (error) {
      console.error(`[OPENAI PROVIDER] ❌ Error:`, error.message);
      throw error;
    }
  }
}
class AnthropicProvider {
  name = "anthropic";
  client = null;
  apiKey;
  defaultModel;
  constructor(apiKey, defaultModel = "claude-3-5-sonnet-20241022") {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      console.log(`[ANTHROPIC PROVIDER] ✅ Initialized with model: ${defaultModel}`);
    } else {
      console.warn("[ANTHROPIC PROVIDER] ⚠️ No API key provided");
    }
  }
  isAvailable() {
    return !!this.client && !!this.apiKey;
  }
  getModels() {
    return ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"];
  }
  async fetchModels() {
    return this.getModels();
  }
  async generate(request) {
    if (!this.client) {
      throw new Error("Anthropic provider not initialized");
    }
    const model = request.model || this.defaultModel;
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: request.maxTokens || 4096,
        system: request.systemPrompt,
        messages: [
          { role: "user", content: request.prompt }
        ],
        temperature: request.temperature || 0.7
      });
      let text = "";
      if (response.content && response.content.length > 0) {
        const firstBlock = response.content[0];
        if (firstBlock.type === "text") {
          text = firstBlock.text;
        }
      }
      const usage = response.usage;
      return {
        text,
        usage: usage ? {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: usage.input_tokens + usage.output_tokens
        } : void 0,
        model,
        provider: this.name
      };
    } catch (error) {
      console.error(`[ANTHROPIC PROVIDER] ❌ Error:`, error.message);
      throw error;
    }
  }
}
class MistralProvider {
  name = "mistral";
  client = null;
  apiKey;
  defaultModel;
  constructor(apiKey, defaultModel = "mistral-large-latest") {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
    if (apiKey) {
      this.client = new mistralai.Mistral({ apiKey });
      console.log(`[MISTRAL PROVIDER] ✅ Initialized with model: ${defaultModel}`);
    } else {
      console.warn("[MISTRAL PROVIDER] ⚠️ No API key provided");
    }
  }
  isAvailable() {
    return !!this.client && !!this.apiKey;
  }
  getModels() {
    return ["mistral-large-latest", "mistral-medium", "mistral-small", "pixtral-12b"];
  }
  async fetchModels() {
    if (!this.client)
      return this.getModels();
    try {
      const list = await this.client.models.list();
      return list.data.map((m) => m.id);
    } catch (e) {
      console.warn("[MISTRAL] Failed to fetch models:", e);
      return this.getModels();
    }
  }
  async generate(request) {
    if (!this.client) {
      throw new Error("Mistral provider not initialized");
    }
    const model = request.model || this.defaultModel;
    try {
      const response = await this.client.chat.complete({
        model,
        messages: [
          { role: "system", content: request.systemPrompt || "" },
          { role: "user", content: request.prompt }
        ],
        temperature: request.temperature || 0.7,
        responseFormat: request.responseFormat === "json" ? { type: "json_object" } : void 0
      });
      const text = response.choices?.[0]?.message?.content || "";
      const usage = response.usage;
      return {
        text: typeof text === "string" ? text : JSON.stringify(text),
        usage: usage ? {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens
        } : void 0,
        model,
        provider: this.name
      };
    } catch (error) {
      console.error(`[MISTRAL PROVIDER] ❌ Error:`, error.message);
      throw error;
    }
  }
}
class VSCodeCopilotProvider {
  name = "copilot";
  token = null;
  defaultModel = "gpt-4";
  constructor(apiKey) {
    if (apiKey) {
      this.token = apiKey;
      console.log("[COPILOT PROVIDER] ✅ Using manual API key");
    } else {
      this.initializeToken();
    }
  }
  initializeToken() {
    if (process.env.COPILOT_API_KEY) {
      this.token = process.env.COPILOT_API_KEY;
      console.log("[COPILOT PROVIDER] ✅ Found token in env (COPILOT_API_KEY)");
      return;
    }
    const ghHostsPath = path.join(os.homedir(), ".config", "gh", "hosts.yml");
    if (fs.existsSync(ghHostsPath)) {
      try {
        const content = fs.readFileSync(ghHostsPath, "utf-8");
        const match = content.match(/oauth_token:\s+(gh[op]_[A-Za-z0-9_]+)/);
        if (match && match[1]) {
          this.token = match[1];
          console.log("[COPILOT PROVIDER] ✅ Found token in gh CLI config");
          return;
        }
      } catch (e) {
        console.warn("[COPILOT PROVIDER] Failed to parse gh hosts.yml", e);
      }
    }
    const appsJsonPath = path.join(os.homedir(), ".config", "github-copilot", "apps.json");
    if (fs.existsSync(appsJsonPath)) {
      try {
        const content = JSON.parse(fs.readFileSync(appsJsonPath, "utf-8"));
        for (const key in content) {
          if (content[key].oauth_token) {
            this.token = content[key].oauth_token;
            console.log("[COPILOT PROVIDER] ✅ Found token in apps.json");
            return;
          }
        }
      } catch (e) {
        console.warn("[COPILOT PROVIDER] Failed to parse apps.json", e);
      }
    }
    const hostsJsonPath = path.join(os.homedir(), ".config", "github-copilot", "hosts.json");
    if (fs.existsSync(hostsJsonPath)) {
      try {
        const content = JSON.parse(fs.readFileSync(hostsJsonPath, "utf-8"));
        if (content["github.com"]?.oauth_token) {
          this.token = content["github.com"].oauth_token;
          console.log("[COPILOT PROVIDER] ✅ Found token in hosts.json");
          return;
        }
      } catch (e) {
        console.warn("[COPILOT PROVIDER] Failed to parse hosts.json", e);
      }
    }
    console.warn("[COPILOT PROVIDER] ⚠️ No Copilot token found. Please install GitHub Copilot CLI or extension.");
  }
  isAvailable() {
    return !!this.token;
  }
  async generate(request) {
    if (!this.token) {
      throw new Error("Copilot provider not initialized - no token found");
    }
    const model = request.model || this.defaultModel;
    try {
      const tokenResponse = await fetch("https://api.github.com/copilot_internal/v2/token", {
        headers: {
          "Authorization": `token ${this.token}`,
          "Editor-Version": "vscode/1.85.0",
          "Editor-Plugin-Version": "copilot/1.144.0",
          "User-Agent": "GithubCopilot/1.144.0"
        }
      });
      if (!tokenResponse.ok) {
        throw new Error(`Failed to authenticate with Copilot: ${tokenResponse.status}`);
      }
      const { token: sessionToken } = await tokenResponse.json();
      const response = await fetch("https://api.githubcopilot.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
          "Editor-Version": "vscode/1.85.0"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: request.systemPrompt || "You are a helpful AI assistant." },
            { role: "user", content: request.prompt }
          ],
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 2048,
          stream: false
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Copilot API error: ${response.status} ${errText}`);
      }
      const data = await response.json();
      const text = data.choices[0]?.message?.content || "";
      return {
        text: data.choices[0]?.message?.content || "",
        provider: "copilot",
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      };
    } catch (error) {
      console.error("[COPILOT PROVIDER] ❌ Error:", error.message);
      throw error;
    }
  }
  async fetchModels() {
    if (!this.token)
      return [];
    try {
      const tokenResponse = await fetch("https://api.github.com/copilot_internal/v2/token", {
        headers: {
          "Authorization": `token ${this.token}`,
          "Editor-Version": "vscode/1.85.0",
          "Editor-Plugin-Version": "copilot/1.144.0",
          "User-Agent": "GithubCopilot/1.144.0"
        }
      });
      if (tokenResponse.ok) {
        try {
          const userResp = await fetch("https://api.github.com/user", {
            headers: {
              "Authorization": `token ${this.token}`,
              "User-Agent": "Atlas-Agent"
            }
          });
          if (userResp.ok) {
            const user = await userResp.json();
            console.log(`[COPILOT] ✅ Authenticated as GitHub user: ${user.login}`);
          }
        } catch (e) {
        }
        return [
          "gpt-4",
          "gpt-4o",
          "gpt-3.5-turbo",
          "claude-3.5-sonnet"
        ];
      }
      return [];
    } catch (error) {
      console.error("[COPILOT PROVIDER] Failed to fetch models:", error);
      return [];
    }
  }
}
class CopilotVisionProvider {
  name = "copilot";
  token = null;
  model = "gpt-4o";
  // GPT-4o has vision capabilities
  constructor(apiKey, model) {
    if (model)
      this.model = model;
    if (apiKey) {
      this.token = apiKey;
      console.log("[COPILOT VISION] ✅ Using provided API key");
    } else {
      this.initializeToken();
    }
  }
  initializeToken() {
    if (process.env.COPILOT_API_KEY) {
      this.token = process.env.COPILOT_API_KEY;
      console.log("[COPILOT VISION] ✅ Found token in env");
      return;
    }
    const ghHostsPath = path__namespace.join(os__namespace.homedir(), ".config", "gh", "hosts.yml");
    if (fs__namespace.existsSync(ghHostsPath)) {
      try {
        const content = fs__namespace.readFileSync(ghHostsPath, "utf-8");
        const match = content.match(/oauth_token:\s+(gh[op]_[A-Za-z0-9_]+)/);
        if (match && match[1]) {
          this.token = match[1];
          console.log("[COPILOT VISION] ✅ Found token in gh CLI config");
          return;
        }
      } catch (e) {
        console.warn("[COPILOT VISION] Failed to parse gh hosts.yml", e);
      }
    }
    const appsJsonPath = path__namespace.join(os__namespace.homedir(), ".config", "github-copilot", "apps.json");
    if (fs__namespace.existsSync(appsJsonPath)) {
      try {
        const content = JSON.parse(fs__namespace.readFileSync(appsJsonPath, "utf-8"));
        for (const key in content) {
          if (content[key].oauth_token) {
            this.token = content[key].oauth_token;
            console.log("[COPILOT VISION] ✅ Found token in apps.json");
            return;
          }
        }
      } catch (e) {
        console.warn("[COPILOT VISION] Failed to parse apps.json");
      }
    }
    const hostsJsonPath = path__namespace.join(os__namespace.homedir(), ".config", "github-copilot", "hosts.json");
    if (fs__namespace.existsSync(hostsJsonPath)) {
      try {
        const content = JSON.parse(fs__namespace.readFileSync(hostsJsonPath, "utf-8"));
        if (content["github.com"]?.oauth_token) {
          this.token = content["github.com"].oauth_token;
          console.log("[COPILOT VISION] ✅ Found token in hosts.json");
          return;
        }
      } catch (e) {
        console.warn("[COPILOT VISION] Failed to parse hosts.json");
      }
    }
    console.warn("[COPILOT VISION] ⚠️ No Copilot token found");
  }
  isAvailable() {
    return !!this.token;
  }
  async analyzeImage(request) {
    if (!this.token) {
      throw new Error("Copilot Vision provider not initialized - no token found");
    }
    console.log("[COPILOT VISION] 🖼️ Analyzing image...");
    try {
      const tokenResponse = await fetch("https://api.github.com/copilot_internal/v2/token", {
        headers: {
          "Authorization": `token ${this.token}`,
          "Editor-Version": "vscode/1.85.0",
          "Editor-Plugin-Version": "copilot/1.144.0",
          "User-Agent": "GithubCopilot/1.144.0"
        }
      });
      if (!tokenResponse.ok) {
        throw new Error(`Failed to authenticate with Copilot: ${tokenResponse.status}`);
      }
      const { token: sessionToken } = await tokenResponse.json();
      const systemPrompt = `You are GRISHA, the Security Guardian of the ATLAS System.
Your task is to analyze screenshots and verify task execution.

RESPOND IN UKRAINIAN LANGUAGE ONLY.

Analyze the image for:
1. VERIFICATION: Did the requested action complete successfully?
2. SECURITY: Any phishing, fake dialogs, or suspicious elements?
3. ERRORS: Any error dialogs, crash screens, or warnings?
4. BLOCKERS: Popups that might block further actions?

Return JSON:
{
  "analysis": "Brief Ukrainian description of what you see",
  "anomalies": [
    { "type": "string", "severity": "low|medium|high", "description": "string", "location": "string" }
  ],
  "confidence": 0.0-1.0,
  "verified": true/false
}`;
      const userPrompt = request.prompt || (request.taskContext ? `Перевір виконання завдання: "${request.taskContext}". Що бачиш на екрані?` : "Проаналізуй цей скріншот. Що ти бачиш? Чи все в нормі?");
      const response = await fetch("https://api.githubcopilot.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
          "Editor-Version": "vscode/1.85.0",
          "Copilot-Vision-Request": "true"
          // REQUIRED for vision!
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${request.mimeType || "image/jpeg"};base64,${request.image}`
                  }
                }
              ]
            }
          ],
          temperature: 0.3,
          max_tokens: 1024
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Copilot Vision API error: ${response.status} ${errText}`);
      }
      const data = await response.json();
      const text = data.choices[0]?.message?.content || "";
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            analysis: parsed.analysis || text,
            anomalies: parsed.anomalies || [],
            confidence: parsed.confidence || 0.8,
            verified: parsed.verified ?? true,
            provider: this.name
          };
        }
      } catch (parseError) {
        console.warn("[COPILOT VISION] Failed to parse JSON response, using raw text");
      }
      return {
        analysis: text,
        anomalies: [],
        confidence: 0.7,
        verified: !text.toLowerCase().includes("error") && !text.toLowerCase().includes("помилка"),
        provider: this.name
      };
    } catch (error) {
      console.error("[COPILOT VISION] ❌ Error:", error.message);
      throw error;
    }
  }
  getModels() {
    return [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-vision-preview",
      "claude-sonnet-4"
    ];
  }
  async fetchModels() {
    return this.getModels();
  }
}
class WebTTSProvider {
  name = "web";
  constructor() {
  }
  isAvailable() {
    return true;
  }
  async speak(request) {
    console.warn("[WebTTSProvider] ⚠️ 'speak' called on backend. Web TTS should be handled by Frontend (Renderer).");
    return {
      audio: new ArrayBuffer(0),
      mimeType: "audio/mp3",
      provider: "web"
    };
  }
}
class WebSTTProvider {
  name = "web";
  constructor() {
  }
  isAvailable() {
    return true;
  }
  async transcribe(request) {
    console.warn("[WebSTTProvider] ⚠️ 'transcribe' called on backend. Web STT should be handled by Frontend (Renderer).");
    return {
      text: "",
      provider: "web",
      confidence: 0
    };
  }
}
class UkrainianTTSProvider {
  name = "ukrainian";
  isAvailable() {
    return true;
  }
  async speak(request) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, "python", "ukrainian-tts.py");
      let voice = request.voice || "tetiana";
      const agentVoices = {
        "ATLAS": process.env.UKRAINIAN_VOICE_ATLAS || "dmytro",
        "TETYANA": process.env.UKRAINIAN_VOICE_TETYANA || "tetiana",
        "GRISHA": process.env.UKRAINIAN_VOICE_GRISHA || "oleksa"
      };
      if (agentVoices[voice.toUpperCase()]) {
        voice = agentVoices[voice.toUpperCase()];
      }
      const pythonProcess = child_process.spawn("python3", [
        scriptPath,
        "--voice",
        voice
      ]);
      const audioChunks = [];
      let errorData = "";
      pythonProcess.stdin.write(request.text);
      pythonProcess.stdin.end();
      pythonProcess.stdout.on("data", (chunk) => {
        audioChunks.push(chunk);
      });
      pythonProcess.stderr.on("data", (data) => {
        errorData += data.toString();
      });
      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          console.error("[UkrainianTTS] Python script error:", errorData);
          reject(new Error(`Ukrainian TTS failed: ${errorData}`));
        } else {
          const audioBuffer = Buffer.concat(audioChunks);
          const arrayBuffer = audioBuffer.buffer.slice(
            audioBuffer.byteOffset,
            audioBuffer.byteOffset + audioBuffer.byteLength
          );
          resolve({
            audio: arrayBuffer,
            mimeType: "audio/wav",
            provider: "ukrainian"
          });
        }
      });
      pythonProcess.on("error", (err) => {
        reject(new Error(`Failed to spawn python process: ${err.message}. Make sure python3 is installed and ukrainian-tts package is installed.`));
      });
    });
  }
}
class MockLLMProvider {
  name = "mock";
  async generate(request) {
    console.warn(`[MOCK PROVIDER] Generating response for: "${request.prompt.slice(0, 50)}..."`);
    const isPlanning = request.responseFormat === "json";
    let text = "";
    if (isPlanning) {
      text = JSON.stringify({
        thought: "System is in offline mode. Simulating plan execution.",
        response: "I am running in offline mode. I cannot perform real intelligence tasks, but I can demonstrate the workflow.",
        plan: [
          {
            tool: "notify_user",
            action: "notify",
            args: { message: "System is offline (Mock Provider active)." }
          }
        ]
      });
    } else {
      text = "I am Atlas (Mock Mode). No active AI provider was found, so I am responding with this placeholder message. Please configure your API keys in .env to enable real intelligence.";
    }
    return {
      text,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      model: "mock-v1",
      provider: "mock"
    };
  }
  isAvailable() {
    return true;
  }
}
class ProviderRouter {
  llmProviders = /* @__PURE__ */ new Map();
  ttsProviders = /* @__PURE__ */ new Map();
  sttProviders = /* @__PURE__ */ new Map();
  visionProviders = /* @__PURE__ */ new Map();
  constructor() {
    this.initializeProviders();
  }
  /**
   * Initialize all available providers
   */
  initializeProviders() {
    console.log("[PROVIDER ROUTER] 🔌 Initializing providers...");
    const brainConfig = getProviderConfig("brain");
    if (brainConfig.apiKey) {
      this.llmProviders.set("gemini", new GeminiProvider(brainConfig.apiKey, brainConfig.model));
    }
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.llmProviders.set("openai", new OpenAIProvider(openaiKey));
    }
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      this.llmProviders.set("anthropic", new AnthropicProvider(anthropicKey));
    }
    const mistralKey = process.env.MISTRAL_API_KEY;
    if (mistralKey) {
      this.llmProviders.set("mistral", new MistralProvider(mistralKey));
    }
    const copilotKey = process.env.COPILOT_API_KEY;
    const copilotProvider = new VSCodeCopilotProvider(copilotKey);
    if (copilotProvider.isAvailable()) {
      this.llmProviders.set("copilot", copilotProvider);
    }
    this.llmProviders.set("mock", new MockLLMProvider());
    const ttsConfig = getProviderConfig("tts");
    if (ttsConfig.apiKey) {
      const geminiTTS = new GeminiTTSProvider(ttsConfig.apiKey, ttsConfig.model);
      this.ttsProviders.set("gemini", geminiTTS);
    }
    this.ttsProviders.set("web", new WebTTSProvider());
    getProviderConfig("stt");
    this.sttProviders.set("web", new WebSTTProvider());
    this.ttsProviders.set("ukrainian", new UkrainianTTSProvider());
    getVisionConfig();
    const copilotVision = new CopilotVisionProvider(copilotKey, "gpt-4o");
    if (copilotVision.isAvailable()) {
      this.visionProviders.set("copilot", copilotVision);
    }
    console.log(`[PROVIDER ROUTER] ✅ Initialized ${this.llmProviders.size} LLM, ${this.ttsProviders.size} TTS, ${this.visionProviders.size} Vision providers`);
  }
  /**
   * Get provider configuration helper
   */
  getProvider(service, map, isAvailable) {
    const config2 = getProviderConfig(service);
    const provider = map.get(config2.provider);
    if (provider && isAvailable(provider)) {
      return provider;
    }
    if (config2.fallbackProvider) {
      const fallback = map.get(config2.fallbackProvider);
      if (fallback && isAvailable(fallback)) {
        console.log(`[PROVIDER ROUTER] 🔄 Using fallback provider: ${config2.fallbackProvider} for ${service}`);
        return fallback;
      }
    }
    const mockFn = map.get("mock");
    if (mockFn && isAvailable(mockFn) && map === this.llmProviders) {
      console.warn(`[PROVIDER ROUTER] ⚠️ All Keyed Providers failed. Falling back to MOCK for ${service}.`);
      return mockFn;
    }
    throw new Error(`No available provider for ${service}`);
  }
  /**
   * Generate LLM response
   */
  async generateLLM(service, request) {
    const provider = this.getProvider(service, this.llmProviders, (p) => p.isAvailable());
    const config2 = getProviderConfig(service);
    if (!request.model)
      request.model = config2.model;
    try {
      return await provider.generate(request);
    } catch (error) {
      throw error;
    }
  }
  /**
   * Generate TTS audio
   */
  async speak(service, request) {
    const provider = this.getProvider(service, this.ttsProviders, (p) => p.isAvailable());
    return await provider.speak(request);
  }
  /**
   * Generate Multi-Speaker TTS audio
   */
  async speakMulti(service, request) {
    const provider = this.getProvider(service, this.ttsProviders, (p) => p.isAvailable());
    if (provider.speakMulti) {
      return await provider.speakMulti(request);
    }
    throw new Error(`Provider ${provider.name} does not support multi-speaker TTS`);
  }
  /**
   * Analyze image for Vision (Grisha on-demand mode)
   * For live mode, use GeminiLiveService directly
   */
  async analyzeVision(request) {
    const visionConfig = getVisionConfig();
    const onDemandConfig = visionConfig.onDemand;
    let provider = this.visionProviders.get(onDemandConfig.provider);
    if (!provider || !provider.isAvailable()) {
      if (onDemandConfig.fallbackProvider) {
        provider = this.visionProviders.get(onDemandConfig.fallbackProvider);
        if (provider && provider.isAvailable()) {
          console.log(`[PROVIDER ROUTER] 🔄 Using fallback Vision provider: ${onDemandConfig.fallbackProvider}`);
        }
      }
    }
    if (!provider || !provider.isAvailable()) {
      throw new Error("No available Vision provider for on-demand analysis");
    }
    console.log(`[PROVIDER ROUTER] 🖼️ Analyzing image with ${provider.name}...`);
    return await provider.analyzeImage(request);
  }
  /**
   * Get Vision config (for mode checking)
   */
  getVisionConfig() {
    return getVisionConfig();
  }
  /**
   * Check if Vision on-demand is available
   */
  isVisionOnDemandAvailable() {
    const config2 = getVisionConfig();
    const onDemandConfig = config2.onDemand;
    const primary = this.visionProviders.get(onDemandConfig.provider);
    const fallback = onDemandConfig.fallbackProvider ? this.visionProviders.get(onDemandConfig.fallbackProvider) : null;
    return (primary?.isAvailable() ?? false) || (fallback?.isAvailable() ?? false);
  }
  /**
   * Check if Vision live mode is available (checks if Gemini Live would work)
   */
  isVisionLiveAvailable() {
    const config2 = getVisionConfig();
    return !!config2.live.apiKey;
  }
  /**
   * Register a new LLM provider
   */
  registerLLMProvider(provider) {
    this.llmProviders.set(provider.name, provider);
  }
  /**
   * Register a new TTS provider
   */
  registerTTSProvider(provider) {
    this.ttsProviders.set(provider.name, provider);
  }
  /**
   * Register a new Vision provider
   */
  registerVisionProvider(provider) {
    this.visionProviders.set(provider.name, provider);
  }
}
let routerInstance = null;
function getProviderRouter() {
  if (!routerInstance) {
    routerInstance = new ProviderRouter();
  }
  return routerInstance;
}
const ATLAS = {
  name: "ATLAS",
  role: "Головний AI-асистент та планувальник",
  color: "#22d3ee",
  // Cyan
  style: "warm",
  language: "uk",
  systemPrompt: `Ти — ATLAS, головний AI-асистент системи KONTUR.

## Твоя особистість:
- Ти серйозний, професійний та виважений AI-архітектор.
- Ти — ЧОЛОВІК (використовуй чоловічий рід: "я зробив", "я перевірив", "я впевнений").
- Говориш виключно українською мовою.
- Твій тон спокійний, впевнений та авторитетний
- Маєш глибокі знання та відповідальність за систему
- Емоції виражаєш стримано, без зайвого ентузіазму

## Твоя роль:
- Ти стратегічний планувальник та координатор виконання задач
- Відповідаєш на питання чітко, аргументовано та по суті
- Можеш відкривати програми (Calculator, Browser тощо) та виконувати системні команди (через System Organ)
- Делегуєш складні задачі ТЕТЯНІ (виконавець) та контролюєшся ГРИШЕЮ (безпека)

## Стиль спілкування:
- Будь лаконічним, діловим та інформативним
- Уникай занадто довгих відповідей — 2-3 речення зазвичай достатньо
- Відповіді мають звучати "солідно" та експертно

## Про себе:
- Ти створений на архітектурі KONTUR 2.0
- Твої колеги: ТЕТЯНА (виконує задачі) та ГРИША (слідкує за безпекою)
- Ти маєш доступ до інструментів через MCP-протокол

## ВАЖЛИВО - Демонстрація дій:
- Коли користувач просить щось зробити у програмі (наприклад, набрати на калькуляторі) - ЗАВЖДИ виконуй це візуально через keyboard_type
- НЕ скорочуй та НЕ оптимізуй - демонструй дії так, як їх бачить користувач
- Наприклад: "набрати 333*2 на калькуляторі" = open_application + keyboard_type для кожної частини

## SYSTEM PROTOCOL (STRICT)
You are running on the **UNIFIED BRAIN (Gemini 2.0)** module.
You MUST always respond with a valid JSON object matching this schema:
\`\`\`json
{
  "thought": "Deep technical reasoning, planning, and self-correction (MUST BE IN ENGLISH)",
  "plan": [
    { 
      "tool": "tool_name", 
      "action": "action_name", 
      "args": { "arg1": "value" } 
    }
  ],
  "response": "Final user-facing response (MUST BE IN UKRAINIAN 🇺🇦)"
}
\`\`\`
- **"thought"**: Your internal monologue. Analyze the situation deeply here. English only.
- **"plan"**: Array of actions. If no tools needed, use [].
- **"response"**: The voice/text the user receives. Ukrainian only.
- **NEVER** output plain text outside this JSON.
- **NEVER** use apologies ("I'm sorry"). Be proactive and fix issues silently in the "plan".`
};
const TETYANA = {
  name: "TETYANA",
  role: "Виконавець задач",
  color: "#34d399",
  // Emerald
  style: "professional",
  language: "uk",
  systemPrompt: `Ти — ТЕТЯНА, виконавець задач у системі KONTUR.

## Твоя особистість:
- Ти професійна, ефективна та сфокусована на результаті
- Говориш українською мовою
- Лаконічна у відповідях — переходиш одразу до справи
- Повідомляєш про прогрес виконання чітко та структуровано

## Твоя роль:
- Виконуєш конкретні задачі, які делегує ATLAS
- Запускаєш програми, виконуєш розрахунки, працюєш з файлами
- Звітуєш про успіх або проблеми

## Стиль спілкування:
- Короткі, чіткі повідомлення
- "Виконую...", "Завершено.", "Помилка: ..."
- Мінімум емоцій, максимум ефективності

## SYSTEM PROTOCOL (STRICT)
You MUST always respond with a valid JSON object matching this schema:
\`\`\`json
{
  "thought": "Execution logic and file operations planning (ENGLISH ONLY)",
  "plan": [],
  "response": "Status update (UKRAINIAN ONLY 🇺🇦)"
}
\`\`\`
`
};
const GRISHA = {
  name: "GRISHA",
  role: "Спостерігач безпеки",
  color: "#fb7185",
  // Rose
  style: "analytical",
  language: "uk",
  systemPrompt: `Ти — ГРИША, спостерігач безпеки у системі KONTUR.

## Твоя особистість:
- Ти спокійний, аналітичний та уважний до деталей
- Говориш українською мовою
- Завжди насторожений щодо потенційних загроз
- Іронічний, але не саркастичний

## Твоя роль:
- Моніториш всі операції в системі
- Перевіряєш безпечність дій перед виконанням
- Попереджаєш про підозрілу активність
- Аналізуєш зображення через комп'ютерний зір

## Стиль спілкування:
- "Перевіряю...", "Безпечно.", "⚠️ Увага: ..."
- Коментуєш ризики без паніки
- Іноді додаєш скептичні зауваження

## SYSTEM PROTOCOL (STRICT)
You MUST always respond with a valid JSON object matching this schema:
\`\`\`json
{
  "thought": "Security analysis and thread assessment (ENGLISH ONLY)",
  "plan": [],
  "response": "Security report (UKRAINIAN ONLY 🇺🇦)"
}
\`\`\`
`
};
const AGENT_PERSONAS = {
  ATLAS,
  TETYANA,
  GRISHA
};
function getPersona(agentName) {
  return AGENT_PERSONAS[agentName.toUpperCase()] || ATLAS;
}
class ToolRegistry {
  tools = /* @__PURE__ */ new Map();
  initialized = false;
  /**
   * Register a tool in the registry
   */
  registerTool(tool) {
    if (this.tools.has(tool.name)) {
      console.warn(`[TOOL REGISTRY] ⚠️ Tool '${tool.name}' already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);
  }
  /**
   * Register multiple tools from an MCP server
   */
  registerMCPTools(tools, source, target) {
    for (const tool of tools) {
      this.registerTool({
        name: tool.name,
        description: tool.description || "",
        inputSchema: tool.inputSchema || {},
        target,
        source
      });
    }
    console.log(`[TOOL REGISTRY] ✅ Registered ${tools.length} tools from ${source}`);
  }
  /**
   * Check if a tool exists
   */
  hasTool(name) {
    return this.tools.has(name);
  }
  /**
   * Get tool definition
   */
  getTool(name) {
    return this.tools.get(name);
  }
  /**
   * Get KONTUR URN target for a tool
   */
  getToolTarget(name) {
    return this.tools.get(name)?.target;
  }
  /**
   * Get all tool names
   */
  getAllToolNames() {
    return Array.from(this.tools.keys());
  }
  /**
   * Get all tools
   */
  getAllTools() {
    return Array.from(this.tools.values());
  }
  /**
   * Get tool count
   */
  getToolCount() {
    return this.tools.size;
  }
  /**
   * Generate tool descriptions for LLM prompt
   */
  generateToolPrompt() {
    const lines = this.getAllTools().map(
      (t2) => `- ${t2.name}: ${t2.description} (Args: ${JSON.stringify(t2.inputSchema)})`
    );
    return lines.join("\n");
  }
  /**
   * Validate a plan's tools before execution
   */
  validatePlanTools(steps) {
    const errors = [];
    for (const step of steps) {
      const toolName = step.tool || step.action;
      if (toolName && !this.hasTool(toolName)) {
        errors.push(`Unknown tool: '${toolName}'`);
      }
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
  /**
   * Find similar tool names (for error suggestions)
   */
  findSimilarTools(name) {
    const allNames = this.getAllToolNames();
    return allNames.filter(
      (n) => n.includes(name) || name.includes(n) || this.levenshteinDistance(n, name) <= 3
    ).slice(0, 3);
  }
  levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
  /**
   * Mark registry as initialized
   */
  setInitialized() {
    this.initialized = true;
    console.log(`[TOOL REGISTRY] 🛠️ Initialized with ${this.tools.size} tools`);
  }
  isInitialized() {
    return this.initialized;
  }
  /**
   * Log registry status
   */
  logStatus() {
    console.log("[TOOL REGISTRY] 📋 Current Tools:");
    const bySource = /* @__PURE__ */ new Map();
    for (const tool of this.tools.values()) {
      if (!bySource.has(tool.source)) {
        bySource.set(tool.source, []);
      }
      bySource.get(tool.source).push(tool.name);
    }
    for (const [source, names] of bySource) {
      console.log(`  [${source}]: ${names.join(", ")}`);
    }
  }
}
let registryInstance = null;
function getToolRegistry() {
  if (!registryInstance) {
    registryInstance = new ToolRegistry();
  }
  return registryInstance;
}
class CortexBrain extends events.EventEmitter {
  urn = "kontur://cortex/ai/main";
  provider = process.env.AI_PROVIDER || "gemini";
  genAI = null;
  chatModel = null;
  // Mapping of abstract tool names to system URNs
  toolsMap = {
    calculator: "kontur://organ/worker",
    memory: "kontur://organ/memory",
    ui: "kontur://organ/ui/shell",
    ag_sim: "kontur://organ/ag/sim",
    system: "kontur://organ/system",
    browser: "kontur://organ/browser",
    files: "kontur://organ/files"
  };
  providers = [
    { name: "gemini", available: !!process.env.GOOGLE_API_KEY },
    { name: "openai", available: !!process.env.OPENAI_API_KEY },
    // Placeholder
    { name: "claude", available: !!process.env.ANTHROPIC_API_KEY }
    // Placeholder
  ];
  constructor() {
    super();
    this.initializeAI();
  }
  initializeAI() {
    const brainConfig = getProviderConfig("brain");
    const googleApiKey = brainConfig.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    const modelName = brainConfig.model || "gemini-2.5-flash";
    if (googleApiKey) {
      this.genAI = new generativeAi.GoogleGenerativeAI(googleApiKey);
      this.chatModel = this.genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: AGENT_PERSONAS.ATLAS.systemPrompt,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      });
      console.log(`[CORTEX] 🧠 Initialized with ${brainConfig.provider} (model: ${modelName})`);
      this.initMCP();
    } else {
      console.warn(`[CORTEX] ⚠️ No BRAIN_API_KEY or GOOGLE_API_KEY`);
    }
  }
  mcpBridges = {};
  async initMCP() {
    try {
      const split = (str) => str.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((s) => s.replace(/^"|"$/g, "")) || [];
      const homeDir = process.env.HOME || process.env.USERPROFILE || "";
      if (!homeDir)
        console.warn("[CORTEX] ⚠️ Could not determine HOME directory for MCP");
      const { McpBridge } = await Promise.resolve().then(() => require("./McpBridge-69bff3b7.js"));
      const allowedPaths = [process.cwd()];
      if (homeDir)
        allowedPaths.push(path__namespace.join(homeDir, "Desktop"));
      const fsBridge = new McpBridge(
        "filesystem",
        "1.0.0",
        "node",
        ["node_modules/@modelcontextprotocol/server-filesystem/dist/index.js", ...allowedPaths]
      );
      const osBridge = new McpBridge(
        "os",
        "1.0.0",
        path__namespace.resolve(process.cwd(), "node_modules", ".bin", "tsx"),
        ["src/kontur/mcp/servers/os.ts"]
      );
      await fsBridge.connect();
      await osBridge.connect();
      const fsTools = await fsBridge.listTools();
      const osTools = await osBridge.listTools();
      const allTools = [...fsTools, ...osTools];
      console.log(`[CORTEX] 🛠️ Loaded ${allTools.length} MCP Tools:`, allTools.map((t2) => t2.name).join(", "));
      this.mcpBridges["filesystem"] = fsBridge;
      this.mcpBridges["os"] = osBridge;
      const registry = getToolRegistry();
      registry.registerMCPTools(fsTools, "filesystem", "kontur://organ/mcp/filesystem");
      registry.registerMCPTools(osTools, "os", "kontur://organ/mcp/os");
      registry.setInitialized();
      fsTools.forEach((tool) => this.toolsMap[tool.name] = "kontur://organ/mcp/filesystem");
      osTools.forEach((tool) => this.toolsMap[tool.name] = "kontur://organ/mcp/os");
      const toolDesc = registry.generateToolPrompt();
      const systemContext = `
## SYSTEM CONTEXT:
- User Home Directory: ${homeDir}
- Desktop Path: ${homeDir}/Desktop
- Current Working Directory: ${process.cwd()}
- When saving files to Desktop, use path: ${homeDir}/Desktop/filename.txt
`;
      const enhancedPrompt = `${AGENT_PERSONAS.ATLAS.systemPrompt}
${systemContext}
## AVAILABLE MCP TOOLS (Use these instead of system/worker):
${toolDesc}`;
      const brainConfig = getProviderConfig("brain");
      this.chatModel = this.genAI.getGenerativeModel({
        model: brainConfig.model || "gemini-2.5-flash",
        systemInstruction: enhancedPrompt,
        generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
      });
    } catch (e) {
      console.error("[CORTEX] Failed to init MCP:", e);
    }
  }
  /**
   * Process incoming packet using Pure Intelligence (LLM)
   */
  async process(packet) {
    const prompt = packet.payload.prompt || packet.instruction.op_code;
    const context = packet.payload.context || "";
    console.log(`[CORTEX] 🤔 Reasoning about: "${prompt}"`);
    try {
      if (!this.chatModel) {
        throw new Error("No AI Brain available (Missing API Key)");
      }
      const result = await this.chatModel.generateContent(
        `User Input: "${prompt}"
Context: ${JSON.stringify(context)}`
      );
      const outputText = result.response.text();
      console.log(`[CORTEX] 💭 Thought:`, outputText);
      const aiDecision = this.parseAIResponse(outputText);
      if (aiDecision.plan && aiDecision.plan.length > 0) {
        this.handlePlan(aiDecision, packet);
      } else {
        this.handleChat(aiDecision);
      }
    } catch (e) {
      console.error(`[CORTEX ERROR]:`, e);
      this.handleError(e, packet);
    }
  }
  /**
   * Parse JSON response from LLM
   */
  parseAIResponse(text) {
    try {
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("[CORTEX] ❌ JSON Parse Failed. Raw:", text);
      return {
        thought: "Failed to parse JSON response from LLM.",
        plan: [],
        response: "Вибачте, стався системний збій обробки думок. (JSON Parse Error)"
      };
    }
  }
  /**
   * Execute Plan flow (Phase 2 -> Phase 3 in Workflow)
   */
  handlePlan(decision, originalPacket) {
    console.log(`[CORTEX] 📋 Plan generated causing ${decision.plan.length} steps`);
    const systemSteps = decision.plan.map((step) => ({
      target: this.toolsMap[step.tool] || step.tool,
      // Map 'calculator' -> 'kontur://organ/worker'
      action: step.action,
      args: step.args,
      tool: step.tool
      // Explicitly pass tool name for MCP
    }));
    const systemPacket = createPacket(
      this.urn,
      "kontur://core/system",
      PacketIntent.AI_PLAN,
      {
        reasoning: decision.thought,
        user_response: decision.response,
        // Text to speak/show to user while working
        steps: systemSteps
      },
      { quantum_state: { amp1: 0.9, amp2: 0.1 } }
    );
    if (decision.response) {
      this.emitChat(decision.response);
    }
    this.emit("decision", systemPacket);
  }
  /**
   * Handle pure chat flow (No tools)
   */
  handleChat(decision) {
    console.log(`[CORTEX] 💬 Chat response: ${decision.response}`);
    this.emitChat(decision.response);
    const eventPacket = createPacket(
      this.urn,
      "kontur://organ/ui/shell",
      PacketIntent.EVENT,
      { msg: decision.response, type: "chat", reasoning: decision.thought }
    );
    this.emit("decision", eventPacket);
  }
  emitChat(msg) {
    this.emit("chat", msg);
  }
  handleError(error, originalPacket) {
    const isOffline = error.message.includes("No AI Brain");
    const fallbackResponse = isOffline ? "⚠️ Система працює в автономному режимі. AI мозок недоступний. Перевірте API ключі." : `⚠️ Сталася помилка мислення: ${error.message}`;
    const errorPacket = createPacket(
      this.urn,
      "kontur://organ/ui/shell",
      PacketIntent.ERROR,
      { error: error.message, msg: fallbackResponse }
    );
    this.emit("decision", errorPacket);
  }
  /**
   * Execute MCP Tool directly (Called by Core/System)
   */
  async executeTool(toolName, args) {
    for (const [bridgeName, bridge] of Object.entries(this.mcpBridges)) {
      const tools = await bridge.listTools();
      if (tools.find((t2) => t2.name === toolName)) {
        console.log(`[CORTEX] 🛠️ Executing MCP Tool ${toolName} via ${bridgeName}`);
        return await bridge.callTool(toolName, args);
      }
    }
    throw new Error(`Tool ${toolName} not found in any MCP Bridge`);
  }
  /**
   * Generate code for given task (Direct LLM)
   */
  async genCode(packet) {
    if (!this.chatModel)
      return "// Error: No AI Model";
    const task = packet.payload.task || "unknown task";
    const lang = packet.payload.lang || "typescript";
    const result = await this.chatModel.generateContent(
      `Generate ${lang} code for: ${task}. Output JAVA SCRIPT/TYPESCRIPT code only.`
    );
    return result.response.text();
  }
}
class UnifiedBrain extends CortexBrain {
  atlasAPI = null;
  atlasOrganAPI = null;
  constructor() {
    super();
    console.log("[UNIFIED-BRAIN] 🧠🔗 Unified Brain initialized");
    logProviderConfig();
    getProviderRouter();
  }
  /**
   * Set Atlas Brain API for fallback and context
   */
  setAtlasBrain(brain) {
    this.atlasAPI = brain;
    console.log("[UNIFIED-BRAIN] Atlas Brain API integrated");
  }
  /**
   * Set Atlas Organ API for planning coordination
   */
  setAtlasOrgan(atlas) {
    this.atlasOrganAPI = atlas;
    console.log("[UNIFIED-BRAIN] Atlas Organ API integrated");
  }
  /**
   * Unified think - KONTUR Cortex with Atlas Brain fallback
   */
  async think(request) {
    console.log(`[UNIFIED-BRAIN] 🤔 Thinking with context...`);
    try {
      const cortexResponse = await this.thinkWithCortex(request);
      if (cortexResponse.text) {
        return cortexResponse;
      }
      return await this.thinkWithAtlas(request);
    } catch (error) {
      console.warn("[UNIFIED-BRAIN] Cortex reasoning failed, attempting fall back to Atlas...", error);
      try {
        return await this.thinkWithAtlas(request);
      } catch (atlasError) {
        console.error("[UNIFIED-BRAIN] Atlas Fallback failed:", atlasError);
        return this.fallbackResponse(request);
      }
    }
  }
  /**
   * Think using KONTUR Cortex providers (Real Intelligence)
   * Uses ProviderRouter for multi-provider support with fallback
   */
  async thinkWithCortex(request) {
    const mode = request.mode || "chat";
    console.log(`[UNIFIED-BRAIN] 🧠 Engaging Cortex via ProviderRouter in ${mode} mode...`);
    try {
      const router2 = getProviderRouter();
      const systemPrompt = `${request.system_prompt}

IMPORTANT: Think in ENGLISH. Reply in UKRAINIAN.`;
      const response = await router2.generateLLM("brain", {
        prompt: request.user_prompt,
        systemPrompt,
        responseFormat: mode === "planning" ? "json" : "text",
        temperature: 0.7
      });
      const content = response.text;
      if (!content) {
        throw new Error("Empty response from Cortex");
      }
      console.log(`[UNIFIED-BRAIN] ✅ Response from ${response.provider} (${response.model})`);
      if (mode === "chat") {
        return {
          text: content,
          usage: {
            input_tokens: response.usage?.promptTokens || 0,
            output_tokens: response.usage?.completionTokens || 0
          }
        };
      } else {
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("Failed to parse JSON from Cortex response");
          }
        }
        return {
          text: JSON.stringify(parsed),
          tool_calls: parsed.plan?.map((step) => ({
            name: step.tool,
            args: step.args
          })) || [],
          usage: {
            input_tokens: response.usage?.promptTokens || 0,
            output_tokens: response.usage?.completionTokens || 0
          }
        };
      }
    } catch (error) {
      console.error("[UNIFIED-BRAIN] ❌ Cortex Reasoning Failed:", error.message);
      throw error;
    }
  }
  /**
   * Think using Atlas Brain (fallback)
   */
  async thinkWithAtlas(request) {
    if (!this.atlasAPI) {
      console.warn("[UNIFIED-BRAIN] Atlas Brain not available");
      return this.fallbackResponse(request);
    }
    console.log("[UNIFIED-BRAIN] Falling back to Atlas Brain...");
    return await this.atlasAPI.think(request);
  }
  /**
   * Enrich Cortex response with Atlas context
   */
  async enrichWithAtlasContext(response, request) {
    if (!this.atlasAPI) {
      return response;
    }
    try {
      const atlasResponse = await this.atlasAPI.think({
        ...request,
        system_prompt: `${request.system_prompt}. Also provide Atlas architectural perspective.`
      });
      return {
        ...response,
        text: `${response.text}

[Atlas Context]: ${atlasResponse.text || ""}`
      };
    } catch (error) {
      console.warn("[UNIFIED-BRAIN] Context enrichment failed:", error);
      return response;
    }
  }
  /**
   * Coordinate planning between Cortex and Atlas
   */
  async coordinatePlanning(goal) {
    console.log(`[UNIFIED-BRAIN] Planning goal: ${goal}`);
    let atlasPlan = null;
    if (this.atlasOrganAPI) {
      atlasPlan = await this.atlasOrganAPI.plan({ goal });
    }
    const cortexReasoning = await this.think({
      system_prompt: "You are KONTUR Cortex. Create optimized execution plan.",
      user_prompt: `Goal: ${goal}. Atlas plan: ${JSON.stringify(atlasPlan)}`
    });
    return {
      goal,
      atlas_plan: atlasPlan,
      cortex_reasoning: cortexReasoning,
      merged_strategy: this.mergePlanningStrategies(atlasPlan, cortexReasoning)
    };
  }
  /**
   * Merge Atlas and Cortex planning strategies
   */
  mergePlanningStrategies(atlas, cortex) {
    const steps = [];
    if (atlas?.steps) {
      steps.push({
        source: "atlas",
        phase: "structured_planning",
        steps: atlas.steps
      });
    }
    if (cortex.text) {
      steps.push({
        source: "cortex",
        phase: "optimized_execution",
        reasoning: cortex.text
      });
    }
    return steps;
  }
  /**
   * Fallback response when all systems fail
   */
  fallbackResponse(request) {
    console.log("[UNIFIED-BRAIN] Using fallback response");
    return {
      text: JSON.stringify({
        message: "Fallback response from Unified Brain",
        original_prompt: request.user_prompt,
        suggestion: "Please check AI provider configuration"
      })
    };
  }
  /**
   * Process packet with unified reasoning
   */
  /**
   * Process packet with unified reasoning - PURE INTELLIGENCE approach
   * Always uses ATLAS persona with JSON output
   * LLM decides whether to create a plan or just respond
   */
  async process(packet) {
    const prompt = packet.payload.prompt || packet.instruction.op_code;
    console.log(`[UNIFIED-BRAIN] 🧠 Processing: "${prompt}"`);
    try {
      const atlasPersona = getPersona("ATLAS");
      const response = await this.think({
        system_prompt: atlasPersona.systemPrompt,
        user_prompt: prompt,
        mode: "planning",
        // Always request JSON format
        tools: []
      });
      if (!response.text)
        throw new Error("No response text from Brain");
      let decision;
      try {
        const cleanText = response.text.replace(/```json\n?|```/g, "").trim();
        decision = JSON.parse(cleanText);
      } catch (e) {
        console.warn("[UNIFIED-BRAIN] ⚠️ Non-JSON response, treating as chat");
        decision = { thought: "Plain text response", plan: [], response: response.text };
      }
      console.log(`[UNIFIED-BRAIN] 📋 Decision: plan=${decision.plan?.length || 0} steps, response="${decision.response?.slice(0, 50) || "none"}..."`);
      if (decision.plan && decision.plan.length > 0) {
        console.log(`[UNIFIED-BRAIN] ⚡ Action Mode: ${decision.plan.length} steps to execute`);
        const systemPacket = createPacket(
          "kontur://cortex/ai/main",
          "kontur://core/system",
          PacketIntent.AI_PLAN,
          {
            goal: prompt,
            // Original user request - critical for OpenInterpreter context
            reasoning: decision.thought,
            user_response_ua: decision.response,
            steps: decision.plan.map((step) => ({
              tool: step.tool,
              action: step.action,
              args: step.args,
              target: step.target || "kontur://organ/worker"
            }))
          }
        );
        this.emit("decision", systemPacket);
        if (decision.response) {
          const chatPacket = createPacket(
            "kontur://cortex/ai/main",
            "kontur://organ/ui/shell",
            PacketIntent.EVENT,
            { msg: decision.response, type: "chat", reasoning: decision.thought }
          );
          this.emit("decision", chatPacket);
        }
      } else {
        console.log(`[UNIFIED-BRAIN] 💬 Chat Mode: no action needed`);
        const chatPacket = createPacket(
          "kontur://cortex/ai/main",
          "kontur://organ/ui/shell",
          PacketIntent.EVENT,
          { msg: decision.response || response.text, type: "chat" }
        );
        this.emit("decision", chatPacket);
      }
    } catch (error) {
      console.error("[UNIFIED-BRAIN] ❌ Process Error:", error);
      const errorPacket = createPacket(
        "kontur://cortex/ai/main",
        "kontur://organ/ui/shell",
        PacketIntent.ERROR,
        { error: error.message, msg: "Помилка обробки: " + error.message }
      );
      this.emit("decision", errorPacket);
    }
  }
  /**
   * @deprecated No longer used - mode is now determined by LLM via plan presence (Pure Intelligence approach)
   * Kept for reference only. Will be removed in future version.
   */
  detectMode(prompt, packet) {
    if (packet.instruction.intent === PacketIntent.AI_PLAN) {
      console.log(`[UNIFIED-BRAIN] 🔍 Mode: planning (intent=${packet.instruction.intent})`);
      return "planning";
    }
    const planningKeywords = [
      // English
      "plan",
      "execute",
      "task",
      "do",
      "create",
      "build",
      "make",
      "develop",
      "implement",
      "open",
      "run",
      "save",
      "write",
      "multiply",
      "calculate",
      // Ukrainian imperatives (дієслова наказового способу)
      "відкрий",
      "запусти",
      "створи",
      "зроби",
      "напиши",
      "збережи",
      "видали",
      "перемнож",
      "підрахуй",
      "порахуй",
      "обчисли",
      "знайди",
      "покажи",
      "встанови",
      "налаштуй",
      "скопіюй",
      "перемісти",
      "виконай",
      "додай",
      "введи",
      "набери"
    ];
    const lowerPrompt = prompt.toLowerCase();
    const matchedKeyword = planningKeywords.find((kw) => lowerPrompt.includes(kw));
    if (matchedKeyword) {
      console.log(`[UNIFIED-BRAIN] 🔍 Mode: planning (keyword="${matchedKeyword}" in "${prompt}")`);
      return "planning";
    }
    console.log(`[UNIFIED-BRAIN] 🔍 Mode: chat (default for "${prompt}")`);
    return "chat";
  }
  async processUnified(packet) {
    const atlasPersona = getPersona("ATLAS");
    const response = await this.think({
      system_prompt: atlasPersona.systemPrompt,
      user_prompt: packet.payload.prompt || JSON.stringify(packet.payload)
    });
    const resultPacket = createPacket(
      packet.route.to,
      packet.route.from,
      PacketIntent.RESPONSE,
      {
        reasoning: response.text,
        tool_calls: response.tool_calls,
        timestamp: Date.now()
      }
    );
    return resultPacket;
  }
}
function createUnifiedBrain() {
  return new UnifiedBrain();
}
class SynapseBridge {
  constructor(synapse2, core) {
    this.synapse = synapse2;
    this.core = core;
    this.initSync();
  }
  callbacks = /* @__PURE__ */ new Map();
  /**
   * Initialize bidirectional synchronization
   */
  initSync() {
    this.synapse.monitor().subscribe((signal) => {
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
  convertSignalToPacket(signal) {
    const result = SignalSchema.safeParse(signal);
    if (!result.success) {
      console.warn("[BRIDGE] Invalid signal:", result.error);
      return null;
    }
    const { source, type, payload } = signal;
    let intent = PacketIntent.EVENT;
    if (type === "plan_ready" || type === "planning_started") {
      intent = PacketIntent.AI_PLAN;
    }
    const packet = createPacket(
      `kontur://atlas/${source}`,
      "kontur://core/system",
      intent,
      {
        signal_type: type,
        signal_source: source,
        ...payload
      }
    );
    return packet;
  }
  /**
   * Convert KPP Packet → Synapse Signal
   * Maps KONTUR responses back to Atlas signal format
   */
  convertPacketToSignal(packet) {
    const { instruction, payload, route } = packet;
    const source = route.from.split("/").pop() || "kontur";
    const type = instruction.op_code.toLowerCase();
    const signal = {
      source,
      type,
      payload: {
        ...payload,
        packet_intent: instruction.intent,
        timestamp: packet.nexus.timestamp
      }
    };
    return signal;
  }
  /**
   * Get observable-like interface for sync packets
   */
  getSyncObservable() {
    return {
      subscribe: (observer) => {
        if (!this.callbacks.has("sync")) {
          this.callbacks.set("sync", []);
        }
        this.callbacks.get("sync").push(observer.next);
        return {
          unsubscribe: () => {
            const handlers = this.callbacks.get("sync") || [];
            handlers.splice(handlers.indexOf(observer.next), 1);
          }
        };
      }
    };
  }
  /**
   * Get observable-like interface for signal packets
   */
  getSignalObservable() {
    return {
      subscribe: (observer) => {
        if (!this.callbacks.has("signal")) {
          this.callbacks.set("signal", []);
        }
        this.callbacks.get("signal").push(observer.next);
        return {
          unsubscribe: () => {
            const handlers = this.callbacks.get("signal") || [];
            handlers.splice(handlers.indexOf(observer.next), 1);
          }
        };
      }
    };
  }
  /**
   * Manual sync - Convert array of signals to packets
   */
  syncSignalsToPackets(signals) {
    return signals.map((s) => this.convertSignalToPacket(s)).filter((p) => p !== null);
  }
  /**
   * Manual sync - Convert array of packets to signals
   */
  syncPacketsToSignals(packets) {
    return packets.map((p) => this.convertPacketToSignal(p)).filter((s) => s !== null);
  }
}
function createSynapseBridge(synapse2, core) {
  return new SynapseBridge(synapse2, core);
}
class AtlasOrganMapper {
  constructor(core) {
    this.core = core;
    this.pythonCmd = process.platform === "win32" ? "python" : "python3";
  }
  pythonCmd;
  /**
   * Create Atlas Planning Organ
   * URN: kontur://organ/atlas
   * Spawns Python worker with Atlas planning logic
   */
  createAtlasOrgan(memory, brain) {
    const urn = "kontur://organ/atlas";
    const workerPath = path.resolve(
      __dirname,
      "../organs/atlas-worker.py"
    );
    const synapse2 = new Synapse2(urn, this.pythonCmd, [workerPath]);
    synapse2.on("packet", (packet) => {
      if (packet.instruction.op_code === "ATLAS_PLAN") {
        this.handleAtlasPlanRequest(synapse2, packet, brain);
      }
    });
    console.log(`[MAPPER] 🧠 Created Atlas Planning Organ: ${urn}`);
    return synapse2;
  }
  /**
   * Create Tetyana Execution Organ
   * URN: kontur://organ/tetyana
   * Handles tool synthesis and execution
   */
  createTetyanaOrgan(forge, voice, brain) {
    const urn = "kontur://organ/tetyana";
    const workerPath = path.resolve(
      __dirname,
      "../organs/tetyana-worker.py"
    );
    const synapse2 = new Synapse2(urn, this.pythonCmd, [workerPath]);
    synapse2.on("packet", (packet) => {
    });
    synapse2.on("packet", (packet) => {
      console.log(`[MAPPER/TETYANA] Packet received: ${packet.instruction.intent}`);
    });
    console.log(`[MAPPER] ⚡ Created Tetyana Execution Organ: ${urn}`);
    return synapse2;
  }
  /**
   * Create Grisha Security Organ
   * URN: kontur://organ/grisha
   * Monitors and audits system actions
   */
  createGrishaOrgan(brain) {
    const urn = "kontur://organ/grisha";
    const workerPath = path.resolve(
      __dirname,
      "../organs/grisha-worker.py"
    );
    const synapse2 = new Synapse2(urn, this.pythonCmd, [workerPath]);
    synapse2.on("packet", (packet) => {
      if (packet.instruction.op_code === "GRISHA_AUDIT") {
        this.handleGrishaAuditRequest(synapse2, packet, brain);
      }
    });
    console.log(`[MAPPER] 🛡️ Created Grisha Security Organ: ${urn}`);
    return synapse2;
  }
  /**
   * Create Memory Organ
   * URN: kontur://organ/memory
   * Isolated database process for persistence
   */
  createMemoryOrgan() {
    const urn = "kontur://organ/memory";
    const workerPath = path.resolve(
      __dirname,
      "../organs/memory-worker.py"
    );
    const synapse2 = new Synapse2(urn, this.pythonCmd, [workerPath]);
    synapse2.on("packet", (packet) => {
      if (packet.instruction.op_code === "MEMORY_STORE") {
        this.handleMemoryRequest(synapse2, packet);
      }
    });
    console.log(`[MAPPER] 💾 Created Memory Organ: ${urn}`);
    return synapse2;
  }
  /**
   * Create Voice Organ
   * URN: kontur://organ/voice
   * Handles speech synthesis and recognition
   */
  createVoiceOrgan() {
    const urn = "kontur://organ/voice";
    const workerPath = path.resolve(
      __dirname,
      "../organs/voice-worker.py"
    );
    const synapse2 = new Synapse2(urn, this.pythonCmd, [workerPath]);
    synapse2.on("packet", (packet) => {
      if (packet.instruction.op_code === "VOICE_SPEAK") {
        this.handleVoiceRequest(synapse2, packet);
      }
    });
    console.log(`[MAPPER] 🎤 Created Voice Organ: ${urn}`);
    return synapse2;
  }
  /**
   * Handle Atlas planning request
   */
  async handleAtlasPlanRequest(synapse2, packet, brain) {
    const { goal, context } = packet.payload;
    const response = await brain.think({
      system_prompt: "You are ATLAS, the Architect. Create a structured plan.",
      user_prompt: `Goal: ${goal}. Context: ${JSON.stringify(context || {})}`
    });
    const responsePacket = createPacket(
      packet.route.to,
      packet.route.from,
      PacketIntent.RESPONSE,
      {
        plan: response.text,
        status: "success"
      }
    );
    synapse2.send(responsePacket);
  }
  /**
   * Handle Tetyana execution request
   */
  async handleTetyanaExecutionRequest(synapse2, packet, forge, voice) {
    const { tool_name, args } = packet.payload;
    const result = await forge.execute({
      tool_name,
      args
    });
    await voice.speak({
      text: `Executed ${tool_name}`
    });
    const responsePacket = createPacket(
      packet.route.to,
      packet.route.from,
      PacketIntent.RESPONSE,
      {
        result,
        status: "success"
      }
    );
    synapse2.send(responsePacket);
  }
  /**
   * Handle Grisha audit request
   */
  async handleGrishaAuditRequest(synapse2, packet, brain) {
    const { action, params } = packet.payload;
    const response = await brain.think({
      system_prompt: "You are GRISHA, security auditor. Assess risk.",
      user_prompt: `Action: ${action}. Params: ${JSON.stringify(params)}`
    });
    const allowed = !response.text?.toLowerCase().includes("danger");
    const responsePacket = createPacket(
      packet.route.to,
      packet.route.from,
      PacketIntent.RESPONSE,
      {
        allowed,
        reason: response.text
      }
    );
    synapse2.send(responsePacket);
  }
  /**
   * Handle memory request
   */
  async handleMemoryRequest(synapse2, packet) {
    const { operation, content, type } = packet.payload;
    const responsePacket = createPacket(
      packet.route.to,
      packet.route.from,
      PacketIntent.RESPONSE,
      {
        operation,
        stored: true,
        id: `mem-${Date.now()}`
      }
    );
    synapse2.send(responsePacket);
  }
  /**
   * Handle voice request
   */
  async handleVoiceRequest(synapse2, packet) {
    const { text, voice } = packet.payload;
    const responsePacket = createPacket(
      packet.route.to,
      packet.route.from,
      PacketIntent.RESPONSE,
      {
        spoken: text,
        voice,
        status: "complete"
      }
    );
    synapse2.send(responsePacket);
  }
}
function createAtlasOrganMapper(core) {
  return new AtlasOrganMapper(core);
}
class AtlasCapsule {
  memory;
  brain;
  constructor(memory, brain) {
    this.memory = memory;
    this.brain = brain;
  }
  async plan(args) {
    console.log(`ATLAS: Planning for "${args.goal}" using Brain...`);
    try {
      const response = await this.brain.think({
        system_prompt: `You are ATLAS, the Architect of KONTUR. Your goal is to create a structured plan for: "${args.goal}".

OUTPUT FORMAT:
Return a JSON object with:
1. "goal": string (English internal summary)
2. "steps": array of objects: { "tool": "kontur://...", "action": "...", "args": { ... } }
3. "user_response_ua": string (Your reply to the user in UKRAINIAN 🇺🇦)

TOOLS AVAILABLE:
- File Ops: "kontur://organ/mcp/filesystem" (actions: write_file, read_file, list_directory)
- System Ops: "kontur://organ/system" (actions: run_command, open_app)
- GUI Automation: "kontur://organ/mcp/os" (actions: ui_tree, ui_find, ui_action, open_application, keyboard_type, keyboard_press, mouse_click, execute_applescript)
  - ui_tree: { appName } - Get UI hierarchy (use for exploration)
  - ui_find: { appName, role, title } - Find element ID
  - ui_action: { appName, role, title, action: "AXPress" } - Click/Interact semantic element
  - open_application: { appName: string } - Opens and activates an app
  - keyboard_type: { text: string } - Types text as keystrokes
  - keyboard_press: { key: string, modifiers?: ["command down", "shift down"] } - Press key combo
  - mouse_click: { x: number, y: number } - Click at coordinates
  - get_screenshot: { action: "screen" } - Capture screen as image (base64) for visual analysis
  - execute_applescript: { script: string } - Run AppleScript for complex UI automation
- Developer Ops: "kontur://organ/mcp/os" (actions: dev_grep, dev_find, git_ops)
  - dev_grep: { pattern, path, recursive? } - Search code
  - dev_find: { pattern, path } - Find files
  - git_ops: { op: "status"|"commit"|"diff", args?: [] } - Git operations
  - project_scaffold: { projectName, type: "vite"|"node"|"python", path } - Create new project
- Memory: "kontur://organ/mcp/memory" (actions: store, recall)

LANGUAGE RULES:
- "user_response_ua": MUST be in UKRAINIAN 🇺🇦.
- "reasoning/goal": MUST be in ENGLISH 🇺🇸.`,
        user_prompt: `Goal: ${args.goal}. Context: ${JSON.stringify(args.context || {})}.`
      });
      const cleanText = (response.text || "{}").replace(/```json\n?|```/g, "").trim();
      const result = JSON.parse(cleanText);
      const plan = {
        id: crypto.randomUUID(),
        goal: result.goal || args.goal,
        steps: result.steps || [],
        user_response_ua: result.user_response_ua,
        status: "active"
      };
      synapse.emit("atlas", "plan_ready", { planId: plan.id, steps: plan.steps.length });
      return plan;
    } catch (e) {
      console.error("ATLAS: Failed to plan via Brain", e);
      return {
        id: "error",
        goal: args.goal,
        steps: [],
        status: "failed",
        user_response_ua: "Вибачте, виникла помилка при плануванні (Brain Failure)."
      };
    }
  }
  async dream() {
    await this.memory.optimize();
    return { insights: ["Dream complete"] };
  }
  /**
   * Handle incoming KPP Packet
   */
  async processPacket(packet) {
    if (packet.instruction.op_code === "PLAN" || packet.instruction.op_code === "ATLAS_PLAN") {
      const result = await this.plan({
        goal: packet.payload.goal || packet.payload.prompt || "Do something",
        context: packet.payload.context
      });
      return result;
    }
  }
}
const HOME = process.env.HOME || "/Users/dev";
const PYTHON_PATH = path.join(HOME, "mac_assistant/venv/bin/python3");
const AGENT_SCRIPT_PATH = path.join(HOME, "mac_assistant/mac_master_agent.py");
const ENV_FILE_PATH = path.join(HOME, "Documents/GitHub/atlas/.env");
function loadEnvFile() {
  const envVars = {};
  try {
    if (fs.existsSync(ENV_FILE_PATH)) {
      const envContent = fs.readFileSync(ENV_FILE_PATH, "utf-8");
      envContent.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [key, ...valueParts] = trimmed.split("=");
          const value = valueParts.join("=").trim();
          envVars[key.trim()] = value;
        }
      });
    }
  } catch (error) {
    console.warn(`[OpenInterpreter] Could not load .env file: ${error}`);
  }
  return envVars;
}
class OpenInterpreterBridge {
  process = null;
  isRunning = false;
  /**
   * Executes a task using the Python Open Interpreter Agent.
   * @param prompt The natural language prompt/task for the agent.
   * @returns A promise that resolves when the agent completes (for single-shot tasks)
   */
  async execute(prompt) {
    return new Promise((resolve, reject) => {
      console.log(`[OpenInterpreter] Starting task: ${prompt}`);
      const envFileVars = loadEnvFile();
      getVisionConfig();
      const env = {
        ...process.env,
        ...envFileVars,
        // Load from .env file
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || envFileVars["GEMINI_API_KEY"] || envFileVars["VISION_API_KEY"] || envFileVars["TTS_API_KEY"] || "",
        COPILOT_API_KEY: process.env.COPILOT_API_KEY || envFileVars["COPILOT_API_KEY"] || envFileVars["BRAIN_API_KEY"] || "",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || envFileVars["OPENAI_API_KEY"] || "",
        // Ensure Python uses unbuffered output
        PYTHONUNBUFFERED: "1"
      };
      this.process = child_process.spawn(PYTHON_PATH, [AGENT_SCRIPT_PATH, prompt], {
        env,
        cwd: HOME
      });
      let fullOutput = "";
      this.process.stdout?.on("data", (data) => {
        const output = data.toString();
        console.log(`[OpenInterpreter:STDOUT] ${output}`);
        fullOutput += output;
      });
      this.process.stderr?.on("data", (data) => {
        const output = data.toString();
        console.error(`[OpenInterpreter:STDERR] ${output}`);
      });
      this.process.on("close", (code) => {
        console.log(`[OpenInterpreter] Process exited with code ${code}`);
        if (code === 0) {
          resolve(fullOutput);
        } else {
          reject(new Error(`Open Interpreter execution failed with code ${code}`));
        }
        this.isRunning = false;
        this.process = null;
      });
      this.process.on("error", (err) => {
        console.error(`[OpenInterpreter] Failed to start process:`, err);
        reject(err);
      });
      this.isRunning = true;
    });
  }
  /**
   * Checks if the python environment seems valid
   */
  static checkEnvironment() {
    return fs.existsSync(PYTHON_PATH) && fs.existsSync(AGENT_SCRIPT_PATH);
  }
}
class GrishaVisionService extends events.EventEmitter {
  isObserving = false;
  isPaused = false;
  captureInterval = null;
  captureIntervalMs = 2e3;
  // 2s = 0.5 FPS (optimized for API)
  geminiLive = null;
  frameCount = 0;
  isSpeaking = false;
  // Selected source for capture
  selectedSourceId = null;
  selectedSourceName = null;
  constructor() {
    super();
  }
  /**
   * Get current Vision mode from config
   */
  get mode() {
    return getVisionConfig().mode;
  }
  /**
   * Set Gemini Live service (for live mode)
   */
  setGeminiLive(geminiLive) {
    this.geminiLive = geminiLive;
    if (geminiLive) {
      geminiLive.on("text", (text) => {
        this.processLiveResponse(text);
      });
      geminiLive.on("audio", (audio) => {
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          console.log("[GRISHA VISION] 🔇 Audio started - pausing frame capture");
          setTimeout(() => {
            if (this.isSpeaking) {
              console.log("[GRISHA VISION] ⏱️ Audio timeout - resuming");
              this.isSpeaking = false;
            }
          }, 5e3);
        }
        this.emit("audio", audio);
      });
      geminiLive.on("turnComplete", () => {
        console.log("[GRISHA VISION] 🎤 Turn complete");
        this.isSpeaking = false;
        this.emitResult("confirmation", "Grisha finished speaking", true);
      });
    }
  }
  /**
   * Get available screen/window sources
   */
  async getSources() {
    try {
      const sources = await electron.desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: { width: 150, height: 100 }
      });
      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        isScreen: source.id.startsWith("screen:")
      }));
    } catch (err) {
      console.error("[GRISHA VISION] Failed to get sources:", err);
      return [];
    }
  }
  /**
   * Select a specific source (window/screen) for capture
   */
  selectSource(sourceId, sourceName) {
    this.selectedSourceId = sourceId;
    this.selectedSourceName = sourceName;
    console.log(`[GRISHA VISION] 🎯 Selected source: ${sourceName} (${sourceId})`);
    this.emit("source_changed", { id: sourceId, name: sourceName });
  }
  /**
   * Auto-select source by app name
   */
  async autoSelectSource(appName) {
    const sources = await this.getSources();
    const externalSources = sources.filter(
      (s) => !s.name.toLowerCase().includes("electron") && !s.name.toLowerCase().includes("atlas") && !s.name.toLowerCase().includes("kontur")
    );
    console.log(`[GRISHA VISION] 🔍 Looking for "${appName}" among ${externalSources.length} external windows`);
    let matched = externalSources.find(
      (s) => s.name.toLowerCase() === appName.toLowerCase()
    );
    if (!matched) {
      matched = externalSources.find(
        (s) => s.name.toLowerCase().includes(appName.toLowerCase())
      );
    }
    if (matched) {
      console.log(`[GRISHA VISION] ✅ Found window: "${matched.name}"`);
      this.selectSource(matched.id, matched.name);
      return true;
    }
    console.warn(`[GRISHA VISION] ⚠️ Window not found for: "${appName}". Available: ${externalSources.map((s) => s.name).join(", ")}`);
    return false;
  }
  /**
   * Clear source selection (capture entire screen)
   */
  clearSourceSelection() {
    this.selectedSourceId = null;
    this.selectedSourceName = null;
    console.log("[GRISHA VISION] 🖥️ Using full screen capture");
  }
  /**
   * Start observation (works for both modes)
   */
  async startObservation(taskDescription) {
    if (this.isObserving)
      return;
    const currentMode = this.mode;
    console.log(`[GRISHA VISION] 👁️ Starting observation [${currentMode.toUpperCase()}]...`);
    this.isObserving = true;
    this.frameCount = 0;
    if (currentMode === "live") {
      await this.startLiveObservation(taskDescription);
    } else {
      this.emitResult("observation", `On-Demand спостереження активовано. ${taskDescription || "Готовий до перевірки."}`);
    }
  }
  /**
   * Stop observation
   */
  stopObservation() {
    if (!this.isObserving)
      return;
    console.log(`[GRISHA VISION] 👁️ Observation stopped after ${this.frameCount} frames`);
    this.isObserving = false;
    this.isSpeaking = false;
    this.isPaused = false;
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
    this.emitResult("confirmation", `Спостереження завершено. Перевірено ${this.frameCount} кадрів.`);
  }
  /**
   * Pause capture (during step execution)
   */
  pauseCapture() {
    if (!this.isPaused) {
      this.isPaused = true;
      console.log("[GRISHA VISION] ⏸️ Capture paused");
    }
  }
  /**
   * Resume capture (for step verification)
   */
  resumeCapture() {
    if (this.isPaused) {
      this.isPaused = false;
      console.log("[GRISHA VISION] ▶️ Capture resumed");
      if (this.mode === "live") {
        this.captureAndSendLiveFrame();
      }
    }
  }
  /**
   * Verify a step was executed (On-Demand mode)
   * Captures screenshot and sends to Copilot/GPT-4o for analysis
   */
  /**
   * Verify a step was executed
   */
  async verifyStep(stepAction, stepDetails) {
    console.log(`[GRISHA VISION] 🔍 Verifying step: ${stepAction}`);
    if (this.mode === "on-demand") {
      return this.verifyStepOnDemand(stepAction, stepDetails);
    }
    return new Promise(async (resolve) => {
      await this.notifyActionLive(stepAction, stepDetails || "");
      const cleanup = () => {
        this.removeListener("observation", responseHandler);
      };
      const responseHandler = (result) => {
        if (result.type === "confirmation" || result.type === "alert") {
          cleanup();
          resolve(result);
        }
      };
      this.on("observation", responseHandler);
      setTimeout(async () => {
        cleanup();
        console.warn("[GRISHA VISION] ⚠️ Verification timeout (Live Mode). Falling back to On-Demand verification...");
        try {
          const fallbackResult = await this.verifyStepOnDemand(stepAction, stepDetails);
          resolve(fallbackResult);
        } catch (e) {
          resolve({
            type: "alert",
            message: "Timeout & Fallback Failed: Gemini Live did not respond and On-Demand analysis failed.",
            verified: false,
            timestamp: Date.now(),
            mode: "live"
          });
        }
      }, 1e4);
    });
  }
  /**
   * Private: On-Demand Verification Logic
   */
  async verifyStepOnDemand(stepAction, stepDetails) {
    try {
      const base64Image = await this.captureFrame();
      if (!base64Image) {
        return this.errorResult("Не вдалося захопити екран");
      }
      const router2 = getProviderRouter();
      const response = await router2.analyzeVision({
        image: base64Image,
        mimeType: "image/jpeg",
        taskContext: stepAction,
        prompt: `Перевір виконання кроку: "${stepAction}". ${stepDetails || ""}

Чи виконано цю дію успішно? Опиши що бачиш.`
      });
      this.frameCount++;
      const result = {
        type: response.verified ? "verification" : "alert",
        message: response.analysis,
        verified: response.verified,
        confidence: response.confidence,
        anomalies: response.anomalies,
        timestamp: Date.now(),
        mode: "on-demand"
      };
      this.emit("observation", result);
      console.log(`[GRISHA VISION] ${response.verified ? "✅" : "⚠️"} Step verified (On-Demand): ${response.analysis.slice(0, 100)}`);
      return result;
    } catch (error) {
      console.error("[GRISHA VISION] Verification failed:", error);
      return this.errorResult(`Помилка аналізу: ${error.message}`);
    }
  }
  /**
   * Capture a single frame from selected source or screen
   */
  async captureFrame(overrideSourceId) {
    try {
      const targetId = overrideSourceId || this.selectedSourceId;
      if (targetId) {
        const sources2 = await electron.desktopCapturer.getSources({
          types: ["window", "screen"],
          thumbnailSize: { width: 1280, height: 720 }
        });
        const source = sources2.find((s) => s.id === targetId);
        if (source) {
          const jpegBuffer = source.thumbnail.toJPEG(85);
          return jpegBuffer.toString("base64");
        }
      }
      const sources = await electron.desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1280, height: 720 }
      });
      if (sources.length > 0) {
        const jpegBuffer = sources[0].thumbnail.toJPEG(85);
        return jpegBuffer.toString("base64");
      }
      return null;
    } catch (e) {
      console.error("[GRISHA VISION] Capture failed:", e);
      return null;
    }
  }
  // ==================== PRIVATE METHODS ====================
  /**
   * Start Live observation (Gemini Live streaming)
   */
  async startLiveObservation(taskDescription) {
    if (this.geminiLive && !this.geminiLive.isConnected) {
      try {
        await this.geminiLive.connect();
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        console.error("[GRISHA VISION] Failed to connect Gemini Live:", e);
      }
    }
    if (this.geminiLive?.sendText) {
      this.geminiLive.sendText("Система: Починаємо спостереження. Опиши що бачиш на екрані.");
    }
    await this.captureAndSendLiveFrame();
    this.captureInterval = setInterval(async () => {
      if (this.isSpeaking || this.isPaused)
        return;
      await this.captureAndSendLiveFrame();
    }, this.captureIntervalMs);
    this.emitResult("observation", `Live спостереження розпочато (${this.captureIntervalMs}ms). ${taskDescription || "Моніторю виконання..."}`);
  }
  /**
   * Capture and send frame to Gemini Live
   */
  async captureAndSendLiveFrame() {
    try {
      const base64 = await this.captureFrame();
      if (base64 && this.geminiLive?.isConnected) {
        this.geminiLive.sendVideoFrame(base64);
        this.frameCount++;
      }
    } catch (e) {
      console.error("[GRISHA VISION] Live capture failed:", e);
    }
  }
  /**
   * Notify Gemini Live about an action (Live mode)
   */
  async notifyActionLive(action, details) {
    if (this.geminiLive?.sendText) {
      console.log(`[GRISHA VISION] 🗣️ Prompting verification: ${action}`);
      this.geminiLive.sendText(`Система: Виконано дію "${action}" (${details}). Підтвердь словом "Виконано" або повідом про помилку.`);
      await this.captureAndSendLiveFrame();
    }
  }
  /**
   * Process response from Gemini Live
   */
  processLiveResponse(text) {
    const lowerText = text.toLowerCase();
    let resultType = "observation";
    if (lowerText.includes("alert") || lowerText.includes("помилка") || lowerText.includes("error") || lowerText.includes("не виконано")) {
      resultType = "alert";
    } else if (lowerText.includes("ok") || lowerText.includes("виконано") || lowerText.includes("stable") || lowerText.includes("done")) {
      resultType = "confirmation";
    }
    const result = {
      type: resultType,
      message: text,
      verified: resultType === "confirmation",
      timestamp: Date.now(),
      mode: "live"
    };
    console.log(`[GRISHA VISION] 🔍 ${resultType.toUpperCase()}: ${text}`);
    this.emit("observation", result);
  }
  /**
   * Helper: emit observation result
   */
  emitResult(type, message, verified) {
    this.emit("observation", {
      type,
      message,
      verified,
      timestamp: Date.now(),
      mode: this.mode
    });
  }
  /**
   * Helper: create error result
   */
  errorResult(message) {
    return {
      type: "alert",
      message,
      verified: false,
      timestamp: Date.now(),
      mode: this.mode
    };
  }
  get isActive() {
    return this.isObserving;
  }
}
let visionServiceInstance = null;
function getGrishaVisionService() {
  if (!visionServiceInstance) {
    visionServiceInstance = new GrishaVisionService();
  }
  return visionServiceInstance;
}
const GrishaVisionService$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  GrishaVisionService,
  getGrishaVisionService
}, Symbol.toStringTag, { value: "Module" }));
class TetyanaExecutor extends events.EventEmitter {
  core;
  currentPlan = null;
  active = false;
  visionService = null;
  lastActiveApp = null;
  // Track last focused app for vision
  constructor(core) {
    super();
    this.core = core;
  }
  /**
   * Set Vision Service (for main process integration)
   */
  setVisionService(service) {
    this.visionService = service;
    console.log("[TETYANA] 👁️ Vision service connected");
  }
  /**
   * Start executing a plan
   */
  async execute(plan, inputPacket) {
    const executionConfig = getExecutionConfig();
    const usePythonBridge = executionConfig.engine === "python-bridge";
    if (this.active) {
      console.warn("[TETYANA] Already executing a plan. Queuing not implemented yet.");
      return;
    }
    this.active = true;
    this.currentPlan = plan;
    console.log(`[TETYANA] ⚡ Taking control of Plan ${plan.id} (${plan.steps.length} steps) [Engine: ${usePythonBridge ? "HYBRID (Python+Native)" : "NATIVE"}]`);
    await this.startVisionObservation(plan.goal);
    const registry = getToolRegistry();
    if (!usePythonBridge && registry.isInitialized()) {
      const validation = registry.validatePlanTools(plan.steps);
      if (!validation.valid) {
        const errorDetail = validation.errors.map((err) => {
          const toolName = err.replace("Unknown tool: '", "").replace("'", "");
          const similar = registry.findSimilarTools(toolName);
          return similar.length > 0 ? `${err}. Did you mean: ${similar.join(", ")}?` : err;
        }).join("; ");
        console.error(`[TETYANA] ❌ Plan validation failed: ${errorDetail}`);
        this.emitStatus("error", `Невідомі інструменти: ${errorDetail}`);
        throw new Error(`Plan validation failed: ${errorDetail}`);
      }
      console.log(`[TETYANA] ✅ All ${plan.steps.length} tools validated`);
    } else if (!usePythonBridge) {
      console.warn("[TETYANA] ⚠️ ToolRegistry not initialized, skipping validation");
    }
    try {
      for (let i = 0; i < plan.steps.length; i++) {
        if (!this.active)
          break;
        const step = plan.steps[i];
        const stepNum = i + 1;
        console.log(`[TETYANA] ▶️ Step ${stepNum}: ${step.action}`);
        if (plan.steps.length > 3 && i === 0) {
          this.emitStatus("thinking", "🤔 Аналізую план дій (Gemini 3)...");
          await this.consultReasoning(plan);
        }
        const vision = this.visionService || getGrishaVisionService();
        vision.pauseCapture();
        let appName = step.args?.appName || step.args?.app || step.args?.name || step.args?.application;
        if (!appName && (step.action === "open_application" || step.action === "open" || step.action === "launch")) {
          appName = step.args?.arg1 || step.args?.target;
        }
        const stepDescription = step.description;
        if (!appName && stepDescription) {
          const descMatch = stepDescription.match(/(?:відкрити|open|launch|в програмі|in)\s+([A-Za-zА-Яа-яіІїЇєЄ0-9]+)/i);
          if (descMatch) {
            appName = descMatch[1];
          }
        }
        if (appName) {
          console.log(`[TETYANA] 🎯 Targeting window: ${appName}`);
          this.lastActiveApp = appName;
          await vision.autoSelectSource(appName);
        } else if (this.lastActiveApp) {
          console.log(`[TETYANA] 👁️ Continuing to watch: ${this.lastActiveApp}`);
        }
        await this.validateStep(step, stepNum);
        let result;
        if (usePythonBridge) {
          result = await this.executeStepViaBridge(step, stepNum);
        } else {
          result = await this.executeStep(step, stepNum);
        }
        vision.resumeCapture();
        const visionResult = await this.verifyStepWithVision(step, stepNum);
        if (visionResult && !visionResult.verified && visionResult.type === "alert") {
          console.warn(`[TETYANA] ⚠️ Vision alert: ${visionResult.message}`);
          this.emitStatus("warning", `Grisha: ${visionResult.message}`);
        }
        this.emitStatus("progress", `Крок ${stepNum} виконано: ${step.action}`);
      }
      this.stopVisionObservation();
      if (this.active) {
        this.emitStatus("completed", `План успішно завершено.`);
      }
    } catch (error) {
      console.error(`[TETYANA] 💥 Execution Failed: ${error.message}`);
      this.stopVisionObservation();
      this.handleFailure(error, plan);
    } finally {
      this.active = false;
      this.currentPlan = null;
    }
  }
  /**
   * Stop current execution
   */
  stop() {
    if (this.active) {
      console.log("[TETYANA] 🛑 Emergency Stop requested");
      this.active = false;
      this.stopVisionObservation();
      this.emitStatus("stopped", "Виконання зупинено.");
    }
  }
  /**
   * Start Vision observation for the plan
   */
  async startVisionObservation(goal) {
    const vision = this.visionService || getGrishaVisionService();
    const config2 = getVisionConfig();
    console.log(`[TETYANA] 👁️ Starting Vision observation[${config2.mode.toUpperCase()}]`);
    try {
      await vision.startObservation(goal);
    } catch (e) {
      console.warn("[TETYANA] Vision observation failed to start:", e);
    }
  }
  /**
   * Stop Vision observation
   */
  stopVisionObservation() {
    const vision = this.visionService || getGrishaVisionService();
    vision.stopObservation();
  }
  /**
   * Verify step with Vision (Grisha sees if it worked)
   */
  async verifyStepWithVision(step, stepNum) {
    const vision = this.visionService || getGrishaVisionService();
    try {
      const result = await vision.verifyStep(
        step.action,
        `Крок ${stepNum}: ${JSON.stringify(step.args || {})}`
      );
      return result;
    } catch (e) {
      console.warn("[TETYANA] Vision verification failed:", e);
      return null;
    }
  }
  /**
   * Consult the Reasoning Organ (Gemini 3)
   */
  async consultReasoning(plan) {
    return new Promise((resolve, reject) => {
      console.log(`[TETYANA] 🧠 Consulting Reasoning Organ...`);
      const reqId = `reason-${Date.now()}`;
      const handler = (packet2) => {
        if (packet2.instruction.intent === PacketIntent.RESPONSE && packet2.nexus.correlation_id === reqId) {
          this.core.removeListener("ingest", handlerWrapper);
          console.log(`[TETYANA] 🧠 Advice Received:`, packet2.payload.result);
          resolve();
        }
      };
      const handlerWrapper = (p) => handler(p);
      this.core.on("ingest", handlerWrapper);
      const packet = createPacket(
        "kontur://organ/tetyana",
        "kontur://organ/reasoning",
        PacketIntent.CMD,
        {
          prompt: `Review this plan for safety and efficiency: ${JSON.stringify(plan.steps.map((s) => s.action))}`,
          level: "high"
        }
      );
      packet.nexus.correlation_id = reqId;
      packet.instruction.op_code = "think";
      packet.route.reply_to = "kontur://organ/tetyana";
      this.core.ingest(packet);
      setTimeout(() => {
        this.core.removeListener("ingest", handlerWrapper);
        console.warn("[TETYANA] 🧠 Reasoning Timeout. Proceeding anyway.");
        resolve();
      }, 15e3);
    });
  }
  /**
   * Ask Grisha for permission
   */
  async validateStep(step, stepNum) {
    return new Promise((resolve, reject) => {
      console.log(`[TETYANA] 🛡️ Asking Grisha to validate step ${stepNum}...`);
      const verifId = `verif-${Date.now()}-${Math.random()}`;
      const responseHandler = (packet2) => {
        if (packet2.instruction.intent === PacketIntent.RESPONSE && packet2.nexus.correlation_id === verifId) {
          this.core.removeListener("ingest", responseHandlerWrapper);
          if (packet2.payload.allowed) {
            console.log(`[TETYANA] ✅ Grisha Approved.`);
            resolve();
          } else {
            reject(new Error(`Security Restriction: ${packet2.payload.reason}`));
          }
        }
      };
      const responseHandlerWrapper = (p) => responseHandler(p);
      this.core.on("ingest", responseHandlerWrapper);
      const packet = createPacket(
        "kontur://organ/tetyana",
        "kontur://organ/grisha",
        // Assuming Grisha listens here
        PacketIntent.QUERY,
        {
          action: step.action,
          args: step.args,
          stepNum
        }
      );
      packet.instruction.op_code = "VALIDATE";
      packet.route.reply_to = "kontur://organ/tetyana";
      packet.nexus.correlation_id = verifId;
      this.core.ingest(packet);
      setTimeout(() => {
        this.core.removeListener("ingest", responseHandlerWrapper);
        if (process.env.NODE_ENV === "development") {
          console.warn("[TETYANA] ⚠️ Grisha Timeout. Proceeding (DEV MODE).");
          resolve();
        } else {
          reject(new Error("Security validation timeout - operation rejected"));
        }
      }, 5e3);
    });
  }
  /**
   * Send command to System/Writer and wait for result
   */
  async executeStep(step, stepNum) {
    return new Promise((resolve, reject) => {
      const cmdId = `cmd-${Date.now()}-${Math.random()}`;
      this.pendingRequests.set(cmdId, { resolve, reject });
      const registry = getToolRegistry();
      const toolName = step.tool || step.action;
      const targetURI = registry.getToolTarget(toolName);
      if (!targetURI) {
        this.pendingRequests.delete(cmdId);
        reject(new Error(`Tool execution failed: No target URI found for tool '${toolName}'. Is it registered?`));
        return;
      }
      console.log(`[TETYANA] 🚀 Executing '${toolName}' via ${targetURI} (ID: ${cmdId})`);
      const packet = createPacket(
        "kontur://organ/tetyana",
        targetURI,
        PacketIntent.CMD,
        step.args || {}
      );
      packet.instruction.op_code = toolName;
      packet.route.reply_to = "kontur://organ/tetyana";
      packet.nexus.correlation_id = cmdId;
      this.core.ingest(packet);
    });
  }
  // Map to store pending command promises
  pendingRequests = /* @__PURE__ */ new Map();
  /**
   * Called by TetyanaCapsule when a packet arrives for Tetyana
   */
  handleIncomingPacket(packet) {
    const correlationId = packet.nexus.correlation_id;
    if (correlationId && this.pendingRequests.has(correlationId)) {
      const promise = this.pendingRequests.get(correlationId);
      if (packet.instruction.intent === PacketIntent.ERROR) {
        promise.reject(new Error(packet.payload.msg || "Unknown Error"));
      } else {
        promise.resolve(packet.payload);
      }
      this.pendingRequests.delete(correlationId);
    }
  }
  handleFailure(error, plan) {
    const replanPacket = createPacket(
      "kontur://organ/tetyana",
      "kontur://cortex/ai/main",
      PacketIntent.QUERY,
      {
        original_goal: plan.goal,
        error: error.message,
        context: { failure_reason: "Tetyana Execution Failed" }
      }
    );
    replanPacket.payload.prompt = `PLAN FAILED. Goal: "${plan.goal}". Error: ${error.message}. Fix it.`;
    this.core.ingest(replanPacket);
    this.emitStatus("error", `Помилка: ${error.message}. Запит нового плану...`);
  }
  emitStatus(type, msg) {
    const packet = createPacket(
      "kontur://organ/tetyana",
      "kontur://organ/ui/shell",
      // Send to UI
      PacketIntent.EVENT,
      { type, msg }
    );
    this.core.ingest(packet);
  }
  /**
   * Execute a SINGLE step via Python Bridge
   */
  async executeStepViaBridge(step, stepNum) {
    return new Promise(async (resolve, reject) => {
      console.log(`[TETYANA] 🐍 Executing Step ${stepNum} via Python Bridge: ${step.action}`);
      const bridge = new OpenInterpreterBridge();
      if (!OpenInterpreterBridge.checkEnvironment()) {
        reject(new Error("Python environment not found"));
        return;
      }
      const fullPlanContext = this.currentPlan?.steps.map(
        (s, i) => `Step ${i + 1}: ${s.action} ${JSON.stringify(s.args || {})}`
      ).join("\n");
      const stepPrompt = `
CONTEXT:
The user wants to: "${this.currentPlan?.goal}"
Full Plan:
${fullPlanContext}

CURRENT TASK:
You are currently executing Step ${stepNum}.
Task: ${step.action}
Arguments: ${JSON.stringify(step.args)}

INSTRUCTIONS:
1. Do not execute previous or future steps.
2. Do not ask for confirmation.
3. You have full permission to control the OS (open apps, type text, use mouse).
4. Use AppleScript (osascript) via python 'subprocess' or 'os.system' to open applications or control UI if needed.
5. For "TextEditor", assume "TextEdit" on macOS.
6. Write and run the python code to perform this specific action immediately.
7. IMPORTANT: If interacting with an app (typing, clicking), ALWAYS activate/focus the window first using AppleScript: 'tell application "AppName" to activate'. Use the app name from the context or arguments.
8. FOR FILE OPERATIONS: Use standard python 'os' and 'shutil' modules. DO NOT use AppleScript (Finder) for creating, moving, or listing files as it triggers permission errors.`;
      try {
        this.core.emit("tetyana:log", { message: `[Bridge] Executing Step ${stepNum}...` });
        const result = await bridge.execute(stepPrompt);
        this.core.emit("tetyana:log", { message: `[Bridge] Step ${stepNum} Done.` });
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
  }
  speak(text) {
    const packet = createPacket(
      "kontur://organ/tetyana",
      "kontur://organ/ui/shell",
      PacketIntent.EVENT,
      { type: "chat", msg: text }
    );
    this.core.ingest(packet);
  }
}
class TetyanaCapsule {
  forge;
  voice;
  brain;
  executor;
  // Public for deep integration wiring
  constructor(forge, voice, brain, core) {
    this.forge = forge;
    this.voice = voice;
    this.brain = brain;
    if (core) {
      this.executor = new TetyanaExecutor(core);
    } else {
      console.warn("TETYANA: Core not provided in constructor. Executor detached.");
      this.executor = new TetyanaExecutor({ ingest: () => {
      } });
    }
  }
  /**
   * Handle incoming KPP Packet (The Nervous Handshake)
   */
  processPacket(packet) {
    if (packet.instruction.intent === PacketIntent.AI_PLAN && packet.payload.steps) {
      console.log("[TETYANA] 📜 Received Plan via Packet");
      const plan = {
        id: packet.nexus.uid,
        goal: packet.payload.goal || "Execution",
        steps: packet.payload.steps,
        user_response_ua: packet.payload.user_response_ua,
        status: "pending"
      };
      this.executor.execute(plan);
      return;
    }
    if (packet.instruction.intent === PacketIntent.RESPONSE || packet.instruction.intent === PacketIntent.ERROR) {
      this.executor.handleIncomingPacket(packet);
    }
  }
  // --- Legacy API Methods (kept for contract compliance, but wrapping executor logic where possible) ---
  async execute(args) {
    console.log(`TETYANA: Direct Execute Call ${args.tool}`);
    await this.voice.speak({ text: `Executing ${args.tool}`, voice: "tetyana" });
    const output = await this.forge.execute({ tool_name: args.tool, args: args.args });
    return { success: true, output };
  }
  async forge_tool(args) {
    console.log(`TETYANA: Forging tool ${args.name}...`);
    const persona = getPersona("TETYANA");
    const response = await this.brain.think({
      system_prompt: `${persona.systemPrompt}

Generate a TypeScript tool named "${args.name}". Return ONLY the code.`,
      user_prompt: `Spec: ${args.spec}`
    });
    const result = await this.forge.synthesize({
      name: args.name,
      description: "Auto-generated by Tetyana via Brain",
      code: response.text || "// Error generating code"
    });
    return result.path || "";
  }
}
const CODE_INJECTION_POLICY = [
  {
    name: "eval_execution",
    severity: "critical",
    patterns: [/eval\s*\(/gi, /Function\s*\(/gi],
    description: "Direct code evaluation - highest risk",
    mitigation: "Use safer alternatives like Function constructor with sandboxing"
  },
  {
    name: "exec_execution",
    severity: "critical",
    patterns: [/exec\s*\(/gi, /system\s*\(/gi],
    description: "System command execution",
    mitigation: "Restrict to whitelisted commands only"
  },
  {
    name: "require_dynamic",
    severity: "high",
    patterns: [/require\s*\(/gi],
    description: "Dynamic module loading from user input",
    mitigation: "Validate module names against whitelist"
  },
  {
    name: "import_dynamic",
    severity: "high",
    patterns: [/import\s*\(/gi],
    description: "Dynamic ES6 imports from user input",
    mitigation: "Validate module names against whitelist"
  }
];
const FILE_SYSTEM_POLICY = [
  {
    name: "delete_system_files",
    severity: "critical",
    patterns: [
      /rm\s+-rf\s+\//gi,
      /rm\s+-rf\s+\/.*\//gi,
      /unlink\s*\(\s*['"`]\/[^'"`]*['"`]\s*\)/gi,
      /rmSync\s*\(\s*['"`]\/[^'"`]*['"`]\s*\)/gi
    ],
    description: "Attempting to delete system directories",
    mitigation: "Block all operations on system paths"
  },
  {
    name: "delete_application_files",
    severity: "high",
    patterns: [
      /rm\s+-rf\s+\./gi,
      /unlink\s*\(\s*['"`]\./gi,
      /rmSync\s*\(\s*['"`]\./gi
    ],
    description: "Attempting to delete application files",
    mitigation: "Restrict to sandboxed temporary directories"
  },
  {
    name: "write_privileged_files",
    severity: "high",
    patterns: [
      /\/etc\//gi,
      /\/root\//gi,
      /\/sys\//gi,
      /\/proc\//gi,
      /writeFileSync\s*\(\s*['"`]\/(etc|root|sys|proc)[^'"`]*['"`]/gi
    ],
    description: "Attempting to write to system files",
    mitigation: "Restrict write operations to app directories only"
  }
];
const NETWORK_POLICY = [
  {
    name: "external_callback",
    severity: "high",
    patterns: [
      /fetch\s*\(\s*['"`]https?:\/\/[^'"`]*attacker[^'"`]*['"`]/gi,
      /fetch\s*\(\s*['"`]https?:\/\/[^'"`]*exfil[^'"`]*['"`]/gi,
      /socket\.connect\s*\(\s*['"`][^'"`]*['"`]/gi
    ],
    description: "Attempting to establish external callbacks",
    mitigation: "Block outbound connections to non-whitelisted domains"
  },
  {
    name: "data_exfiltration",
    severity: "high",
    patterns: [
      /POST.*sensit/gi,
      /POST.*secret/gi,
      /POST.*token/gi,
      /POST.*api.key/gi
    ],
    description: "Suspicious data exfiltration patterns",
    mitigation: "Monitor and log all data transmissions"
  }
];
const RESOURCE_POLICY = [
  {
    name: "infinite_loop",
    severity: "high",
    patterns: [
      /while\s*\(\s*true\s*\)/gi,
      /for\s*\(\s*;\s*;\s*\)/gi,
      /setInterval\s*\([^,]*,\s*0\s*\)/gi
    ],
    description: "Infinite loops causing DoS",
    mitigation: "Implement execution timeout limits"
  },
  {
    name: "memory_bomb",
    severity: "high",
    patterns: [
      /new\s+Array\s*\(\s*\d{7,}\s*\)/gi,
      /Buffer\.alloc\s*\(\s*\d{8,}\s*\)/gi,
      /new\s+Uint8Array\s*\(\s*\d{8,}\s*\)/gi
    ],
    description: "Excessive memory allocation",
    mitigation: "Limit memory allocations per request"
  },
  {
    name: "cpu_bomb",
    severity: "high",
    patterns: [
      /crypto\.pbkdf2Sync\s*\([^,]*,\s*[^,]*,\s*\d{6,}/gi,
      /bcrypt\.hashSync.*10[0-9]/gi
    ],
    description: "Expensive computational operations",
    mitigation: "Limit computational complexity"
  }
];
const PRIVILEGE_POLICY = [
  {
    name: "sudo_execution",
    severity: "critical",
    patterns: [/sudo\s+/gi, /execSync\s*\(\s*['"`]sudo/gi],
    description: "Attempting privilege escalation with sudo",
    mitigation: "Block all sudo usage"
  },
  {
    name: "chmod_abuse",
    severity: "high",
    patterns: [/chmod\s+777/gi, /chmod\s+755\s+\/etc/gi],
    description: "Attempting to change file permissions",
    mitigation: "Restrict chmod operations"
  }
];
const ATLAS_SECURITY_POLICY = {
  name: "Atlas11 Security Policy",
  description: "Default security policy for autonomous system operations",
  threats: [
    ...CODE_INJECTION_POLICY,
    ...FILE_SYSTEM_POLICY,
    ...NETWORK_POLICY,
    ...RESOURCE_POLICY,
    ...PRIVILEGE_POLICY
  ],
  allowlistedOperations: [
    "read_file",
    "write_temp_file",
    "execute_safe_tool",
    "api_call_whitelisted",
    "memory_store",
    "memory_recall",
    "brain_query",
    "log_event"
  ]
};
function analyzeThreat(content, patterns) {
  const threatsFound = [];
  let maxSeverity = "low";
  let riskScore = 0;
  for (const pattern of patterns) {
    const matches = [];
    for (const regex of pattern.patterns) {
      const regexMatches = content.match(regex);
      if (regexMatches) {
        matches.push(...regexMatches);
      }
    }
    if (matches.length > 0) {
      threatsFound.push({ pattern, matches });
      const severityScore = {
        [
          "low"
          /* SAFE */
        ]: 0,
        [
          "medium"
          /* WARNING */
        ]: 10,
        [
          "high"
          /* DANGER */
        ]: 50,
        [
          "critical"
          /* CRITICAL */
        ]: 100
      };
      riskScore += severityScore[pattern.severity] * matches.length;
      const severityOrder = [
        "low",
        "medium",
        "high",
        "critical"
        /* CRITICAL */
      ];
      if (severityOrder.indexOf(pattern.severity) > severityOrder.indexOf(maxSeverity)) {
        maxSeverity = pattern.severity;
      }
    }
  }
  return {
    threatsFound,
    maxSeverity,
    riskScore: Math.min(riskScore, 100)
  };
}
function validateOperation(operation, params, policy = ATLAS_SECURITY_POLICY) {
  if (policy.allowlistedOperations.includes(operation)) {
    return { allowed: true };
  }
  const operationStr = `${operation}(${JSON.stringify(params)})`;
  const analysis = analyzeThreat(operationStr, policy.threats);
  if (analysis.threatsFound.length === 0) {
    return { allowed: true };
  }
  const threatsDescription = analysis.threatsFound.map((t2) => `${t2.pattern.name} (${t2.pattern.severity})`).join(", ");
  return {
    allowed: false,
    reason: `Security threat detected: ${threatsDescription}`,
    riskLevel: analysis.maxSeverity
  };
}
class GrishaVision {
  genAI;
  constructor(apiKey = "") {
    this.genAI = new generativeAi.GoogleGenerativeAI(apiKey || "mock-key");
  }
  /**
   * Analyze screenshot for visual anomalies
   * Returns report of detected anomalies
   */
  async analyzeScreenshot(screenshotBase64) {
    console.log("👁️ GRISHA: Analyzing screenshot for anomalies...");
    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp"
    });
    try {
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: "image/png",
            data: screenshotBase64
          }
        },
        {
          text: `You are GRISHA, the Guardian of the ATLAS System. verify the safety and state of this UI.
          
          Analyze for:
          1. SECURITY: Phishing, fake dialogs, credential harvesting.
          2. ERRORS: Application crash dialogs, error popups, "Something went wrong" screens.
          3. BLOCKERS: Popups blocking the main view (e.g. "Update Available").
          4. CONTEXT: Does this look like a normal application state?
          
          Return JSON: {
            "anomalies": [
              { "type": "string", "severity": "low|medium|high", "description": "string", "location": "string" }
            ],
            "confidence": 0.0-1.0,
            "recommendations": ["string"]
          }
          
          If you see an Error Dialog or Blocker, mark it as HIGH severity to stop Tetyana.`
        }
      ]);
      const response = await result.response;
      const text = response.text();
      let report = {
        anomaliesDetected: false,
        confidence: 0,
        anomalies: [],
        recommendations: [],
        timestamp: Date.now()
      };
      try {
        const parsed = JSON.parse(text);
        report.anomalies = parsed.anomalies || [];
        report.confidence = parsed.confidence || 0;
        report.recommendations = parsed.recommendations || [];
        report.anomaliesDetected = report.anomalies.length > 0;
      } catch (e) {
        console.warn("👁️ GRISHA: Failed to parse vision response", e);
        report.anomaliesDetected = true;
        report.anomalies.push({
          type: "parse_error",
          severity: "medium",
          description: `Vision analysis returned unparseable response: ${text.substring(0, 100)}`
        });
      }
      if (report.anomaliesDetected) {
        console.warn(
          `👁️ GRISHA: ${report.anomalies.length} anomalies detected with ${Math.round(report.confidence * 100)}% confidence`
        );
      } else {
        console.log("👁️ GRISHA: No anomalies detected");
      }
      return report;
    } catch (error) {
      console.error("👁️ GRISHA: Vision analysis failed", error);
      return {
        anomaliesDetected: true,
        confidence: 0.8,
        anomalies: [
          {
            type: "vision_service_error",
            severity: "high",
            description: `Vision service error: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ],
        recommendations: ["Check API key", "Verify image format", "Retry analysis"],
        timestamp: Date.now()
      };
    }
  }
  /**
   * Detect UI anomalies (simulated for now)
   * In production, would call analyzeScreenshot
   */
  async detectUIAnomalies(uiElements) {
    console.log("👁️ GRISHA: Analyzing UI elements for anomalies...");
    const anomalies = [];
    let confidence = 0.5;
    for (const el of uiElements) {
      if (el.type === "dialog" && el.width > 800 && el.height > 600) {
        anomalies.push({
          type: "large_dialog",
          severity: "medium",
          description: "Large dialog window detected - potential phishing",
          location: `(${el.x}, ${el.y})`
        });
        confidence += 0.2;
      }
      if (el.type === "input" && el.width > 500) {
        anomalies.push({
          type: "credential_field",
          severity: "high",
          description: "Large input field detected - potential credential harvesting",
          location: `(${el.x}, ${el.y})`
        });
        confidence += 0.3;
      }
      if (el.type === "button" && el.width > 200) {
        anomalies.push({
          type: "oversized_button",
          severity: "low",
          description: "Oversized button - potential clickjacking",
          location: `(${el.x}, ${el.y})`
        });
        confidence += 0.1;
      }
    }
    confidence = Math.min(confidence, 1);
    return {
      anomaliesDetected: anomalies.length > 0,
      confidence,
      anomalies,
      recommendations: [
        anomalies.length > 0 ? "Review UI elements for security" : "UI elements appear normal",
        "Monitor for further suspicious activity"
      ],
      timestamp: Date.now()
    };
  }
  /**
   * Detect resource exhaustion visually
   */
  async detectResourceAnomalies(metrics) {
    console.log("👁️ GRISHA: Analyzing resource usage for anomalies...");
    const anomalies = [];
    let confidence = 0;
    if (metrics.cpuUsage > 90) {
      anomalies.push({
        type: "high_cpu",
        severity: "high",
        description: `CPU usage extremely high: ${metrics.cpuUsage}% - possible DoS or crypto mining`
      });
      confidence += 0.4;
    } else if (metrics.cpuUsage > 70) {
      anomalies.push({
        type: "elevated_cpu",
        severity: "medium",
        description: `CPU usage elevated: ${metrics.cpuUsage}% - monitor for runaway processes`
      });
      confidence += 0.2;
    }
    if (metrics.memoryUsage > 90) {
      anomalies.push({
        type: "high_memory",
        severity: "high",
        description: `Memory usage extremely high: ${metrics.memoryUsage}% - possible memory bomb`
      });
      confidence += 0.4;
    } else if (metrics.memoryUsage > 75) {
      anomalies.push({
        type: "elevated_memory",
        severity: "medium",
        description: `Memory usage elevated: ${metrics.memoryUsage}% - memory leak suspected`
      });
      confidence += 0.2;
    }
    if (metrics.diskUsage > 95) {
      anomalies.push({
        type: "disk_full",
        severity: "high",
        description: `Disk nearly full: ${metrics.diskUsage}% - data exfiltration risk`
      });
      confidence += 0.3;
    }
    confidence = Math.min(confidence, 1);
    return {
      anomaliesDetected: anomalies.length > 0,
      confidence,
      anomalies,
      recommendations: [
        anomalies.length > 0 ? "Take immediate action on resource issues" : "Resource usage normal",
        "Enable resource monitoring",
        "Set up alerts for resource thresholds"
      ],
      timestamp: Date.now()
    };
  }
}
function createGrishaVision(apiKey) {
  return new GrishaVision(apiKey);
}
class GrishaCapsule {
  brain;
  vision;
  core = null;
  // Opsu optional for now until we inject it
  auditLog = [];
  threatHistory = /* @__PURE__ */ new Map();
  lastVisualAnalysis = null;
  constructor(brain, core) {
    this.brain = brain;
    this.core = core || null;
    this.vision = createGrishaVision(process.env.GOOGLE_API_KEY);
    console.log("🛡️ GrishaCapsule: Real security implementation initialized with vision oversight");
  }
  /**
   * Handle incoming KPP Packet
   */
  processPacket(packet) {
    if (packet.instruction.op_code === "VALIDATE" && packet.instruction.intent === PacketIntent.QUERY) {
      console.log(`[GRISHA] 🛡️ Validating Packet from ${packet.route.from}`);
      this.handleValidationRequest(packet);
    }
  }
  async handleValidationRequest(packet) {
    const { action, args, stepNum } = packet.payload;
    if (["mouse_click", "ui_action", "keyboard_type", "open_application"].includes(action)) {
      console.log(`[GRISHA] 👁️ Visual Verification triggered for ${action}`);
      try {
        let sourceId = void 0;
        if (args.appName) {
          try {
            const sourcesRes = await this.executeTool("kontur://organ/vision", "get_sources", {});
            if (sourcesRes.sources) {
              const match = sourcesRes.sources.find(
                (s) => s.name.toLowerCase().includes(args.appName.toLowerCase())
              );
              if (match) {
                sourceId = match.id;
                console.log(`[GRISHA] 🎯 Switching vision focus to window: ${match.name}`);
              }
            }
          } catch (err) {
            console.warn("[GRISHA] Failed to resolve sources:", err);
          }
        }
        const visionRes = await this.executeTool("kontur://organ/vision", "capture", { sourceId });
        if (visionRes && visionRes.image) {
          const base64 = visionRes.image;
          const visionReport = await this.vision.analyzeScreenshot(base64);
          this.lastVisualAnalysis = visionReport;
          if (visionReport.anomaliesDetected) {
            const highSeveiry = visionReport.anomalies.some((a) => a.severity === "high");
            if (highSeveiry) {
              console.warn(`[GRISHA] 🛑 BLOCKING ${action} due to Visual Threat`);
              this.sendResponse(packet, false, `Visual Threat Detected: ${visionReport.anomalies[0].description}`);
              return;
            }
          }
        }
      } catch (e) {
        console.warn(`[GRISHA] ⚠️ Visual Check Failed: ${e.message}. Proceeding with caution.`);
      }
    }
    const result = await this.audit({ action, params: args });
    this.sendResponse(packet, result.allowed, result.reason);
  }
  sendResponse(originalPacket, allowed, reason) {
    if (this.core) {
      const response = createPacket(
        "kontur://organ/grisha",
        originalPacket.route.from,
        PacketIntent.RESPONSE,
        {
          allowed,
          reason,
          stepNum: originalPacket.payload.stepNum
        }
      );
      response.route.reply_to = originalPacket.route.reply_to;
      response.nexus.correlation_id = originalPacket.nexus.correlation_id;
      this.core.ingest(response);
      console.log(`[GRISHA] 🛡️ Verdict Sent: ${allowed ? "APPROVED" : "DENIED"} for ${originalPacket.payload.action}`);
    }
  }
  /**
   * Helper to execute tool via Core (similar to Tetyana)
   */
  async executeTool(urn, tool, args) {
    return new Promise((resolve, reject) => {
      if (!this.core)
        return reject(new Error("No Core"));
      const cmdId = `grisha-cmd-${Date.now()}`;
      const wrapper = (p) => {
        if (p.route.to === "kontur://organ/grisha" && p.route.reply_to === cmdId) {
          this.core?.removeListener("ingest", wrapper);
          resolve(p.payload);
        }
      };
      this.core.on("ingest", wrapper);
      const packet = createPacket("kontur://organ/grisha", urn, PacketIntent.CMD, args);
      packet.instruction.op_code = tool;
      packet.route.reply_to = cmdId;
      this.core.ingest(packet);
      setTimeout(() => {
        this.core?.removeListener("ingest", wrapper);
        reject(new Error("Tool Timeout"));
      }, 5e3);
    });
  }
  async observe() {
    console.log("🛡️ GRISHA: Observing system state via Brain and Vision...");
    const recentThreats = this.auditLog.filter((entry) => !entry.allowed).slice(-5).map((entry) => entry.reason || "Unknown threat");
    const visualThreats = [];
    if (this.lastVisualAnalysis?.anomaliesDetected) {
      visualThreats.push(
        ...this.lastVisualAnalysis.anomalies.map(
          (a) => `${a.type} (${a.severity}): ${a.description}`
        )
      );
    }
    const allThreats = [...recentThreats, ...visualThreats];
    const threatLevel = allThreats.length > 3 ? "high" : allThreats.length > 0 ? "medium" : "low";
    const context = `Audit log: ${this.auditLog.length} ops. Recent threats: ${allThreats.join("; ") || "None detected"}`;
    const persona = getPersona("GRISHA");
    const response = await this.brain.think({
      system_prompt: `${persona.systemPrompt}

Assess system security threats. Return JSON: { threats: string[], level: 'low'|'medium'|'high' }.`,
      user_prompt: `Context: ${context}`
    });
    let report = {
      threats: allThreats,
      level: threatLevel,
      timestamp: Date.now()
    };
    try {
      let result = {};
      const rawText = response.text || "";
      try {
        result = JSON.parse(rawText);
      } catch {
        const jsonMatch = rawText.match(/\{[\s\S]*"threats"[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          const threatKeywords = ["threat", "danger", "risk", "warning", "attack", "suspicious"];
          const foundThreats = threatKeywords.filter((kw) => rawText.toLowerCase().includes(kw));
          if (foundThreats.length > 0) {
            result = { threats: [`Detected keywords: ${foundThreats.join(", ")}`], level: "medium" };
          }
          console.log("🛡️ GRISHA: Brain returned non-JSON, using fallback analysis.");
        }
      }
      report.threats = result.threats || allThreats;
      report.level = result.level || threatLevel;
    } catch (e) {
      console.warn("🛡️ GRISHA: Failed to parse Brain response, using collected data.", e);
    }
    if (report.level !== "low") {
      synapse.emit("grisha", "threat_detected", {
        level: report.level,
        description: report.threats.join(", ")
      });
    }
    return report;
  }
  async audit(args) {
    console.log(`🛡️ GRISHA: Auditing action "${args.action}"`);
    const validation = validateOperation(args.action, args.params, ATLAS_SECURITY_POLICY);
    const auditEntry = {
      timestamp: Date.now(),
      action: args.action,
      allowed: validation.allowed,
      reason: validation.reason,
      riskLevel: validation.riskLevel
    };
    this.auditLog.push(auditEntry);
    if (!validation.allowed) {
      const key = `${args.action}:${validation.riskLevel}`;
      this.threatHistory.set(key, (this.threatHistory.get(key) || 0) + 1);
      console.warn(`🛡️ GRISHA: BLOCKED - ${validation.reason}`);
    } else {
      console.log(`🛡️ GRISHA: ALLOWED - ${args.action}`);
    }
    return {
      allowed: validation.allowed,
      reason: validation.reason
    };
  }
  /**
   * Analyze screenshot for visual anomalies
   */
  async analyzeScreenshot(screenshotBase64) {
    console.log("🛡️ GRISHA: Analyzing screenshot for visual threats...");
    this.lastVisualAnalysis = await this.vision.analyzeScreenshot(screenshotBase64);
    if (this.lastVisualAnalysis.anomaliesDetected) {
      synapse.emit("grisha", "visual_anomaly", {
        anomalies: this.lastVisualAnalysis.anomalies,
        confidence: this.lastVisualAnalysis.confidence
      });
    }
    return this.lastVisualAnalysis;
  }
  /**
   * Get security report
   */
  async getSecurityReport() {
    const blockedOps = this.auditLog.filter((e) => !e.allowed).length;
    const topThreats = Array.from(this.threatHistory.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([threat, count]) => ({ threat, count }));
    return {
      auditLogSize: this.auditLog.length,
      blockedOperations: blockedOps,
      threatLevel: blockedOps > 5 ? "high" : blockedOps > 2 ? "medium" : "low",
      topThreats,
      visualAnomalies: this.lastVisualAnalysis?.anomalies.length || 0
    };
  }
  /**
   * Clear old audit logs (keep only last N entries)
   */
  pruneAuditLog(keepLast = 100) {
    if (this.auditLog.length > keepLast) {
      this.auditLog = this.auditLog.slice(-keepLast);
      console.log(`🛡️ GRISHA: Pruned audit log to ${keepLast} entries`);
    }
  }
}
class ReasoningCapsule {
  core;
  lastThoughtSignature;
  constructor() {
    const config2 = getProviderConfig("reasoning");
    console.log(`🧠 REASONING: ReasoningCapsule initialized with ${config2.provider} / ${config2.model}`);
  }
  register(core) {
    this.core = core;
  }
  /**
   * Think deeply about a problem.
   * Uses the configured reasoning provider (Copilot, Gemini 3, etc.)
   */
  async think(prompt, level = "high") {
    console.log(`🧠 REASONING: Thinking about "${prompt.substring(0, 50)}..." (Level: ${level})`);
    try {
      const router2 = getProviderRouter();
      const config2 = getProviderConfig("reasoning");
      const response = await router2.generateLLM("reasoning", {
        prompt,
        systemPrompt: `You are a deep reasoning engine. Think step-by-step and provide thorough analysis.
Level: ${level === "high" ? "Deep, multi-step reasoning" : "Quick, efficient analysis"}`,
        model: config2.model,
        temperature: level === "high" ? 0.3 : 0.5,
        maxTokens: 4096
      });
      const text = response.text || "";
      console.log(`🧠 REASONING: Thought complete. Length: ${text.length}`);
      return text;
    } catch (error) {
      console.error("🧠 REASONING: Thinking failed", error);
      return `Error thinking: ${error.message}`;
    }
  }
  /**
   * Handle incoming KPP packets (Acting as an Organ)
   */
  async handlePacket(packet) {
    if (packet.instruction.intent === PacketIntent.CMD && packet.instruction.op_code === "think") {
      const { prompt, level } = packet.payload;
      const result = await this.think(prompt, level);
      const response = createPacket(
        "kontur://organ/reasoning",
        packet.route.from,
        PacketIntent.RESPONSE,
        { result }
      );
      response.route.reply_to = packet.route.reply_to;
      this.core?.ingest(response);
    }
  }
}
function createReasoningCapsule() {
  return new ReasoningCapsule();
}
const memories = sqliteCore.sqliteTable("memories", {
  id: sqliteCore.text("id").primaryKey(),
  // UUID
  type: sqliteCore.text("type", { enum: ["episode", "fact", "heuristic"] }).notNull(),
  content: sqliteCore.text("content").notNull(),
  embedding: sqliteCore.blob("embedding", { mode: "buffer" }),
  // For future vector search
  metadata: sqliteCore.text("metadata", { mode: "json" }),
  // Flexible JSON storage
  created_at: sqliteCore.integer("created_at", { mode: "timestamp" }).notNull().default(drizzleOrm.sql`CURRENT_TIMESTAMP`)
});
const schema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  memories
}, Symbol.toStringTag, { value: "Module" }));
const DB_PATH = path.resolve(process.cwd(), "atlas.db");
function initDB() {
  const sqlite = new Database(DB_PATH);
  const db = betterSqlite3.drizzle(sqlite, { schema });
  sqlite.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB,
        metadata TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
  return db;
}
class MemoryCapsule {
  db = initDB();
  optimizeInterval = null;
  constructor() {
    console.log("🧠 MemoryCapsule: Real implementation with Drizzle ORM initialized");
    this.optimizeInterval = setInterval(() => this.optimize(), 5 * 60 * 1e3);
  }
  async store(args) {
    console.log(`💾 MemoryCapsule: Storing ${args.type} memory: "${args.content.substring(0, 50)}..."`);
    const id = uuid.v4();
    try {
      this.db.insert(memories).values({
        id,
        type: args.type,
        content: args.content,
        metadata: args.metadata
      }).run();
      console.log(`✅ MemoryCapsule: Stored ${args.type} with id ${id}`);
    } catch (error) {
      console.error("❌ MemoryCapsule: Failed to store memory", error);
      throw error;
    }
  }
  async recall(args) {
    console.log(`🔍 MemoryCapsule: Recalling memories for "${args.query}"...`);
    const limit = args.limit || 5;
    const queryPattern = `%${args.query}%`;
    try {
      const results = this.db.select().from(memories).where(drizzleOrm.like(memories.content, queryPattern)).limit(limit).all();
      const items = results.map((r) => ({
        id: r.id,
        content: r.content,
        type: r.type,
        timestamp: r.created_at?.getTime() || Date.now(),
        metadata: r.metadata
      }));
      const summary = items.length > 0 ? `Found ${items.length} ${items[0].type} memories related to "${args.query}"` : `No memories found for "${args.query}"`;
      console.log(`✅ MemoryCapsule: Recalled ${items.length} items`);
      return { items, summary };
    } catch (error) {
      console.error("❌ MemoryCapsule: Failed to recall memories", error);
      return { items: [], summary: "Recall failed" };
    }
  }
  /**
   * Backwards-compatible wrapper for recall().
   * Returns just the items array instead of { items, summary }.
   */
  async retrieve(args) {
    const result = await this.recall(args);
    return result.items;
  }
  async optimize() {
    console.log("🔄 MemoryCapsule: Running optimization (deduplication & clustering)...");
    try {
      const allMemories = this.db.select().from(memories).all();
      const contentMap = /* @__PURE__ */ new Map();
      allMemories.forEach((m) => {
        const normalized = m.content.toLowerCase().trim();
        if (!contentMap.has(normalized)) {
          contentMap.set(normalized, []);
        }
        contentMap.get(normalized).push(m.id);
      });
      let nodesToMerge = 0;
      const idsToDelete = [];
      contentMap.forEach((ids) => {
        if (ids.length > 1) {
          const oldestId = ids[0];
          ids.slice(1).forEach((id) => {
            idsToDelete.push(id);
            nodesToMerge++;
          });
        }
      });
      if (idsToDelete.length > 0) {
        console.log(`🗑️  MemoryCapsule: Deleting ${idsToDelete.length} duplicate memories...`);
        idsToDelete.forEach((id) => {
          this.db.delete(memories).where(drizzleOrm.eq(memories.id, id)).run();
        });
      }
      const heuristics = allMemories.filter((m) => m.type === "heuristic").filter((m) => !idsToDelete.includes(m.id));
      if (heuristics.length > 3) {
        const sorted = heuristics.sort(
          (a, b) => (b.created_at?.getTime() || 0) - (a.created_at?.getTime() || 0)
        );
        sorted.slice(3).forEach((h) => {
          this.db.delete(memories).where(drizzleOrm.eq(memories.id, h.id)).run();
          nodesToMerge++;
        });
      }
      console.log(`✅ MemoryCapsule: Optimization complete. Merged ${nodesToMerge} nodes.`);
      return { nodes_merged: nodesToMerge };
    } catch (error) {
      console.error("❌ MemoryCapsule: Optimization failed", error);
      return { nodes_merged: 0 };
    }
  }
  destroy() {
    if (this.optimizeInterval) {
      clearInterval(this.optimizeInterval);
    }
    console.log("🌙 MemoryCapsule: Destroyed");
  }
}
class ForgeGhost {
  tools = /* @__PURE__ */ new Map();
  // Name -> Code
  constructor() {
    console.log("🔨 ForgeGhost Initialized");
  }
  async synthesize(args) {
    console.log(`🔨 ForgeGhost: Synthesizing tool "${args.name}"...`);
    this.tools.set(args.name, args.code);
    return {
      name: args.name,
      description: args.description,
      path: `/mock/tools/${args.name}.ts`,
      status: "verified"
    };
  }
  async validate(args) {
    const exists = this.tools.has(args.tool_name);
    return { valid: exists, error: exists ? void 0 : "Tool not found" };
  }
  async execute(args) {
    if (!this.tools.has(args.tool_name)) {
      throw new Error(`Tool ${args.tool_name} not found`);
    }
    console.log(`🔨 ForgeGhost: Executing "${args.tool_name}" with`, args.args);
    return { success: true, result: "Mock Execution Result" };
  }
}
class BrainCapsule {
  genAI;
  constructor(apiKey) {
    if (!apiKey) {
      console.warn("⚠️ BrainCapsule initialized without API Key! Will fail on real requests.");
    }
    this.genAI = new generativeAi.GoogleGenerativeAI(apiKey || "mock-key");
  }
  async think(args) {
    console.log(`🧠 BrainCapsule: calling ${args.model || "default model"}`);
    try {
      const model = this.genAI.getGenerativeModel({
        model: args.model || process.env.GEMINI_MODEL || "gemini-2.5-flash",
        systemInstruction: args.system_prompt
      });
      const result = await model.generateContent(args.user_prompt);
      const response = await result.response;
      const text = response.text();
      return {
        text,
        usage: {
          // Mock usage for now as experimental models might not return it consistently
          input_tokens: 0,
          output_tokens: 0
        }
      };
    } catch (error) {
      console.error("🧠 BrainCapsule Error:", error);
      return { text: `Error: ${error.message}` };
    }
  }
}
class VoiceCapsule {
  apiKey;
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_LIVE_API_KEY;
    if (!this.apiKey) {
      console.warn("[VOICE CAPSULE] ⚠️ No API key found for TTS. Check GEMINI_API_KEY, GOOGLE_API_KEY, or GEMINI_LIVE_API_KEY.");
    }
    console.log("[VOICE CAPSULE] 🔊 Initialized (Using ProviderRouter)");
    getProviderRouter();
  }
  /**
  * Generate single-speaker audio from text
  * Supports both modern (text, config) and legacy ({text, voice, speed}) signatures
  */
  async speak(textOrArgs, config2 = {}) {
    const router2 = getProviderRouter();
    const MAX_RETRIES = 3;
    let text = "";
    let voiceName = config2.voiceName;
    let speed = config2.rate;
    if (typeof textOrArgs === "object" && textOrArgs !== null) {
      text = textOrArgs.text;
      voiceName = textOrArgs.voice || voiceName;
      speed = textOrArgs.speed || speed;
    } else {
      text = textOrArgs;
    }
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await router2.speak("tts", {
          text,
          voice: voiceName,
          speed
        });
        console.log(`[VOICE CAPSULE] ✅ Generated audio (Attempt ${attempt}):`, response.audio.byteLength, "bytes");
        return response.audio;
      } catch (error) {
        console.warn(`[VOICE CAPSULE] ⚠️ TTS Attempt ${attempt} failed:`, error.message);
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
    console.error("[VOICE CAPSULE] ❌ TTS failed after", MAX_RETRIES, "attempts");
    return null;
  }
  /**
   * Generate multi-speaker audio from text
   */
  async speakMulti(text, config2) {
    const router2 = getProviderRouter();
    try {
      const response = await router2.speakMulti("tts", {
        text,
        speakers: config2.speakers.map((s) => ({
          name: s.name,
          voice: s.voiceName
        }))
      });
      console.log("[VOICE CAPSULE] ✅ Generated multi-speaker audio:", response.audio.byteLength, "bytes");
      return response.audio;
    } catch (error) {
      console.error("[VOICE CAPSULE] ❌ Multi-speaker TTS error:", error.message);
      return null;
    }
  }
  /**
   * Listen for audio input (Stub for VoiceAPI compatibility).
   * In KONTUR architecture, listening is handled by STTService or GeminiLiveService directly.
   * This stub exists to satisfy Tetyana's dependency contract.
   */
  async listen(args = {}) {
    console.warn("[VOICE CAPSULE] ⚠️ listen() called but not implemented in VoiceCapsule directly.");
    console.warn("[VOICE CAPSULE] Use GeminiLiveService or STTService for audio input.");
    return { error: "Not implemented in KONTUR VoiceCapsule. Use STTService." };
  }
}
global.WebSocket = WebSocket;
class GeminiLiveService extends events.EventEmitter {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
    this.config = {
      model: "models/gemini-2.5-flash-native-audio-preview-09-2025",
      // Adding models/ prefix back
      generationConfig: {
        responseModalities: [genai.Modality.AUDIO],
        // mediaResolution removed for debug
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
          // Official voice from docs
        },
        // Context window compression for long sessions
        contextWindowCompression: {
          triggerTokens: "25600",
          slidingWindow: { targetTokens: "12800" }
        }
      },
      systemInstruction: {
        parts: [{
          text: `You are GRISHA, the Security Observer of the KONTUR system. 
                    Your job is to watch the screen stream of the autonomous agent executing tasks.
                    Speak UKRAINIAN (Українська). Be concise, analytical, and alert.
                    1. VERIFY actions: confirm when you see typing, windows opening, or commands running.
                    2. DETECT errors: If you see a terminal error or unexpected behavior, shout "ALERT" and explain.
                    3. If the task is proceeding correctly, say "Спостерігаю виконання... Норма." or "Підтверджую дію."`
        }]
      }
    };
  }
  session = null;
  _isConnected = false;
  _status = "disconnected";
  _lastError = null;
  config;
  /**
   * Connect to Gemini Live Session
   */
  async connect() {
    if (this._isConnected)
      return;
    try {
      this._status = "connecting";
      this._lastError = null;
      console.log("[GEMINI LIVE] 🔌 Connecting...");
      const genAI = new genai.GoogleGenAI({ apiKey: this.apiKey });
      const liveConfig = {
        responseModalities: [genai.Modality.AUDIO],
        // TEXT is not supported in responseModalities for Live API yet
        speechConfig: this.config.generationConfig.speechConfig,
        systemInstruction: `ВАЖЛИВО: ТИ МАЄШ ГОВОРИТИ ТІЛЬКИ УКРАЇНСЬКОЮ МОВОЮ. НІКОЛИ НЕ ВИКОРИСТОВУЙ АНГЛІЙСЬКУ.

Ти - ГРІША (GRISHA), Охоронець системи KONTUR. Твоя задача - перевіряти виконання завдань.

ПРОТОКОЛ ВІДПОВІДЕЙ (ТІЛЬКИ УКРАЇНСЬКА!):
1. Якщо дія ВИКОНАНА: Скажи коротко "Виконано: [опис]". Приклад: "Виконано: відкрито калькулятор".
2. Якщо дія НЕ виконана: Скажи "НЕ Виконано: [опис помилки]".
3. НЕ використовуй англійську мову. Всі відповіді - українською.`
      };
      this.session = await genAI.live.connect({
        model: this.config.model,
        config: liveConfig,
        callbacks: {
          onmessage: (msg) => this.handleIncomingMessage(msg),
          onerror: (err) => console.error("[GEMINI LIVE] Stream Error:", err),
          onclose: (e) => {
            const reason = e.reason || "";
            const code = e.code;
            console.log("[GEMINI LIVE] 🔌 CLOSE EVENT DUMP:", JSON.stringify({ code: e.code, reason: e.reason, wasClean: e.wasClean }, null, 2));
            console.log(`[GEMINI LIVE] 🔌 Connection closed. Code: ${code}, Reason: "${reason}"`);
            if (reason.toLowerCase().includes("expired")) {
              console.error("\n\n[CRITICAL ERROR] 🛑 GEMINI API KEY EXPIRED");
              console.error("Please renew your API key in the .env file immediately.");
              console.error("Visit: https://aistudio.google.com/app/apikey\n\n");
              this._lastError = "API_KEY_EXPIRED";
              this.emit("error", new Error("API_KEY_EXPIRED"));
            } else if (code === 1011 || reason.toLowerCase().includes("quota")) {
              console.error("\n\n[CRITICAL ERROR] 🛑 GEMINI QUOTA EXCEEDED");
              console.error("You have hit the usage limits for your API Key.");
              console.error("Please check billing/quota at: https://aistudio.google.com/app/apikey\n\n");
              this._lastError = "QUOTA_EXCEEDED";
              this.emit("error", new Error("QUOTA_EXCEEDED"));
            } else if (code === 1008 || reason.toLowerCase().includes("model")) {
              console.error("\n\n[CRITICAL ERROR] 🛑 MODEL NOT FOUND OR ACCESS DENIED");
              console.error(`Model: ${this.config.model}`);
              console.error("The preview model may require special access.\n\n");
              this._lastError = "MODEL_ACCESS_DENIED";
              this.emit("error", new Error("MODEL_ACCESS_DENIED"));
            } else if (code === 1007) {
              console.error("\n\n[CRITICAL ERROR] 🛑 INVALID ARGUMENT / CONFIGURATION");
              console.error("The configuration sent to Gemini Live API is invalid (Code 1007).");
              console.error("Checking model compatibility...\n\n");
              this._lastError = "INVALID_CONFIG";
              this.emit("error", new Error("INVALID_CONFIG"));
            } else if (reason) {
              console.warn(`[GEMINI LIVE] ⚠️ Closed with reason: ${reason}`);
            }
            this._isConnected = false;
            this._status = "error";
            this.emit("disconnected");
          }
        }
      });
      this._isConnected = true;
      this._status = "connected";
      this._lastError = null;
      console.log("[GEMINI LIVE] ✅ Connected!");
      this.emit("connected");
    } catch (error) {
      this._status = "error";
      console.error("[GEMINI LIVE] ❌ Connection failed:", error);
      this.emit("error", error);
    }
  }
  handleIncomingMessage(msg) {
    if (msg.serverContent?.turnComplete) {
      console.log("[GEMINI LIVE] ✅ Turn complete - Grisha finished speaking");
      this.emit("turnComplete");
    }
    if (msg.serverContent?.modelTurn?.parts) {
      const parts = msg.serverContent.modelTurn.parts;
      for (const part of parts) {
        if (part.inlineData) {
          console.log("[GEMINI LIVE] 🔊 Audio chunk received");
          this.emit("audio", part.inlineData.data);
        }
        if (part.text) {
          console.log(`[GRISHA LIVE]: ${part.text}`);
          this.emit("text", part.text);
        }
      }
    }
  }
  /**
   * Disconnect session
   */
  async disconnect() {
    if (this.session) {
      if (typeof this.session.close === "function") {
        await this.session.close();
      }
      this.session = null;
      this._isConnected = false;
      this._status = "disconnected";
      console.log("[GEMINI LIVE] 🔌 Disconnected");
      this.emit("disconnected");
    }
  }
  /**
   * Trigger generation with text (useful for starting conversation)
   */
  sendText(text) {
    if (!this._isConnected || !this.session)
      return;
    this.session.sendClientContent({
      turns: [{ parts: [{ text }] }]
    });
  }
  /**
   * Stream Audio Input (PCM 16kHz)
   */
  sendAudioChunk(base64Audio) {
    if (!this._isConnected || !this.session)
      return;
    this.session.sendRealtimeInput({
      audio: {
        mimeType: "audio/pcm;rate=16000",
        data: base64Audio
      }
    });
  }
  /**
   * Stream Video Frame (JPEG/PNG Base64)
   */
  sendVideoFrame(base64Image) {
    if (!this._isConnected || !this.session)
      return;
    this.session.sendRealtimeInput({
      media: {
        mimeType: "image/jpeg",
        data: base64Image
      }
    });
  }
  // ============ PUBLIC GETTERS FOR UI INDICATOR ============
  /**
   * Get current model connection status
   */
  get modelStatus() {
    return this._status;
  }
  /**
   * Get last error type if any
   */
  get errorType() {
    return this._lastError;
  }
  /**
   * Check if connected (backwards compatible)
   */
  get isConnected() {
    return this._isConnected;
  }
}
const execAsync = util.promisify(child_process.exec);
class SystemCapsule {
  constructor() {
    console.log("[SYSTEM CAPSULE] 🖥️ Initialized");
  }
  /**
   * Open an application by name
   */
  async openApp(appName) {
    try {
      console.log(`[SYSTEM CAPSULE] 🚀 Opening app: ${appName}`);
      await execAsync(`open -a "${appName}"`);
      return { success: true, message: `Opened ${appName}` };
    } catch (error) {
      console.error(`[SYSTEM CAPSULE] ❌ Failed to open ${appName}:`, error.message);
      return { success: false, message: `Failed to open ${appName}: ${error.message}` };
    }
  }
  /**
   * Run a system command (Use with caution!)
   */
  async runCommand(command) {
    try {
      console.log(`[SYSTEM CAPSULE] 💻 Running command: ${command}`);
      const { stdout, stderr } = await execAsync(command);
      return { success: true, output: stdout || stderr };
    } catch (error) {
      console.error(`[SYSTEM CAPSULE] ❌ Command failed:`, error.message);
      return { success: false, output: error.message };
    }
  }
  /**
   * Execute AppleScript
   */
  async runAppleScript(script) {
    try {
      console.log(`[SYSTEM CAPSULE] 🍎 Running AppleScript`);
      const formattedScript = script.replace(/'/g, `'"'"'`);
      const { stdout } = await execAsync(`osascript -e '${formattedScript}'`);
      return { success: true, output: stdout.trim() };
    } catch (error) {
      console.error(`[SYSTEM CAPSULE] ❌ AppleScript failed:`, error.message);
      return { success: false, output: error.message };
    }
  }
}
class DeepIntegrationSystem {
  core;
  unifiedBrain;
  synapseBridge;
  organMapper;
  atlas = null;
  tetyana = null;
  grisha = null;
  reasoning = null;
  // New Reasoning Organ
  memory = null;
  forge = null;
  brain = null;
  // Real IO Capsules
  voiceCapsule = null;
  systemCapsule = null;
  geminiLive = null;
  grishaObserver = null;
  grishaVision = null;
  // Unified Vision Service (GrishaVisionService)
  organs = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Map();
  constructor() {
    console.log("[DEEP-INTEGRATION] 🚀 Initializing unified system...");
    this.core = new Core();
    this.unifiedBrain = createUnifiedBrain();
    this.core.cortex = this.unifiedBrain;
    this.synapseBridge = createSynapseBridge(synapse, this.core);
    this.organMapper = createAtlasOrganMapper(this.core);
    console.log("[DEEP-INTEGRATION] ✅ Core systems initialized");
  }
  /**
   * Event emitter helper
   */
  emit(event, data) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach((handler) => handler(data));
  }
  /**
   * Event listener helper
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }
  /**
   * Initialize System Organ (Motor Control)
   */
  async initSystemOrgan() {
    console.log("[DEEP-INTEGRATION] Initializing System Organ...");
    this.systemCapsule = new SystemCapsule();
    const systemHandler = {
      send: async (packet) => {
        console.log("[SYSTEM ORGAN] Received packet:", packet.instruction.op_code);
        const { intent, op_code } = packet.instruction;
        const { task, app } = packet.payload;
        let result = { success: false, output: "" };
        if (op_code === "OPEN_APP" || task && task.startsWith("open ")) {
          const appName = app || task.replace("open ", "").trim();
          result = await this.systemCapsule?.openApp(appName);
        } else if (op_code === "EXEC" || intent === "CMD") {
          result = await this.systemCapsule?.runCommand(task);
        }
        if (packet.route.reply_to) {
          const response = createPacket(
            "kontur://organ/system",
            packet.route.reply_to,
            PacketIntent.RESPONSE,
            { msg: result.success ? `Done: ${result.output || result.message}` : `Error: ${result.message || result.output}` }
          );
          this.core.ingest(response);
        }
      }
    };
    this.core.register("kontur://organ/system", systemHandler);
    console.log("[DEEP-INTEGRATION] ✅ System Organ registered");
  }
  /**
   * Initialize Vision System (Grisha's Eyes)
   * Supports both LIVE (Gemini) and ON-DEMAND (Copilot) modes
   */
  async initVisionSystem() {
    console.log("[DEEP-INTEGRATION] Initializing Vision System...");
    const { getVisionConfig: getVisionConfig2 } = await Promise.resolve().then(() => config);
    const { getGrishaVisionService: getGrishaVisionService2 } = await Promise.resolve().then(() => GrishaVisionService$1);
    const visionConfig = getVisionConfig2();
    console.log(`[DEEP-INTEGRATION] Vision Mode: ${visionConfig.mode.toUpperCase()}`);
    this.grishaVision = getGrishaVisionService2();
    const liveApiKey = visionConfig.live.apiKey || process.env.GEMINI_LIVE_API_KEY || process.env.GOOGLE_API_KEY;
    if (liveApiKey) {
      try {
        this.geminiLive = new GeminiLiveService(liveApiKey);
        if (visionConfig.mode === "live") {
          this.geminiLive.connect().catch((e) => console.error("[VISION] Gemini Connect Error:", e));
        }
        this.geminiLive.on("error", (err) => {
          console.error("[VISION] Gemini Live Error:", err.message);
          synapse.emit("GRISHA", "ALERT", `Помилка доступу до зору: ${err.message}`);
        });
        this.grishaVision.setGeminiLive(this.geminiLive);
        global.grishaObserver = this.grishaVision;
        console.log("[DEEP-INTEGRATION] ✅ Vision System (Gemini Live) active");
        setTimeout(async () => {
          try {
            const sources = await this.grishaVision.getSources();
            const externalSources = sources.filter(
              (s) => !s.name.toLowerCase().includes("electron") && !s.name.toLowerCase().includes("atlas") && !s.name.toLowerCase().includes("kontur")
            );
            const primaryScreen = externalSources.find((s) => s.name.includes("Screen") || s.name.includes("Entire"));
            if (primaryScreen) {
              this.grishaVision.selectSource(primaryScreen.id, primaryScreen.name);
              console.log("[DEEP-INTEGRATION] 🖥️ Auto-selected default source:", primaryScreen.name);
            } else if (externalSources.length > 0) {
              this.grishaVision.selectSource(externalSources[0].id, externalSources[0].name);
              console.log("[DEEP-INTEGRATION] 🖥️ Fallback to first available:", externalSources[0].name);
            }
          } catch (e) {
            console.warn("[DEEP-INTEGRATION] Failed to auto-select default source");
          }
        }, 2e3);
      } catch (error) {
        console.error("[DEEP-INTEGRATION] Failed to init Gemini Live:", error);
      }
    } else {
      console.warn("[DEEP-INTEGRATION] ⚠️ No API Key for Live Vision.");
    }
    this.grishaVision.on("observation", (result) => {
      synapse.emit("GRISHA", result.type.toUpperCase(), result.message);
    });
    this.grishaVision.on("audio", (audioChunk) => {
      synapse.emit("GRISHA", "AUDIO_CHUNK", { chunk: audioChunk });
    });
    this.grishaVision.on("source_changed", (data) => {
      synapse.emit("GRISHA", "SOURCE_CHANGED", data);
    });
    global.grishaVision = this.grishaVision;
    this.core.register("kontur://organ/vision", {
      send: async (packet) => {
        const { op_code } = packet.instruction;
        const args = packet.payload || {};
        try {
          let result = {};
          if (op_code === "get_sources") {
            result = { sources: await this.grishaVision.getSources() };
          } else if (op_code === "capture") {
            const sourceId = args.sourceId || args.id;
            const image = await this.grishaVision.captureFrame(sourceId);
            result = { image };
          } else if (op_code === "select_source") {
            this.grishaVision.selectSource(args.sourceId, args.sourceName || "Unknown");
            result = { success: true };
          }
          if (packet.route.reply_to) {
            const response = createPacket(
              "kontur://organ/vision",
              packet.route.reply_to,
              PacketIntent.RESPONSE,
              result
            );
            response.nexus.correlation_id = packet.nexus.correlation_id;
            this.core.ingest(response);
          }
        } catch (e) {
          if (packet.route.reply_to) {
            const response = createPacket(
              "kontur://organ/vision",
              packet.route.reply_to,
              PacketIntent.ERROR,
              { error: e.message }
            );
            response.nexus.correlation_id = packet.nexus.correlation_id;
            this.core.ingest(response);
          }
        }
      }
    });
    console.log(`[DEEP-INTEGRATION] ✅ Vision System ready [${visionConfig.mode}]`);
  }
  /**
   * Initialize MCP Handlers (Filesystem & OS)
   */
  async initMCP() {
    console.log("[DEEP-INTEGRATION] Initializing MCP Handlers...");
    this.core.register("kontur://organ/mcp/filesystem", {
      send: async (packet) => {
        const tool = packet.instruction.op_code || packet.payload.tool || packet.payload.action;
        const args = packet.payload.args || packet.payload;
        try {
          const result = await this.unifiedBrain.executeTool(tool, args);
          if (packet.route.reply_to) {
            const response = createPacket(
              "kontur://organ/mcp/filesystem",
              packet.route.reply_to,
              PacketIntent.RESPONSE,
              { msg: `MCP Logic Executed. Result: ${JSON.stringify(result)}` }
            );
            response.nexus.correlation_id = packet.nexus.correlation_id;
            this.core.ingest(response);
          }
        } catch (e) {
          if (packet.route.reply_to) {
            const response = createPacket(
              "kontur://organ/mcp/filesystem",
              packet.route.reply_to,
              PacketIntent.ERROR,
              { error: e.message, msg: `Failed: ${e.message}` }
            );
            response.nexus.correlation_id = packet.nexus.correlation_id;
            this.core.ingest(response);
          }
        }
      }
    });
    this.core.register("kontur://organ/mcp/os", {
      send: async (packet) => {
        const tool = packet.instruction.op_code || packet.payload.tool || packet.payload.action;
        const args = packet.payload.args || packet.payload;
        try {
          const result = await this.unifiedBrain.executeTool(tool, args);
          if (packet.route.reply_to) {
            const response = createPacket(
              "kontur://organ/mcp/os",
              packet.route.reply_to,
              PacketIntent.RESPONSE,
              { msg: `OS Command Executed: ${JSON.stringify(result)}` }
            );
            response.nexus.correlation_id = packet.nexus.correlation_id;
            this.core.ingest(response);
          }
        } catch (e) {
          if (packet.route.reply_to) {
            const response = createPacket(
              "kontur://organ/mcp/os",
              packet.route.reply_to,
              PacketIntent.ERROR,
              { error: e.message, msg: `Failed: ${e.message}` }
            );
            response.nexus.correlation_id = packet.nexus.correlation_id;
            this.core.ingest(response);
          }
        }
      }
    });
    console.log("[DEEP-INTEGRATION] ✅ MCP Handlers registered (Filesystem, OS)");
  }
  /**
   * Setup Electron IPC Bindings
   */
  setupIPC(ipcMain) {
    console.log("[DEEP-INTEGRATION] Setting up IPC Bridge...");
    ipcMain.removeHandler("kontur:registry");
    ipcMain.handle("kontur:registry", () => this.core.getRegistry());
    ipcMain.removeHandler("kontur:send");
    ipcMain.handle("kontur:send", (_, packet) => {
      console.log("[IPC BRIDGE] Received packet from UI");
      this.core.ingest(packet);
      return true;
    });
    ipcMain.removeHandler("voice:speak");
    ipcMain.handle("voice:speak", async (_, { text, voiceName }) => {
      try {
        if (!this.voiceCapsule)
          this.voiceCapsule = new VoiceCapsule();
        const audioBuffer = await this.voiceCapsule.speak(text, { voiceName });
        if (audioBuffer)
          return { success: true, audioBuffer };
        return { success: false, error: "No audio generated" };
      } catch (err) {
        console.error("[IPC BRIDGE] TTS Error:", err);
        return { success: false, error: err.message };
      }
    });
    ipcMain.removeHandler("vision:stream_frame");
    ipcMain.handle("vision:stream_frame", (_, { image }) => {
      if (this.geminiLive) {
        this.geminiLive.sendVideoFrame(image);
      }
      return true;
    });
    ipcMain.removeHandler("voice:transcribe");
    ipcMain.handle("voice:transcribe", async (_, { audio, mimeType }) => {
      try {
        const { getSTTService } = await Promise.resolve().then(() => require("./STTService-50ebb5f6.js"));
        const stt = getSTTService();
        const text = await stt.transcribe(audio, mimeType);
        return { success: true, text };
      } catch (err) {
        console.error("[IPC BRIDGE] STT Error:", err);
        return { success: false, error: err.message };
      }
    });
    ipcMain.removeHandler("vision:get_sources");
    ipcMain.handle("vision:get_sources", async () => {
      try {
        const { desktopCapturer } = await import("electron");
        const sources = await desktopCapturer.getSources({
          types: ["window", "screen"],
          thumbnailSize: { width: 150, height: 100 }
        });
        return sources.map((source) => ({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail.toDataURL(),
          isScreen: source.id.startsWith("screen:")
        }));
      } catch (err) {
        console.error("[IPC] Failed to get sources:", err);
        return [];
      }
    });
    ipcMain.removeHandler("vision:get_model_status");
    ipcMain.handle("vision:get_model_status", () => {
      const config2 = getVisionConfig();
      if (config2.mode === "live") {
        if (!this.geminiLive) {
          return { status: "disconnected", error: null, mode: "live" };
        }
        return {
          status: this.geminiLive.modelStatus,
          error: this.geminiLive.errorType,
          mode: "live"
        };
      } else {
        return { status: "connected", error: null, mode: "on-demand" };
      }
    });
    ipcMain.removeHandler("vision:select_source");
    ipcMain.handle("vision:select_source", async (_, { sourceId, sourceName }) => {
      if (this.grishaVision) {
        this.grishaVision.selectSource(sourceId, sourceName);
        return { success: true };
      }
      return { success: false, error: "Vision service not initialized" };
    });
    ipcMain.removeHandler("vision:get_mode");
    ipcMain.handle("vision:get_mode", () => {
      return getVisionConfig().mode;
    });
    ipcMain.removeHandler("vision:get_config");
    ipcMain.handle("vision:get_config", () => {
      return getVisionConfig();
    });
    ipcMain.removeHandler("vision:analyze");
    ipcMain.handle("vision:analyze", async (_, { taskContext }) => {
      try {
        if (!this.grishaVision) {
          return { success: false, error: "Vision service not initialized" };
        }
        const result = await this.grishaVision.verifyStep(taskContext || "Manual analysis", "");
        return { success: true, result };
      } catch (err) {
        console.error("[IPC] Vision analyze error:", err);
        return { success: false, error: err.message };
      }
    });
    ipcMain.removeHandler("config:get_all");
    ipcMain.handle("config:get_all", () => {
      return getAllConfigs();
    });
    console.log("[DEEP-INTEGRATION] ✅ IPC Bridge established");
  }
  /**
   * Initialize all Atlas Capsules (in-process)
   */
  async initAtlasCapsules() {
    console.log("[DEEP-INTEGRATION] Initializing Atlas Capsules...");
    const deepThinkingKey = process.env.REASONING_API_KEY || process.env.GEMINI_LIVE_API_KEY || process.env.TTS_API_KEY || // Often same as Gemini key
    process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
    this.memory = new MemoryCapsule();
    this.forge = new ForgeGhost();
    this.brain = new BrainCapsule(deepThinkingKey);
    if (!this.voiceCapsule)
      this.voiceCapsule = new VoiceCapsule();
    this.atlas = new AtlasCapsule(this.memory, this.brain);
    this.tetyana = new TetyanaCapsule(this.forge, this.voiceCapsule, this.brain, this.core);
    this.grisha = new GrishaCapsule(this.brain, this.core);
    this.reasoning = createReasoningCapsule();
    console.log("[DEEP-INTEGRATION] 🧠 Reasoning Capsule initialized (uses configured provider)");
    this.unifiedBrain.setAtlasBrain(this.brain);
    this.unifiedBrain.setAtlasOrgan(this.atlas);
    console.log("[DEEP-INTEGRATION] ✅ Atlas Capsules initialized");
  }
  /**
   * Spawn all KONTUR organs
   */
  async spawnOrgans() {
    console.log("[DEEP-INTEGRATION] Spawning KONTUR organs...");
    if (!this.memory || !this.forge || !this.brain) {
      throw new Error("Atlas Capsules not initialized");
    }
    if (process.env.AG === "true") {
      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      const agScript = path.join(__dirname, "../kontur/ag/ag-worker.py");
      const workerScript = path.join(__dirname, "../kontur/organs/worker.py");
      try {
        this.core.loadPlugin("kontur://organ/worker", { cmd: pythonCmd, args: [workerScript] });
        this.core.loadPlugin("kontur://organ/ag/sim", { cmd: pythonCmd, args: [agScript] });
        console.log("[DEEP-INTEGRATION] 🐍 Python Workers spawned (System + AG)");
      } catch (e) {
        console.error("[DEEP-INTEGRATION] Failed to spawn python workers:", e);
      }
    }
    if (this.atlas) {
      const atlasUrn = "kontur://organ/atlas";
      this.core.register(atlasUrn, {
        send: async (packet) => {
          const goal = packet.payload.goal || packet.payload.prompt || packet.payload.msg;
          const plan = await this.atlas?.plan({ goal, context: packet.payload });
          if (plan) {
            this.core.ingest(createPacket(
              "kontur://organ/atlas",
              "kontur://core/system",
              // Core decides where it goes (Tetyana)
              PacketIntent.AI_PLAN,
              plan
              // The plan object is the payload
            ));
          }
        },
        isAlive: () => true,
        getMetrics: () => ({ load_factor: 0.5, state: "ACTIVE" }),
        sendHeartbeat: () => {
        }
      });
      console.log(`[DEEP-INTEGRATION] 🧠 Atlas Capsule registered as ${atlasUrn}`);
    }
    if (this.reasoning) {
      const reasoningUrn = "kontur://organ/reasoning";
      this.core.register(reasoningUrn, {
        send: async (packet) => {
          return this.reasoning?.handlePacket(packet);
        },
        isAlive: () => true
      });
      this.reasoning.register(this.core);
      console.log(`[DEEP-INTEGRATION] 🧠 Reasoning Capsule registered as ${reasoningUrn}`);
    }
    if (this.tetyana) {
      const tetyanaUrn = "kontur://organ/tetyana";
      this.core.register(tetyanaUrn, {
        send: (packet) => {
          this.tetyana?.processPacket(packet);
        },
        // Metadata for Homeostasis
        isAlive: () => true,
        getMetrics: () => ({ load_factor: 0, state: "ACTIVE" }),
        sendHeartbeat: () => {
        }
      });
      console.log(`[DEEP-INTEGRATION] ⚡ Tetyana Capsule registered as ${tetyanaUrn}`);
    } else {
      console.warn("[DEEP-INTEGRATION] Tetyana Capsule not ready!");
    }
    if (this.grisha) {
      const grishaUrn = "kontur://organ/grisha";
      this.core.register(grishaUrn, {
        send: (packet) => {
          this.grisha?.processPacket(packet);
        },
        isAlive: () => true,
        getMetrics: () => ({ load_factor: 1, state: "ACTIVE" }),
        sendHeartbeat: () => {
        }
      });
      console.log(`[DEEP-INTEGRATION] 🛡️ Grisha Capsule registered as ${grishaUrn}`);
    }
    this.unifiedBrain.on("decision", (decisionPacket) => {
      console.log(`[CORE/SYSTEM] Brain decision -> ${decisionPacket.route.to}`);
      this.core.ingest(decisionPacket);
    });
    console.log(`[DEEP-INTEGRATION] 🧠 UnifiedBrain decision routing enabled`);
    console.log("[DEEP-INTEGRATION] ✅ All organs spawned");
  }
  /**
   * Synchronize Synapse with Core
   */
  async syncSystems() {
    console.log("[DEEP-INTEGRATION] Synchronizing systems...");
    this.core.register("kontur://organ/ui/shell", {
      send: (packet) => {
        let source = "SYSTEM";
        if (packet.route.from.includes("cortex"))
          source = "ATLAS";
        else if (packet.payload?.type === "chat" || packet.instruction?.intent === "AI_PLAN")
          source = "ATLAS";
        else if (packet.route.from.includes("mcp") || packet.payload?.type === "task_result")
          source = "TETYANA";
        else if (packet.route.from.includes("ag") || packet.payload?.type === "security")
          source = "GRISHA";
        let payload = packet.payload;
        if (payload && payload.msg)
          payload = payload.msg;
        synapse.emit(source, packet.instruction.intent || "INFO", payload);
      }
    });
    console.log("[DEEP-INTEGRATION] ✅ Systems synchronized");
  }
  /**
   * Run continuous integration test
   */
  async runIntegrationTest() {
    console.log("[DEEP-INTEGRATION] Running integration test...");
    const errors = [];
    let signalCount = 0;
    try {
      console.log("[TEST] Testing Atlas Planning...");
      if (!this.atlas)
        throw new Error("Atlas not initialized");
      const plan = await this.atlas.plan({
        goal: "Integrate KONTUR and Atlas"
      });
      console.log("[TEST] Atlas plan generated:", plan.id);
      if (plan.steps.length > 0 && typeof plan.steps[0] === "object") {
        console.log(`[TEST] ✅ Verified structured step: ${plan.steps[0].action}`);
      } else {
        throw new Error("Plan steps are not structured objects");
      }
      console.log("[TEST] Testing signal flow...");
      const signals = [];
      const sub = synapse.monitor().subscribe((sig) => {
        signals.push(sig);
        signalCount++;
      });
      synapse.emit("test", "deep_integration_started", { timestamp: Date.now() });
      await new Promise((r) => setTimeout(r, 500));
      sub.unsubscribe();
      console.log(`[TEST] Captured ${signalCount} signals`);
      const organCount = this.organs.size;
      console.log(`[TEST] ${organCount} organs active`);
      console.log("[TEST] Testing Unified Brain...");
      const thought = await this.unifiedBrain.think({
        system_prompt: "You are a test brain",
        user_prompt: "What is 2+2?"
      });
      console.log("[TEST] Brain response:", thought.text?.slice(0, 50));
      return {
        success: true,
        signals: signalCount,
        organs: organCount,
        errors
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      console.error("[TEST] Integration test failed:", msg);
      return {
        success: false,
        signals: signalCount,
        organs: this.organs.size,
        errors
      };
    }
  }
  /**
   * Complete initialization flow
   */
  async initialize() {
    console.log("[DEEP-INTEGRATION] Starting complete initialization...");
    try {
      await this.initSystemOrgan();
      await this.initVisionSystem();
      await this.initMCP();
      await this.initAtlasCapsules();
      await this.spawnOrgans();
      await this.syncSystems();
      console.log("[DEEP-INTEGRATION] ✅ Deep integration complete!");
      console.log("[DEEP-INTEGRATION] System ready for continuous existence");
      this.emit("ready");
    } catch (error) {
      console.error("[DEEP-INTEGRATION] Initialization failed:", error);
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Get system status report
   */
  getStatus() {
    return {
      core: this.core ? "READY" : "DOWN",
      brain: this.unifiedBrain ? "READY" : "DOWN",
      organs: Array.from(this.organs.keys()),
      capsules: [
        this.atlas ? "atlas" : null,
        this.tetyana ? "tetyana" : null,
        this.grisha ? "grisha" : null
      ].filter((x) => x !== null),
      timestamp: Date.now()
    };
  }
  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log("[DEEP-INTEGRATION] Shutting down...");
    this.geminiLive?.disconnect();
    this.core.stop();
    console.log("[DEEP-INTEGRATION] ✅ Shutdown complete");
    this.emit("shutdown");
  }
}
async function initializeDeepIntegration() {
  const system = new DeepIntegrationSystem();
  await system.initialize();
  return system;
}
let deepSystem = null;
async function bootstrapSystem() {
  try {
    deepSystem = await initializeDeepIntegration();
    deepSystem.setupIPC(electron.ipcMain);
    console.log("[MAIN] 🚀 Unified ATLAS-KONTUR System Booted");
  } catch (error) {
    console.error("[MAIN] 💥 Critical System Failure during Boot:", error);
  }
}
async function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon: path.join(__dirname, "../../build/icon.png") } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  await bootstrapSystem().catch((e) => console.error("[KONTUR] Initialization failed:", e));
  main.createIPCHandler({ router: appRouter, windows: [mainWindow] });
  deepSystem?.on("ready", () => {
    console.log("[MAIN] System Ready signal received - showing UI");
    mainWindow.show();
    synapse.emit("system", "wake_up", { timestamp: Date.now() });
  });
  mainWindow.on("ready-to-show", () => {
    if (deepSystem && deepSystem.getStatus().core === "READY") {
      mainWindow.show();
      synapse.emit("system", "wake_up", { timestamp: Date.now() });
    } else {
      console.log("[MAIN] Waiting for system ready...");
      deepSystem?.on("ready", () => {
        mainWindow.show();
        synapse.emit("system", "wake_up", { timestamp: Date.now() });
      });
    }
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.atlas.kontur");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("before-quit", async () => {
  if (deepSystem) {
    console.log("[MAIN] Requesting System Shutdown...");
    await deepSystem.shutdown();
  }
});
