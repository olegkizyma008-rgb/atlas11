/**
 * Deep Integration Initializer
 * Bootstraps unified KONTUR + Atlas system
 * Spawns all organs, syncs systems, returns integrated instance
 */

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
import { createPacket, PacketIntent } from '../kontur/protocol/nexus'; // Import packet utils

// Import Atlas Capsules
import { AtlasCapsule } from '../modules/atlas/index';
import { TetyanaCapsule } from '../modules/tetyana/index';
import { GrishaCapsule } from '../modules/grisha/index';
import { createReasoningCapsule, ReasoningCapsule } from '../modules/reasoning';
import { TetyanaExecutor } from '../modules/tetyana/executor';
import { MemoryCapsule } from '../modules/memory/index';
import { ForgeGhost } from '../modules/forge/ghost';
import { VoiceGhost } from '../modules/voice/ghost';
import { BrainCapsule } from '../modules/brain/index';

// Import Real Implementations for IO
import { VoiceCapsule } from '../kontur/voice/VoiceCapsule'; // Real Voice
import { GeminiLiveService } from '../kontur/vision/GeminiLiveService'; // Real Vision
import { GrishaObserver } from '../kontur/vision/GrishaObserver'; // Real Observer
import { SystemCapsule } from '../kontur/system/SystemCapsule'; // Real System

import { IpcMain } from 'electron';
import { join } from 'path';

/**
 * Deep Integration System
 * Coordinates all Atlas and KONTUR components
 */
export class DeepIntegrationSystem {
  public core: Core;
  public unifiedBrain: UnifiedBrain;
  public synapseBridge: SynapseBridge;
  public organMapper: AtlasOrganMapper;

  public atlas: AtlasCapsule | null = null;
  public tetyana: TetyanaCapsule | null = null;
  public grisha: GrishaCapsule | null = null;
  public reasoning: ReasoningCapsule | null = null; // New Reasoning Organ

  public memory: MemoryCapsule | null = null;
  public forge: ForgeGhost | null = null;
  public voiceGhost: VoiceGhost | null = null;
  public brain: BrainCapsule | null = null;

  // Real IO Capsules
  public voiceCapsule: VoiceCapsule | null = null;
  public systemCapsule: SystemCapsule | null = null;
  public geminiLive: GeminiLiveService | null = null;
  public grishaObserver: GrishaObserver | null = null;
  public grishaVision: any = null; // Unified Vision Service (GrishaVisionService)

  private organs: Map<string, Synapse> = new Map();
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    console.log('[DEEP-INTEGRATION] 🚀 Initializing unified system...');

    // 1. Initialize Core
    this.core = new Core();

    // 2. Initialize Unified Brain
    this.unifiedBrain = createUnifiedBrain();
    this.core.cortex = this.unifiedBrain; // Attach unified brain to core

    // 3. Initialize Bridges
    this.synapseBridge = createSynapseBridge(synapse, this.core);
    this.organMapper = createAtlasOrganMapper(this.core);

    console.log('[DEEP-INTEGRATION] ✅ Core systems initialized');
  }

  /**
   * Event emitter helper
   */
  private emit(event: string, data?: any): void {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach((handler) => handler(data));
  }

  /**
   * Event listener helper
   */
  public on(event: string, handler: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  /**
   * Initialize System Organ (Motor Control)
   */
  private async initSystemOrgan(): Promise<void> {
    console.log('[DEEP-INTEGRATION] Initializing System Organ...');
    this.systemCapsule = new SystemCapsule();

    const systemHandler = {
      send: async (packet: any) => {
        console.log('[SYSTEM ORGAN] Received packet:', packet.instruction.op_code);

        const { intent, op_code } = packet.instruction;
        const { task, app } = packet.payload;

        let result: any = { success: false, output: '' };

        if (op_code === 'OPEN_APP' || (task && task.startsWith('open '))) {
          const appName = app || task.replace('open ', '').trim();
          result = await this.systemCapsule?.openApp(appName);
        } else if (op_code === 'EXEC' || intent === 'CMD') {
          result = await this.systemCapsule?.runCommand(task);
        }

        // Send response back
        if (packet.route.reply_to) {
          const response = createPacket(
            'kontur://organ/system',
            packet.route.reply_to,
            PacketIntent.RESPONSE,
            { msg: result.success ? `Done: ${result.output || result.message}` : `Error: ${result.message || result.output}` }
          );
          this.core.ingest(response);
        }
      }
    };
    this.core.register('kontur://organ/system', systemHandler);
    console.log('[DEEP-INTEGRATION] ✅ System Organ registered');
  }

  /**
   * Initialize Vision System (Grisha's Eyes)
   * Supports both LIVE (Gemini) and ON-DEMAND (Copilot) modes
   */
  private async initVisionSystem(): Promise<void> {
    console.log('[DEEP-INTEGRATION] Initializing Vision System...');

    const { getVisionConfig } = await import('../kontur/providers/config');
    const { getGrishaVisionService } = await import('../kontur/vision/GrishaVisionService');

    const visionConfig = getVisionConfig();
    console.log(`[DEEP-INTEGRATION] Vision Mode: ${visionConfig.mode.toUpperCase()}`);

    // Initialize unified Vision Service
    this.grishaVision = getGrishaVisionService();

    // Setup Live mode (Gemini Live)
    const liveApiKey = visionConfig.live.apiKey || process.env.GEMINI_LIVE_API_KEY || process.env.GOOGLE_API_KEY;

    if (liveApiKey) {
      try {
        this.geminiLive = new GeminiLiveService(liveApiKey);

        // Only auto-connect if Live mode is active
        if (visionConfig.mode === 'live') {
          this.geminiLive.connect().catch(e => console.error("[VISION] Gemini Connect Error:", e));
        }

        this.geminiLive.on('error', (err) => {
          console.error('[VISION] Gemini Live Error:', err.message);
          synapse.emit('GRISHA', 'ALERT', `Помилка доступу до зору: ${err.message}`);
        });

        // Connect Gemini Live to Vision Service
        this.grishaVision.setGeminiLive(this.geminiLive);

        // Initialize legacy Observer (for backward compatibility)
        this.grishaObserver = new GrishaObserver();
        this.grishaObserver.setGeminiLive(this.geminiLive);

        // Forward observations to Synapse (UI)
        this.grishaObserver.on('observation', (result: any) => {
          synapse.emit('GRISHA', result.type.toUpperCase(), result.message);
        });

        this.grishaObserver.on('audio', (audioChunk: string) => {
          synapse.emit('GRISHA', 'AUDIO_CHUNK', { chunk: audioChunk });
        });

        console.log('[DEEP-INTEGRATION] ✅ Vision System (Gemini Live) active');
      } catch (error) {
        console.error('[DEEP-INTEGRATION] Failed to init Gemini Live:', error);
      }
    } else {
      console.warn('[DEEP-INTEGRATION] ⚠️ No API Key for Live Vision.');
    }

    // Forward Vision Service observations to Synapse
    this.grishaVision.on('observation', (result: any) => {
      synapse.emit('GRISHA', result.type.toUpperCase(), result.message);
    });

    this.grishaVision.on('audio', (audioChunk: string) => {
      synapse.emit('GRISHA', 'AUDIO_CHUNK', { chunk: audioChunk });
    });

    // Expose services globally for debugging
    (global as any).grishaObserver = this.grishaObserver;
    (global as any).grishaVision = this.grishaVision;

    console.log(`[DEEP-INTEGRATION] ✅ Vision System ready [${visionConfig.mode}]`);
  }

  /**
   * Initialize MCP Handlers (Filesystem & OS)
   */
  private async initMCP(): Promise<void> {
    console.log('[DEEP-INTEGRATION] Initializing MCP Handlers...');

    // Filesystem
    this.core.register('kontur://organ/mcp/filesystem', {
      send: async (packet: any) => {
        const tool = packet.payload.tool || packet.payload.action;
        const args = packet.payload.args;
        try {
          const result = await this.unifiedBrain.executeTool(tool, args); // Use unifiedBrain methods
          if (packet.route.reply_to) {
            this.core.ingest(createPacket(
              'kontur://organ/mcp/filesystem', packet.route.reply_to, PacketIntent.RESPONSE,
              { msg: `MCP Logic Executed. Result: ${JSON.stringify(result)}` }
            ));
          }
        } catch (e: any) {
          if (packet.route.reply_to) {
            this.core.ingest(createPacket(
              'kontur://organ/mcp/filesystem', packet.route.reply_to, PacketIntent.ERROR,
              { error: e.message, msg: `Failed: ${e.message}` }
            ));
          }
        }
      }
    });

    // OS
    this.core.register('kontur://organ/mcp/os', {
      send: async (packet: any) => {
        const tool = packet.payload.tool || packet.payload.action;
        const args = packet.payload.args;
        try {
          const result = await this.unifiedBrain.executeTool(tool, args);
          if (packet.route.reply_to) {
            this.core.ingest(createPacket(
              'kontur://organ/mcp/os', packet.route.reply_to, PacketIntent.RESPONSE,
              { msg: `OS Command Executed: ${JSON.stringify(result)}` }
            ));
          }
        } catch (e: any) {
          if (packet.route.reply_to) {
            this.core.ingest(createPacket(
              'kontur://organ/mcp/os', packet.route.reply_to, PacketIntent.ERROR,
              { error: e.message, msg: `Failed: ${e.message}` }
            ));
          }
        }
      }
    });
    console.log('[DEEP-INTEGRATION] ✅ MCP Handlers registered (Filesystem, OS)');
  }

  /**
   * Setup Electron IPC Bindings
   */
  public setupIPC(ipcMain: IpcMain): void {
    console.log('[DEEP-INTEGRATION] Setting up IPC Bridge...');

    // Registry Access
    ipcMain.removeHandler('kontur:registry');
    ipcMain.handle('kontur:registry', () => this.core.getRegistry());

    // Direct Packet Send
    ipcMain.removeHandler('kontur:send');
    ipcMain.handle('kontur:send', (_, packet) => {
      console.log('[IPC BRIDGE] Received packet from UI');
      this.core.ingest(packet);
      return true;
    });

    // Voice TTS
    ipcMain.removeHandler('voice:speak');
    ipcMain.handle('voice:speak', async (_, { text, voiceName }) => {
      try {
        if (!this.voiceCapsule) this.voiceCapsule = new VoiceCapsule(); // Lazy init separate instance if needed, or reuse
        const audioBuffer = await this.voiceCapsule.speak(text, { voiceName });
        if (audioBuffer) return { success: true, audioBuffer };
        return { success: false, error: 'No audio generated' };
      } catch (err: any) {
        console.error('[IPC BRIDGE] TTS Error:', err);
        return { success: false, error: err.message };
      }
    });

    // Vision Stream
    ipcMain.removeHandler('vision:stream_frame');
    ipcMain.handle('vision:stream_frame', (_, { image }) => {
      if (this.geminiLive) {
        this.geminiLive.sendVideoFrame(image);
      }
      return true;
    });

    // Voice STT (Transcription)
    ipcMain.removeHandler('voice:transcribe');
    ipcMain.handle('voice:transcribe', async (_, { audio, mimeType }) => {
      try {
        const { getSTTService } = await import('../kontur/voice/STTService');
        const stt = getSTTService();
        const text = await stt.transcribe(audio, mimeType);
        return { success: true, text };
      } catch (err: any) {
        console.error('[IPC BRIDGE] STT Error:', err);
        return { success: false, error: err.message };
      }
    });

    // Screen Sources for Vision
    ipcMain.removeHandler('vision:get_sources');
    ipcMain.handle('vision:get_sources', async () => {
      try {
        const { desktopCapturer } = await import('electron');
        const sources = await desktopCapturer.getSources({
          types: ['window', 'screen'],
          thumbnailSize: { width: 150, height: 100 }
        });
        return sources.map(source => ({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail.toDataURL(),
          isScreen: source.id.startsWith('screen:')
        }));
      } catch (err: any) {
        console.error("[IPC] Failed to get sources:", err);
        return [];
      }
    });

    // Model Status for UI Indicator
    ipcMain.removeHandler('vision:get_model_status');
    ipcMain.handle('vision:get_model_status', () => {
      const { getVisionConfig } = require('../kontur/providers/config');
      const config = getVisionConfig();

      if (config.mode === 'live') {
        if (!this.geminiLive) {
          return { status: 'disconnected', error: null, mode: 'live' };
        }
        return {
          status: this.geminiLive.modelStatus,
          error: this.geminiLive.errorType,
          mode: 'live'
        };
      } else {
        // On-demand mode: always "ready"
        return { status: 'connected', error: null, mode: 'on-demand' };
      }
    });

    // Select Vision source (window/screen)
    ipcMain.removeHandler('vision:select_source');
    ipcMain.handle('vision:select_source', async (_, { sourceId, sourceName }) => {
      if (this.grishaVision) {
        this.grishaVision.selectSource(sourceId, sourceName);
        return { success: true };
      }
      return { success: false, error: 'Vision service not initialized' };
    });

    // Get current Vision mode
    ipcMain.removeHandler('vision:get_mode');
    ipcMain.handle('vision:get_mode', () => {
      const { getVisionConfig } = require('../kontur/providers/config');
      return getVisionConfig().mode;
    });

    // Get full Vision config
    ipcMain.removeHandler('vision:get_config');
    ipcMain.handle('vision:get_config', () => {
      const { getVisionConfig } = require('../kontur/providers/config');
      return getVisionConfig();
    });

    // On-demand Vision analysis (manual trigger from UI)
    ipcMain.removeHandler('vision:analyze');
    ipcMain.handle('vision:analyze', async (_, { taskContext }) => {
      try {
        if (!this.grishaVision) {
          return { success: false, error: 'Vision service not initialized' };
        }
        const result = await this.grishaVision.verifyStep(taskContext || 'Manual analysis', '');
        return { success: true, result };
      } catch (err: any) {
        console.error('[IPC] Vision analyze error:', err);
        return { success: false, error: err.message };
      }
    });

    // Get full system config (services, providers, etc) for UI
    ipcMain.removeHandler('config:get_all');
    ipcMain.handle('config:get_all', () => {
      const { getAllConfigs } = require('../kontur/providers/config');
      return getAllConfigs();
    });

    console.log('[DEEP-INTEGRATION] ✅ IPC Bridge established');
  }

  /**
   * Initialize all Atlas Capsules (in-process)
   */
  private async initAtlasCapsules(): Promise<void> {
    console.log('[DEEP-INTEGRATION] Initializing Atlas Capsules...');

    // API key from env
    // API key from env (Fallback chain)
    const deepThinkingKey = process.env.ATLAS_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

    // Initialize Dependencies (Real Memory + Real Brain)
    this.memory = new MemoryCapsule();
    this.forge = new ForgeGhost(); // Internal logic
    this.voiceGhost = new VoiceGhost(); // Internal logic
    this.brain = new BrainCapsule(deepThinkingKey);

    // Initialize Capsules
    this.atlas = new AtlasCapsule(this.memory, this.brain);
    // Tetyana gets Core to drive execution
    this.tetyana = new TetyanaCapsule(this.forge, this.voiceGhost, this.brain, this.core);
    this.grisha = new GrishaCapsule(this.brain, this.core);
    this.reasoning = createReasoningCapsule(deepThinkingKey); // Initialize with key
    console.log('[DEEP-INTEGRATION] 🧠 Reasoning Capsule (Gemini 3) created');

    // Register with Unified Brain
    this.unifiedBrain.setAtlasBrain(this.brain);
    this.unifiedBrain.setAtlasOrgan(this.atlas);
    // Note: We might want to register Tetyana/Grisha with UnifiedBrain too in future, 
    // but for now Atlas is the main "Thinker" registered there.

    console.log('[DEEP-INTEGRATION] ✅ Atlas Capsules initialized');
  }

  /**
   * Spawn all KONTUR organs
   */
  private async spawnOrgans(): Promise<void> {
    console.log('[DEEP-INTEGRATION] Spawning KONTUR organs...');

    if (!this.memory || !this.forge || !this.voiceGhost || !this.brain) {
      throw new Error('Atlas Capsules not initialized');
    }

    // 1. Python Worker (AG/Sim) - if enabled
    if (process.env.AG === 'true') {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const agScript = join(__dirname, '../kontur/ag/ag-worker.py');
      // We might also have a general worker
      const workerScript = join(__dirname, '../kontur/organs/worker.py');

      try {
        this.core.loadPlugin('kontur://organ/worker', { cmd: pythonCmd, args: [workerScript] });
        this.core.loadPlugin('kontur://organ/ag/sim', { cmd: pythonCmd, args: [agScript] });
        console.log('[DEEP-INTEGRATION] 🐍 Python Workers spawned (System + AG)');
      } catch (e) {
        console.error('[DEEP-INTEGRATION] Failed to spawn python workers:', e);
      }
    }

    // 2. Register Atlas Capsule (The Architect)
    // Legacy Python Organ replaced with TS Capsule
    if (this.atlas) {
      const atlasUrn = 'kontur://organ/atlas';
      this.core.register(atlasUrn, {
        send: async (packet: any) => {
          // Determine goal from packet
          const goal = packet.payload.goal || packet.payload.prompt || packet.payload.msg;
          // Execute Plan
          const plan = await this.atlas?.plan({ goal, context: packet.payload });

          if (plan) {
            // Emit AI_PLAN packet for Core to route to Tetyana
            this.core.ingest(createPacket(
              'kontur://organ/atlas',
              'kontur://core/system', // Core decides where it goes (Tetyana)
              PacketIntent.AI_PLAN,
              plan // The plan object is the payload
            ));
          }
        },
        isAlive: () => true,
        getMetrics: () => ({ load_factor: 0.5, state: 'ACTIVE' }),
        sendHeartbeat: () => { }
      });
      console.log(`[DEEP-INTEGRATION] 🧠 Atlas Capsule registered as ${atlasUrn}`);
    }

    // 5. Register Reasoning Capsule (The Deep Thinker)
    if (this.reasoning) {
      const reasoningUrn = 'kontur://organ/reasoning';
      this.core.register(reasoningUrn, async (packet) => {
        return this.reasoning?.handlePacket(packet);
      });

      // Let it know about Core if needed
      this.reasoning.register(this.core);
      console.log(`[DEEP-INTEGRATION] 🧠 Reasoning Capsule registered as ${reasoningUrn}`);
    }

    // 3. Register Tetyana Capsule as Organ (Executor)
    // We create a simple adapter since TetyanaCapsule doesn't implement 'send' directly in the same way,
    // but it has `processPacket`.

    if (this.tetyana) {
      const tetyanaUrn = 'kontur://organ/tetyana';
      this.core.register(tetyanaUrn, {
        send: (packet: any) => {
          this.tetyana?.processPacket(packet);
        },
        // Metadata for Homeostasis
        isAlive: () => true,
        getMetrics: () => ({ load_factor: 0, state: 'ACTIVE' }),
        sendHeartbeat: () => { }
      });
      console.log(`[DEEP-INTEGRATION] ⚡ Tetyana Capsule registered as ${tetyanaUrn}`);
    } else {
      console.warn("[DEEP-INTEGRATION] Tetyana Capsule not ready!");
    }

    // Legacy Mapper call removed for Tetyana to avoid duplicate registration
    /*
    const tetyanaOrgan = this.organMapper.createTetyanaOrgan(
      this.forge,
      this.voiceGhost,
      this.brain
    );
    this.core.register(tetyanaOrgan.urn, tetyanaOrgan);
    this.organs.set(tetyanaOrgan.urn, tetyanaOrgan);
    */

    // 4. Register Grisha Capsule as Security Organ
    if (this.grisha) {
      const grishaUrn = 'kontur://organ/grisha';
      this.core.register(grishaUrn, {
        send: (packet: any) => {
          this.grisha?.processPacket(packet);
        },
        isAlive: () => true,
        getMetrics: () => ({ load_factor: 1, state: 'ACTIVE' }),
        sendHeartbeat: () => { }
      });
      console.log(`[DEEP-INTEGRATION] 🛡️ Grisha Capsule registered as ${grishaUrn}`);
    }

    // Legacy Grisha Mapper call removed
    /*
    const grishaOrgan = this.organMapper.createGrishaOrgan(this.brain);
    this.core.register(grishaOrgan.urn, grishaOrgan);
    this.organs.set(grishaOrgan.urn, grishaOrgan);
    */

    // Note: Memory/Voice Organs mapped by mapper are often proxies.
    // Since we have specific handlers for System/Vision/MCP, we rely on those.

    console.log('[DEEP-INTEGRATION] ✅ All organs spawned');
  }

  /**
   * Synchronize Synapse with Core
   */
  private async syncSystems(): Promise<void> {
    console.log('[DEEP-INTEGRATION] Synchronizing systems...');

    // Synapse Bridge: UI -> Core
    // handled by SynapseBridge class created in constructor

    // Reverse: Core -> UI (Synapse)
    // We register a 'shell' organ that forwards everything relevant to UI
    this.core.register('kontur://organ/ui/shell', {
      send: (packet: any) => {
        // Determine Source Name for UI (ATLAS, TETYANA, GRISHA, SYSTEM)
        let source = 'SYSTEM';

        if (packet.route.from.includes('cortex')) source = 'ATLAS';
        else if (packet.payload?.type === 'chat' || packet.instruction?.intent === 'AI_PLAN') source = 'ATLAS';
        else if (packet.route.from.includes('mcp') || packet.payload?.type === 'task_result') source = 'TETYANA';
        else if (packet.route.from.includes('ag') || packet.payload?.type === 'security') source = 'GRISHA';

        // Extract message
        let payload = packet.payload;
        if (payload && payload.msg) payload = payload.msg;

        // Emit to Synapse Bus (for UI to pick up)
        // console.log(`[DEEP BRIDGE] Forwarding to UI: ${source} -> ${JSON.stringify(payload)}`);
        synapse.emit(source, packet.instruction.intent || 'INFO', payload);
      }
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

      if (plan.steps.length > 0 && typeof plan.steps[0] === 'object') {
        console.log(`[TEST] ✅ Verified structured step: ${plan.steps[0].action}`);
      } else {
        throw new Error('Plan steps are not structured objects');
      }

      // 2. Test signal flow
      console.log('[TEST] Testing signal flow...');
      const signals: any[] = [];
      const sub = synapse.monitor().subscribe((sig: any) => {
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
      // 1. Initialize Capabilities first
      await this.initSystemOrgan();
      await this.initVisionSystem();
      await this.initMCP();

      // 2. Initialize Atlas Capsules (The Mind)
      await this.initAtlasCapsules();

      // 3. Spawn KONTUR Organs (The Body Integration)
      await this.spawnOrgans();

      // 4. Synchronize Systems
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
    this.geminiLive?.disconnect();
    this.core.stop();
    // ... kill workers
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

