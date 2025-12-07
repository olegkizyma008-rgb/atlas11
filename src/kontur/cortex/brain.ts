/**
 * Cortex Brain - AI Reasoning Engine for KONTUR
 * "Pure Intelligence" implementation - No hardcoded business logic.
 */

import { EventEmitter } from 'events';
import { KPP_Packet, SecurityScope, createPacket, PacketIntent } from '../protocol/nexus';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { AGENT_PERSONAS } from './agentPersonas';
import * as crypto from 'crypto';
import type { McpBridge } from '../mcp/McpBridge';

interface AIProvider {
  name: string;
  apiKey?: string;
  available: boolean;
}

interface AIResponseSchema {
  thought: string;
  plan: Array<{
    tool: string;
    action: string;
    args: Record<string, any>;
  }>;
  response: string;
}

export class CortexBrain extends EventEmitter {
  private urn = 'kontur://cortex/ai/main';
  private provider: string = process.env.AI_PROVIDER || 'gemini';

  private genAI: GoogleGenerativeAI | null = null;
  private chatModel: GenerativeModel | null = null;

  // Mapping of abstract tool names to system URNs
  private toolsMap: Record<string, string> = {
    calculator: 'kontur://organ/worker',
    memory: 'kontur://organ/memory',
    ui: 'kontur://organ/ui/shell',
    ag_sim: 'kontur://organ/ag/sim',
    system: 'kontur://organ/system',
    browser: 'kontur://organ/browser',
    files: 'kontur://organ/files'
  };

  private providers: AIProvider[] = [
    { name: 'gemini', available: !!process.env.GOOGLE_API_KEY },
    { name: 'openai', available: !!process.env.OPENAI_API_KEY }, // Placeholder
    { name: 'claude', available: !!process.env.ANTHROPIC_API_KEY }, // Placeholder
  ];

  constructor() {
    super();
    this.initializeAI();
  }

  private initializeAI() {
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (googleApiKey) {
      this.genAI = new GoogleGenerativeAI(googleApiKey);
      this.chatModel = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: AGENT_PERSONAS.ATLAS.systemPrompt,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json"
        },
        // We will add tools dynamically if possible, or inject into prompt
        // checks: https://ai.google.dev/gemini-api/docs/function-calling
      });
      console.log(`[CORTEX] 🧠 Initialized with Gemini AI`);

      // Initialize MCP Bridges
      this.initMCP();
    } else {
      console.warn(`[CORTEX] ⚠️ No GOOGLE_API_KEY`);
    }
  }

  private mcpBridges: Record<string, McpBridge> = {};

  private async initMCP() {
    try {
      const split = (str: string) => str.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(s => s.replace(/^"|"$/g, '')) || [];

      // 1. Filesystem MCP (Official)
      const { McpBridge } = await import('../mcp/McpBridge');
      const fsBridge = new McpBridge(
        'filesystem',
        '1.0.0',
        'node',
        ['node_modules/@modelcontextprotocol/server-filesystem/dist/index.js', process.cwd()]
      );

      // 2. OS Automation MCP (Local)
      // Use local ts-node executable to ensure it runs correctly
      const osBridge = new McpBridge(
        'os',
        '1.0.0',
        './node_modules/.bin/ts-node',
        ['src/kontur/mcp/servers/os.ts']
      );

      // Connect all bridges
      await fsBridge.connect();
      await osBridge.connect();

      const fsTools = await fsBridge.listTools();
      const osTools = await osBridge.listTools();

      const allTools = [...fsTools, ...osTools];
      console.log(`[CORTEX] 🛠️ Loaded ${allTools.length} MCP Tools:`, allTools.map(t => t.name).join(', '));

      this.mcpBridges['filesystem'] = fsBridge;
      this.mcpBridges['os'] = osBridge;

      // Register generic tool mapping
      fsTools.forEach(tool => this.toolsMap[tool.name] = 'kontur://organ/mcp/filesystem');
      osTools.forEach(tool => this.toolsMap[tool.name] = 'kontur://organ/mcp/os');

      // Update System Prompt with Tool Definitions
      const toolDesc = allTools.map((t: any) => `- ${t.name}: ${t.description} (Args: ${JSON.stringify(t.inputSchema)})`).join('\n');
      const enhancedPrompt = `${AGENT_PERSONAS.ATLAS.systemPrompt}\n\n## AVAILABLE MCP TOOLS (Use these instead of system/worker):\n${toolDesc}`;

      // Re-init model with new prompt
      this.chatModel = this.genAI!.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: enhancedPrompt,
        generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
      });

    } catch (e) {
      console.error('[CORTEX] Failed to init MCP:', e);
    }
  }

  /**
   * Process incoming packet using Pure Intelligence (LLM)
   */
  async process(packet: KPP_Packet) {
    const prompt = packet.payload.prompt || packet.instruction.op_code;
    const context = packet.payload.context || ''; // Optional context from Memory
    console.log(`[CORTEX] 🤔 Reasoning about: "${prompt}"`);

    try {
      if (!this.chatModel) {
        throw new Error("No AI Brain available (Missing API Key)");
      }

      // 1. Send to LLM
      const result = await this.chatModel.generateContent(
        `User Input: "${prompt}"\nContext: ${JSON.stringify(context)}`
      );
      const outputText = result.response.text();
      console.log(`[CORTEX] 💭 Thought:`, outputText);

      // 2. Parse Intelligence
      const aiDecision = this.parseAIResponse(outputText);

      // 3. Act on Decision
      if (aiDecision.plan && aiDecision.plan.length > 0) {
        this.handlePlan(aiDecision, packet);
      } else {
        this.handleChat(aiDecision);
      }

    } catch (e: any) {
      console.error(`[CORTEX ERROR]:`, e);
      this.handleError(e, packet);
    }
  }

  /**
   * Parse JSON response from LLM
   */
  private parseAIResponse(text: string): AIResponseSchema {
    try {
      // Clean markdown code blocks if present (despite MIME type config)
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
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
  private handlePlan(decision: AIResponseSchema, originalPacket: KPP_Packet) {
    console.log(`[CORTEX] 📋 Plan generated causing ${decision.plan.length} steps`);

    // Map tool names to URNs
    const systemSteps = decision.plan.map(step => ({
      target: this.toolsMap[step.tool] || step.tool, // Map 'calculator' -> 'kontur://organ/worker'
      action: step.action,
      args: step.args,
      tool: step.tool // Explicitly pass tool name for MCP
    }));

    // Create AI_PLAN packet for the System Core
    const systemPacket = createPacket(
      this.urn,
      'kontur://core/system',
      PacketIntent.AI_PLAN,
      {
        reasoning: decision.thought,
        user_response: decision.response, // Text to speak/show to user while working
        steps: systemSteps
      },
      { quantum_state: { amp1: 0.9, amp2: 0.1 } }
    );

    // Also emit the immediate chat response if there's one
    if (decision.response) {
      this.emitChat(decision.response);
    }

    this.emit('decision', systemPacket);
  }

  /**
   * Handle pure chat flow (No tools)
   */
  private handleChat(decision: AIResponseSchema) {
    console.log(`[CORTEX] 💬 Chat response: ${decision.response}`);
    this.emitChat(decision.response);

    // Emit 'decision' with empty plan to signal completion
    const eventPacket = createPacket(
      this.urn,
      'kontur://organ/ui/shell',
      PacketIntent.EVENT,
      { msg: decision.response, type: 'chat', reasoning: decision.thought }
    );
    this.emit('decision', eventPacket);
  }

  private emitChat(msg: string) {
    // This might be redundant if the UI listens to the main decision, 
    // but good for immediate feedback
    this.emit('chat', msg);
  }

  private handleError(error: Error, originalPacket: KPP_Packet) {
    const isOffline = error.message.includes("No AI Brain");

    const fallbackResponse = isOffline
      ? "⚠️ Система працює в автономному режимі. AI мозок недоступний. Перевірте API ключі."
      : `⚠️ Сталася помилка мислення: ${error.message}`;

    const errorPacket = createPacket(
      this.urn,
      'kontur://organ/ui/shell',
      PacketIntent.ERROR,
      { error: error.message, msg: fallbackResponse }
    );
    this.emit('decision', errorPacket);
  }

  /**
   * Execute MCP Tool directly (Called by Core/System)
   */
  async executeTool(toolName: string, args: any): Promise<any> {
    // Find which bridge has this tool
    for (const [bridgeName, bridge] of Object.entries(this.mcpBridges)) {
      // This is inefficient, ideally we map tool -> bridge
      const tools = await bridge.listTools();
      if (tools.find(t => t.name === toolName)) {
        console.log(`[CORTEX] 🛠️ Executing MCP Tool ${toolName} via ${bridgeName}`);
        return await bridge.callTool(toolName, args);
      }
    }
    throw new Error(`Tool ${toolName} not found in any MCP Bridge`);
  }

  /**
   * Generate code for given task (Direct LLM)
   */
  async genCode(packet: KPP_Packet): Promise<string> {
    if (!this.chatModel) return "// Error: No AI Model";

    const task = packet.payload.task || "unknown task";
    const lang = packet.payload.lang || "typescript";

    const result = await this.chatModel.generateContent(
      `Generate ${lang} code for: ${task}. Output JAVA SCRIPT/TYPESCRIPT code only.`
    );
    return result.response.text();
  }
}
