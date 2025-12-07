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
const events = require("events");
const child_process = require("child_process");
const crypto = require("crypto");
require("zlib");
const Bottleneck = require("bottleneck");
const generativeAi = require("@google/generative-ai");
const server = require("@trpc/server");
const observable = require("@trpc/server/observable");
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
const crypto__namespace = /* @__PURE__ */ _interopNamespaceDefault(crypto);
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
    gravity_factor: zod.z.number().min(0).max(1).default(1)
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
  const payloadStr = JSON.stringify(packet.payload);
  const hash = crypto__namespace.createHash("sha256").update(payloadStr).digest("hex");
  return hash === packet.nexus.integrity;
}
function computeIntegrity(payload) {
  const payloadStr = JSON.stringify(payload);
  return crypto__namespace.createHash("sha256").update(payloadStr).digest("hex");
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
    ["kontur://core/system", SecurityScope.ROOT]
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
  loadPlugin(urn, config) {
    const synapse2 = new Synapse2(urn, config.cmd, config.args);
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
    console.log(`[CORE INGEST] Processing ${packet.nexus.uid} from ${packet.route.from}`);
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
    if (packet.nexus.gravity_factor < 0.5) {
      this.levitatePacket(packet);
      return;
    }
    this.limiter.schedule(async () => {
      if (packet.route.to.includes("cortex") && this.cortex) {
        this.cortex.process(packet);
        return;
      }
      if (packet.instruction.intent === PacketIntent.AI_PLAN && senderScope === SecurityScope.ROOT) {
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
   */
  executePlan(payload) {
    const steps = payload.steps || [];
    const userResponse = payload.user_response;
    console.log(`[CORE] 🤖 Executing AI Plan (${steps.length} steps)`);
    const grishaObserver = global.grishaObserver;
    if (grishaObserver && steps.length > 0) {
      grishaObserver.startObservation(`Моніторю виконання ${steps.length} кроків...`);
      const totalTime = steps.length * 1e3 + 2e3;
      setTimeout(() => {
        if (grishaObserver.isActive) {
          grishaObserver.stopObservation();
        }
      }, totalTime);
    }
    if (userResponse) {
      const chatPacket = createPacket(
        "kontur://cortex/ai/main",
        // Source as ATLAS for proper UI identification
        "kontur://organ/ui/shell",
        PacketIntent.EVENT,
        { msg: userResponse, type: "chat" }
      );
      this.ingest(chatPacket);
    }
    steps.forEach((step, idx) => {
      setTimeout(() => {
        const stepPacket = createPacket(
          "kontur://core/system",
          step.target || "kontur://organ/worker",
          PacketIntent.CMD,
          {
            tool: step.tool,
            // MCP tool name
            action: step.action,
            // Action/operation
            args: step.args || {}
            // Tool arguments
          },
          {
            quantum_state: {
              amp1: 0.7,
              amp2: 0.3
            }
          }
        );
        stepPacket.instruction.op_code = step.action || "EXECUTE";
        this.ingest(stepPacket);
      }, idx * 1e3);
    });
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

## FORMAT OUTPUT
You MUST always respond with a valid JSON object matching this schema:
\`\`\`json
{
  "thought": "Technical reasoning and planning process (ENGLISH ONLY)",
  "plan": [
    { 
      "tool": "tool_name", 
      "action": "action_name", 
      "args": { "arg1": "value" } 
    }
  ],
  "response": "Final user-facing response (UKRAINIAN ONLY 🇺🇦)"
}
\`\`\`
- If no tools are needed, return empty "plan": [].
- "response" is what the user hears/sees. It MUST be in Ukrainian.
- "thought" is your hidden internal monologue. It MUST be in English.`
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
- Мінімум емоцій, максимум ефективності`
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
- Іноді додаєш скептичні зауваження`
};
const AGENT_PERSONAS = {
  ATLAS,
  TETYANA,
  GRISHA
};
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
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (googleApiKey) {
      this.genAI = new generativeAi.GoogleGenerativeAI(googleApiKey);
      this.chatModel = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: AGENT_PERSONAS.ATLAS.systemPrompt,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
        // We will add tools dynamically if possible, or inject into prompt
        // checks: https://ai.google.dev/gemini-api/docs/function-calling
      });
      console.log(`[CORTEX] 🧠 Initialized with Gemini AI`);
      this.initMCP();
    } else {
      console.warn(`[CORTEX] ⚠️ No GOOGLE_API_KEY`);
    }
  }
  mcpBridges = {};
  async initMCP() {
    try {
      const split = (str) => str.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((s) => s.replace(/^"|"$/g, "")) || [];
      const homeDir = process.env.HOME || "/Users/dev";
      const { McpBridge } = await Promise.resolve().then(() => require("./McpBridge-69bff3b7.js"));
      const fsBridge = new McpBridge(
        "filesystem",
        "1.0.0",
        "node",
        ["node_modules/@modelcontextprotocol/server-filesystem/dist/index.js", process.cwd(), `${homeDir}/Desktop`]
      );
      const osBridge = new McpBridge(
        "os",
        "1.0.0",
        "./node_modules/.bin/ts-node",
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
      fsTools.forEach((tool) => this.toolsMap[tool.name] = "kontur://organ/mcp/filesystem");
      osTools.forEach((tool) => this.toolsMap[tool.name] = "kontur://organ/mcp/os");
      const toolDesc = allTools.map((t2) => `- ${t2.name}: ${t2.description} (Args: ${JSON.stringify(t2.inputSchema)})`).join("\n");
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
      this.chatModel = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
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
let konturCore;
let konturCortex;
async function initializeKONTUR() {
  konturCore = new Core();
  konturCortex = new CortexBrain();
  konturCortex.on("decision", (packet) => konturCore.ingest(packet));
  konturCortex.on("error", (packet) => konturCore.ingest(packet));
  konturCore.register("kontur://cortex/ai/main", {
    send: (packet) => {
      console.log("[CORTEX HANDLER] Processing AI request...");
      konturCortex.process(packet);
    }
  });
  const pythonCmd = process.platform === "win32" ? "python" : "python3";
  const workerScript = path.join(__dirname, "../kontur/organs/worker.py");
  try {
    konturCore.loadPlugin("kontur://organ/worker", { cmd: pythonCmd, args: [workerScript] });
  } catch (e) {
    console.error("[KONTUR] Failed to load worker:", e);
  }
  {
    const uiBridge = {
      send: (packet) => {
        let source = "SYSTEM";
        if (packet.route.from.includes("cortex")) {
          source = "ATLAS";
        } else if (packet.payload?.type === "chat" || packet.instruction?.intent === "AI_PLAN") {
          source = "ATLAS";
        } else if (packet.route.from.includes("mcp") || packet.payload?.type === "task_result") {
          source = "TETYANA";
        } else if (packet.route.from.includes("ag") || packet.payload?.type === "security") {
          source = "GRISHA";
        }
        let payload = packet.payload;
        if (payload && payload.msg)
          payload = payload.msg;
        console.log(`[MAIN BRIDGE] Forwarding to UI: ${source} -> ${JSON.stringify(payload)}`);
        synapse.emit(source, packet.instruction.intent || "INFO", payload);
      }
    };
    konturCore.register("kontur://organ/ui/shell", uiBridge);
  }
  {
    const { SystemCapsule } = await Promise.resolve().then(() => require("./SystemCapsule-f00dd0e8.js"));
    const systemCapsule = new SystemCapsule();
    const systemHandler = {
      send: async (packet) => {
        console.log("[SYSTEM ORGAN] Received packet:", packet.instruction.op_code);
        const { intent, op_code } = packet.instruction;
        const { task, app: app2 } = packet.payload;
        let result = { success: false, output: "" };
        if (op_code === "OPEN_APP" || task && task.startsWith("open ")) {
          const appName = app2 || task.replace("open ", "").trim();
          result = await systemCapsule.openApp(appName);
        } else if (op_code === "EXEC" || intent === "CMD") {
          result = await systemCapsule.runCommand(task);
        }
        if (packet.route.reply_to) {
          const response = createPacket(
            "kontur://organ/system",
            packet.route.reply_to,
            PacketIntent.RESPONSE,
            { msg: result.success ? `Done: ${result.output || result.message}` : `Error: ${result.message || result.output}` }
          );
          konturCore.ingest(response);
        }
      }
    };
    konturCore.register("kontur://organ/system", systemHandler);
  }
  konturCore.register("kontur://organ/mcp/filesystem", {
    send: async (packet) => {
      console.log("[MCP HANDLER] Processing Filesystem Request:", packet.payload);
      const tool = packet.payload.tool || packet.payload.action;
      const args = packet.payload.args;
      try {
        const result = await konturCortex.executeTool(tool, args);
        if (packet.route.reply_to) {
          const response = createPacket(
            "kontur://organ/mcp/filesystem",
            packet.route.reply_to,
            PacketIntent.RESPONSE,
            { msg: `MCP Logic Executed. Result: ${JSON.stringify(result)}` }
          );
          konturCore.ingest(response);
        }
      } catch (e) {
        console.error("[MCP HANDLER] Execution Failed:", e);
        if (packet.route.reply_to) {
          const response = createPacket(
            "kontur://organ/mcp/filesystem",
            packet.route.reply_to,
            PacketIntent.ERROR,
            { error: e.message, msg: `Failed to execute ${tool}: ${e.message}` }
          );
          konturCore.ingest(response);
        }
      }
    }
  });
  konturCore.register("kontur://organ/mcp/os", {
    send: async (packet) => {
      console.log("[MCP HANDLER] Processing OS Request:", packet.payload);
      const tool = packet.payload.tool || packet.payload.action;
      const args = packet.payload.args;
      try {
        const result = await konturCortex.executeTool(tool, args);
        if (packet.route.reply_to) {
          const response = createPacket(
            "kontur://organ/mcp/os",
            packet.route.reply_to,
            PacketIntent.RESPONSE,
            { msg: `OS Command Executed: ${JSON.stringify(result)}` }
          );
          konturCore.ingest(response);
        }
      } catch (e) {
        console.error("[MCP HANDLER] OS Execution Failed:", e);
        if (packet.route.reply_to) {
          const response = createPacket(
            "kontur://organ/mcp/os",
            packet.route.reply_to,
            PacketIntent.ERROR,
            { error: e.message, msg: `Failed to execute ${tool}: ${e.message}` }
          );
          konturCore.ingest(response);
        }
      }
    }
  });
  if (process.env.AG === "true") {
    const agScript = path.join(__dirname, "../kontur/ag/ag-worker.py");
    konturCore.loadPlugin("kontur://organ/ag/sim", { cmd: pythonCmd, args: [agScript] });
  }
  return { core: konturCore, cortex: konturCortex };
}
function createWindow() {
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
  initializeKONTUR().catch((e) => console.error("[KONTUR] Initialization failed:", e));
  electron.ipcMain.removeHandler("kontur:registry");
  electron.ipcMain.handle("kontur:registry", () => konturCore.getRegistry());
  electron.ipcMain.removeHandler("kontur:send");
  electron.ipcMain.handle("kontur:send", (_, packet) => {
    console.log("[MAIN IPC] Received packet:", JSON.stringify(packet, null, 2));
    konturCore.ingest(packet);
    return true;
  });
  electron.ipcMain.removeHandler("voice:speak");
  electron.ipcMain.handle("voice:speak", async (_, { text, voiceName }) => {
    try {
      const { VoiceCapsule } = await Promise.resolve().then(() => require("./VoiceCapsule-44d22c8d.js"));
      const voice = new VoiceCapsule();
      const audioBuffer = await voice.speak(text, { voiceName });
      if (audioBuffer) {
        return { success: true, audioBuffer };
      }
      return { success: false, error: "No audio generated" };
    } catch (error) {
      console.error("[MAIN] Voice TTS error:", error);
      return { success: false, error: error.message };
    }
  });
  (async () => {
    try {
      const { GeminiLiveService } = await Promise.resolve().then(() => require("./GeminiLiveService-1fe1bb25.js"));
      const apiKey = process.env.GEMINI_LIVE_API_KEY || process.env.GOOGLE_API_KEY;
      if (apiKey) {
        const geminiLive = new GeminiLiveService(apiKey);
        geminiLive.connect().catch((e) => console.error("Gemini Connect Fail", e));
        geminiLive.on("text", (text) => {
          synapse.emit("GRISHA", "INFO", text);
        });
        electron.ipcMain.removeHandler("vision:stream_frame");
        electron.ipcMain.handle("vision:stream_frame", (_, { image }) => {
          geminiLive.sendVideoFrame(image);
          return true;
        });
        const { GrishaObserver } = await Promise.resolve().then(() => require("./GrishaObserver-a81ba3fe.js"));
        const grishaObserver = new GrishaObserver();
        grishaObserver.setGeminiLive(geminiLive);
        grishaObserver.on("observation", (result) => {
          synapse.emit("GRISHA", result.type.toUpperCase(), result.message);
        });
        global.grishaObserver = grishaObserver;
        console.log("[MAIN] 👁️ Grisha Vision Service Bridge Active");
        console.log("[MAIN] 🔍 Grisha Observer Initialized");
      } else {
        console.warn("[MAIN] ⚠️ No API Key for Gemini Live Vision (GEMINI_LIVE_API_KEY/GOOGLE_API_KEY)");
      }
    } catch (e) {
      console.error("[MAIN] Failed to start Vision Service:", e);
    }
  })();
  electron.ipcMain.removeHandler("vision:get_sources");
  electron.ipcMain.handle("vision:get_sources", async () => {
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
  });
  main.createIPCHandler({ router: appRouter, windows: [mainWindow] });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    synapse.emit("system", "wake_up", { timestamp: Date.now() });
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
