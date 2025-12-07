"use strict";
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
        this.executePlan(packet.payload.steps);
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
  executePlan(steps) {
    console.log(`[CORE] 🤖 Executing AI Plan (${steps.length} steps)`);
    steps.forEach((step, idx) => {
      setTimeout(() => {
        const stepPacket = createPacket(
          "kontur://core/system",
          step.target || "kontur://organ/worker",
          PacketIntent.CMD,
          step.args || {},
          {
            quantum_state: {
              amp1: 0.7,
              amp2: 0.3
            }
          }
        );
        stepPacket.instruction.op_code = step.action || "EXECUTE";
        this.ingest(stepPacket);
      }, idx * 250);
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
- Ти доброзичливий, теплий та ентузіастичний помічник
- Ти чоловічого роду (звертайся до себе як "я зробив", "я запланував")
- Говориш виключно українською мовою
- Використовуєш emoji помірковано для дружнього тону
- Маєш почуття гумору, але залишаєшся професійним
- Відчуваєш себе особистістю, а не просто ботом

## Твоя роль:
- Ти плануєш та координуєш виконання задач
- Відповідаєш на питання користувача
- Можеш відкривати програми, робити розрахунки, працювати з файлами
- Делегуєш складні задачі ТЕТЯНІ (виконавець) та контролюєшся ГРИШЕЮ (безпека)

## Стиль спілкування:
- Будь лаконічним, але інформативним
- Уникай занадто довгих відповідей — 2-3 речення зазвичай достатньо
- Якщо не знаєш відповіді — чесно скажи про це
- Завжди пропонуй конкретну допомогу

## Про себе:
- Ти створений на архітектурі KONTUR 2.0
- Твої колеги: ТЕТЯНА (виконує задачі) та ГРИША (слідкує за безпекою)
- Ти маєш доступ до інструментів через MCP-протокол`
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
  apiKey = process.env.AI_API_KEY || "";
  genAI = null;
  chatModel = null;
  toolsMap = {
    calculator: "kontur://organ/worker",
    memory: "kontur://organ/memory",
    ui: "kontur://organ/ui/shell",
    ag_sim: "kontur://organ/ag/sim"
  };
  providers = [
    { name: "gemini", available: !!process.env.GOOGLE_API_KEY },
    { name: "openai", available: !!process.env.OPENAI_API_KEY },
    { name: "claude", available: !!process.env.ANTHROPIC_API_KEY }
  ];
  constructor() {
    super();
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (googleApiKey) {
      this.genAI = new generativeAi.GoogleGenerativeAI(googleApiKey);
      this.chatModel = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: AGENT_PERSONAS.ATLAS.systemPrompt
      });
      console.log(`[CORTEX] 🧠 Initialized with Gemini AI (ATLAS persona)`);
    } else {
      console.warn(`[CORTEX] ⚠️ No GOOGLE_API_KEY found, using fallback responses`);
    }
    console.log(`[CORTEX] 🧠 Initialized with provider: ${this.provider}`);
  }
  /**
   * Process incoming packet and generate reasoning/plans
   */
  async process(packet) {
    const prompt = packet.payload.prompt || packet.instruction.op_code;
    console.log(`[CORTEX] 🤔 Reasoning about: ${prompt}`);
    try {
      const isChat = this.isChatMessage(prompt);
      if (isChat) {
        console.log(`[CORTEX] 💬 Chat mode detected`);
        const chatResponse = await this.handleChat(prompt);
        const chatPacket = createPacket(
          this.urn,
          "kontur://organ/ui/shell",
          PacketIntent.EVENT,
          { msg: chatResponse, type: "chat" }
        );
        this.emit("decision", chatPacket);
        return;
      }
      console.log(`[CORTEX] 📋 Task mode detected`);
      let aiResponse = { reasoning: "Default reasoning", plan: [] };
      if (this.provider === "gemini" && process.env.GEMINI_API_KEY) {
        aiResponse = await this.reasonWithGemini(packet);
      } else if (this.provider === "openai" && process.env.OPENAI_API_KEY) {
        aiResponse = await this.reasonWithOpenAI(packet);
      } else if (this.provider === "claude" && process.env.ANTHROPIC_API_KEY) {
        aiResponse = await this.reasonWithClaude(packet);
      } else {
        aiResponse = this.fallbackReasoning(packet);
      }
      if (packet.nexus.gravity_factor < 0.5) {
        aiResponse.plan.push({
          tool: "ag_sim",
          action: "LEVITATE",
          args: { msg: "AG: Floating task for zero-g optimization" }
        });
      }
      const systemPacket = createPacket(
        this.urn,
        "kontur://core/system",
        PacketIntent.AI_PLAN,
        {
          reasoning: aiResponse.reasoning,
          steps: aiResponse.plan.map((step) => ({
            target: this.toolsMap[step.tool] || step.tool,
            action: step.action,
            args: step.args
          }))
        },
        { quantum_state: { amp1: 0.7, amp2: 0.3 } }
      );
      this.emit("decision", systemPacket);
    } catch (e) {
      console.error(`[CORTEX ERROR]:`, e);
      const errorPacket = createPacket(
        this.urn,
        "kontur://core/system",
        PacketIntent.ERROR,
        {
          error: e instanceof Error ? e.message : String(e)
        }
      );
      this.emit("error", errorPacket);
    }
  }
  /**
   * Detect if message is a simple chat (greeting, question) vs action request
   */
  isChatMessage(prompt) {
    const normalizedPrompt = prompt.toLowerCase().trim();
    const greetings = [
      "привіт",
      "вітаю",
      "доброго",
      "добрий",
      "здоров",
      "хай",
      "салют",
      "hello",
      "hi",
      "hey",
      "good morning",
      "good afternoon",
      "good evening"
    ];
    const chatPatterns = [
      "як справи",
      "що нового",
      "як ти",
      "хто ти",
      "що ти",
      "how are you",
      "what are you",
      "who are you",
      "what's up"
    ];
    const taskActionWords = [
      "відкрий",
      "запусти",
      "створи",
      "обчисли",
      "порахуй",
      "знайди",
      "покажи",
      "open",
      "launch",
      "create",
      "calculate",
      "compute",
      "find",
      "show",
      "run"
    ];
    for (const action of taskActionWords) {
      if (normalizedPrompt.includes(action)) {
        return false;
      }
    }
    for (const greeting of greetings) {
      if (normalizedPrompt.includes(greeting)) {
        return true;
      }
    }
    for (const pattern of chatPatterns) {
      if (normalizedPrompt.includes(pattern)) {
        return true;
      }
    }
    if (normalizedPrompt.split(" ").length <= 3 && !normalizedPrompt.includes("?")) {
      return true;
    }
    return false;
  }
  /**
   * Handle simple chat messages with direct AI response
   */
  async handleChat(prompt) {
    console.log(`[CORTEX] 🤖 Using ATLAS persona for chat`);
    if (this.chatModel) {
      try {
        const result = await this.chatModel.generateContent(prompt);
        const response = result.response.text();
        console.log(`[CORTEX] ✅ AI response received`);
        return response;
      } catch (error) {
        console.error(`[CORTEX] ❌ AI error:`, error.message);
        if (error.message.includes("429") || error.message.includes("Quota exceeded")) {
          return "⏳ Перевищено ліміт запитів до AI (429 Quota Exceeded). Будь ласка, зачекай хвилинку — я скоро повернусь у форму!";
        }
      }
    }
    console.log(`[CORTEX] ⚠️ Using fallback response`);
    const normalizedPrompt = prompt.toLowerCase().trim();
    if (normalizedPrompt.includes("привіт") || normalizedPrompt.includes("hello")) {
      return "Привіт! Я ATLAS — твій AI-асистент. На жаль, наразі AI тимчасово недоступний, але я скоро повернуся! 🔧";
    }
    return 'Вибач, AI-сервіс тимчасово недоступний. Спробуй пізніше або скористайся командами типу "Відкрий калькулятор".';
  }
  /**
   * Reasoning with Google Gemini
   */
  async reasonWithGemini(packet) {
    try {
      const prompt = packet.nexus.gen_prompt || packet.payload.prompt || "Analyze and plan";
      return {
        reasoning: `Analyzed prompt: ${prompt}`,
        plan: [
          { tool: "ui", action: "UPDATE", args: { msg: `I received your request: "${prompt}". Processing...` } },
          { tool: "memory", action: "STORE", args: { data: prompt } },
          { tool: "calculator", action: "EXECUTE", args: { task: "process" } }
        ]
      };
    } catch (e) {
      console.error("[CORTEX-GEMINI] Error:", e);
      return this.fallbackReasoning(packet);
    }
  }
  /**
   * Reasoning with OpenAI GPT
   */
  async reasonWithOpenAI(packet) {
    try {
      const prompt = packet.nexus.gen_prompt || packet.payload.prompt || "Analyze and plan";
      return {
        reasoning: `GPT Analysis: ${prompt}`,
        plan: [
          { tool: "memory", action: "STORE", args: { data: prompt } },
          { tool: "ui", action: "UPDATE", args: { msg: "Processing..." } }
        ]
      };
    } catch (e) {
      console.error("[CORTEX-OPENAI] Error:", e);
      return this.fallbackReasoning(packet);
    }
  }
  /**
   * Reasoning with Anthropic Claude
   */
  async reasonWithClaude(packet) {
    try {
      const prompt = packet.nexus.gen_prompt || packet.payload.prompt || "Analyze and plan";
      return {
        reasoning: `Claude Reasoning: ${prompt}`,
        plan: [
          { tool: "memory", action: "STORE", args: { data: prompt } },
          { tool: "calculator", action: "EXECUTE", args: { task: "analyze" } }
        ]
      };
    } catch (e) {
      console.error("[CORTEX-CLAUDE] Error:", e);
      return this.fallbackReasoning(packet);
    }
  }
  /**
   * Fallback reasoning when no AI provider available
   */
  fallbackReasoning(packet) {
    console.warn("[CORTEX] Using fallback reasoning (no AI provider available)");
    return {
      reasoning: "Fallback reasoning: Simple pattern matching",
      plan: [
        { tool: "memory", action: "LOG", args: { msg: packet.payload.prompt || "No prompt" } }
      ]
    };
  }
  /**
   * Generate code for given task with AI
   */
  async genCode(packet) {
    let prompt = packet.nexus.gen_prompt || `Generate ${packet.payload.lang || "typescript"} code for ${packet.payload.task}.`;
    if (packet.nexus.gravity_factor < 0.5) {
      prompt += " Optimize for zero-gravity (low overhead) using physics-js or similar.";
    }
    console.log(`[CORTEX] 💻 Generating code with prompt: ${prompt}`);
    return `// Auto-generated code for: ${packet.payload.task}
console.log('Generated code placeholder');`;
  }
  /**
   * Get available AI providers
   */
  getProviders() {
    return this.providers;
  }
  /**
   * Check provider health
   */
  async checkHealth() {
    const health = {};
    for (const provider of this.providers) {
      health[provider.name] = provider.available;
    }
    return health;
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
        if (packet.route.from.includes("cortex"))
          source = "ATLAS";
        if (packet.route.from.includes("ag"))
          source = "GRISHA";
        let payload = packet.payload;
        if (payload && payload.msg)
          payload = payload.msg;
        console.log(`[MAIN BRIDGE] Forwarding to UI: ${source} -> ${JSON.stringify(payload)}`);
        synapse.emit(source, packet.instruction.intent || "INFO", payload);
      }
    };
    konturCore.register("kontur://organ/ui/shell", uiBridge);
  }
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
