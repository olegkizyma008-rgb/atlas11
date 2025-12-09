/**
 * Unified Brain - Integration of Atlas Brain + KONTUR Cortex
 * Coordinates planning, execution, safety through unified AI engine
 * Supports multiple AI providers with Atlas fallback
 */

// GoogleGenAI import removed - now using ProviderRouter
import { EventEmitter } from 'events';
import { getProviderRouter, logProviderConfig } from '../providers';
import { CortexBrain } from './brain';
import { getPersona } from './agentPersonas';
import { BrainAPI } from '../../modules/brain/contract';
import { AtlasAPI } from '../../modules/atlas/contract';
import {
  KPP_Packet,
  PacketIntent,
  createPacket,
} from '../protocol/nexus';

interface ThinkRequest {
  system_prompt: string;
  user_prompt: string;
  model?: string;
  tools?: any[];
  mode?: 'chat' | 'planning'; // Determines response format: text for chat, JSON for planning
}

interface ThinkResponse {
  text?: string;
  tool_calls?: Array<{
    name: string;
    args: Record<string, any>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

// Structured Planning Interfaces
interface PlanStep {
  tool: string;
  action: string;
  args: Record<string, any>;
  target?: string;
}

interface CortexPlanResponse {
  thought: string;
  response: string;
  plan: PlanStep[];
}

export class UnifiedBrain extends CortexBrain {
  private atlasAPI: BrainAPI | null = null;
  private atlasOrganAPI: AtlasAPI | null = null;

  constructor() {
    super();
    console.log('[UNIFIED-BRAIN] 🧠🔗 Unified Brain initialized');

    // Log provider configuration
    logProviderConfig();

    // Warm up the provider router
    getProviderRouter();
  }

  /**
   * Set Atlas Brain API for fallback and context
   */
  setAtlasBrain(brain: BrainAPI): void {
    this.atlasAPI = brain;
    console.log('[UNIFIED-BRAIN] Atlas Brain API integrated');
  }

  /**
   * Set Atlas Organ API for planning coordination
   */
  setAtlasOrgan(atlas: AtlasAPI): void {
    this.atlasOrganAPI = atlas;
    console.log('[UNIFIED-BRAIN] Atlas Organ API integrated');
  }

  /**
   * Unified think - KONTUR Cortex with Atlas Brain fallback
   */
  async think(request: ThinkRequest): Promise<ThinkResponse> {
    console.log(`[UNIFIED-BRAIN] 🤔 Thinking with context...`);

    try {
      // 1. Try KONTUR Cortex first
      const cortexResponse = await this.thinkWithCortex(request);

      // 2. If Cortex succeeds, return response
      // Only enrich with Atlas context for planning mode (internal reasoning)
      // Chat mode should return clean response directly to avoid verbose output in UI
      if (cortexResponse.text) {
        if (request.mode === 'planning') {
          return await this.enrichWithAtlasContext(cortexResponse, request);
        }
        return cortexResponse;
      }

      // 3. Fallback to Atlas Brain
      return await this.thinkWithAtlas(request);
    } catch (error) {
      console.warn('[UNIFIED-BRAIN] Cortex reasoning failed, attempting fall back to Atlas...', error);

      try {
        // 3. Fallback to Atlas Brain
        return await this.thinkWithAtlas(request);
      } catch (atlasError) {
        console.error('[UNIFIED-BRAIN] Atlas Fallback failed:', atlasError);
        return this.fallbackResponse(request);
      }
    }
  }

  /**
   * Think using KONTUR Cortex providers (Real Intelligence)
   * Uses ProviderRouter for multi-provider support with fallback
   */
  private async thinkWithCortex(
    request: ThinkRequest
  ): Promise<ThinkResponse> {
    const mode = request.mode || 'chat';
    console.log(`[UNIFIED-BRAIN] 🧠 Engaging Cortex via ProviderRouter in ${mode} mode...`);

    try {
      const router = getProviderRouter();
      const systemPrompt = `${request.system_prompt}\n\nIMPORTANT: Think in ENGLISH. Reply in UKRAINIAN.`;

      // Use ProviderRouter for LLM generation
      const response = await router.generateLLM('brain', {
        prompt: request.user_prompt,
        systemPrompt,
        responseFormat: mode === 'planning' ? 'json' : 'text',
        temperature: 0.7
      });

      const content = response.text;

      if (!content) {
        throw new Error('Empty response from Cortex');
      }

      console.log(`[UNIFIED-BRAIN] ✅ Response from ${response.provider} (${response.model})`);

      // Handle response based on mode
      if (mode === 'chat') {
        // Simple text response for chat
        return {
          text: content,
          usage: {
            input_tokens: response.usage?.promptTokens || 0,
            output_tokens: response.usage?.completionTokens || 0
          }
        };
      } else {
        // JSON parsing for planning mode
        let parsed: any;
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          // Fallback if model didn't return pure JSON
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Failed to parse JSON from Cortex response');
          }
        }

        return {
          text: JSON.stringify(parsed),
          tool_calls: (parsed.plan as PlanStep[])?.map((step) => ({
            name: step.tool,
            args: step.args
          })) || [],
          usage: {
            input_tokens: response.usage?.promptTokens || 0,
            output_tokens: response.usage?.completionTokens || 0
          }
        };
      }

    } catch (error: any) {
      console.error('[UNIFIED-BRAIN] ❌ Cortex Reasoning Failed:', error.message);
      throw error;
    }
  }

  /**
   * Think using Atlas Brain (fallback)
   */
  private async thinkWithAtlas(
    request: ThinkRequest
  ): Promise<ThinkResponse> {
    if (!this.atlasAPI) {
      console.warn('[UNIFIED-BRAIN] Atlas Brain not available');
      return this.fallbackResponse(request);
    }

    console.log('[UNIFIED-BRAIN] Falling back to Atlas Brain...');

    return await this.atlasAPI.think(request);
  }

  /**
   * Enrich Cortex response with Atlas context
   */
  private async enrichWithAtlasContext(
    response: ThinkResponse,
    request: ThinkRequest
  ): Promise<ThinkResponse> {
    if (!this.atlasAPI) {
      return response;
    }

    try {
      // Get Atlas perspective on same request
      const atlasResponse = await this.atlasAPI.think({
        ...request,
        system_prompt: `${request.system_prompt}. Also provide Atlas architectural perspective.`,
      });

      // Merge responses
      return {
        ...response,
        text: `${response.text}\n\n[Atlas Context]: ${atlasResponse.text || ''}`,
      };
    } catch (error) {
      console.warn('[UNIFIED-BRAIN] Context enrichment failed:', error);
      return response;
    }
  }

  /**
   * Coordinate planning between Cortex and Atlas
   */
  async coordinatePlanning(goal: string): Promise<any> {
    console.log(`[UNIFIED-BRAIN] Planning goal: ${goal}`);

    // 1. Get Atlas plan
    let atlasPlan = null;
    if (this.atlasOrganAPI) {
      atlasPlan = await this.atlasOrganAPI.plan({ goal });
    }

    // 2. Get Cortex reasoning
    const cortexReasoning = await this.think({
      system_prompt: 'You are KONTUR Cortex. Create optimized execution plan.',
      user_prompt: `Goal: ${goal}. Atlas plan: ${JSON.stringify(atlasPlan)}`,
    });

    return {
      goal,
      atlas_plan: atlasPlan,
      cortex_reasoning: cortexReasoning,
      merged_strategy: this.mergePlanningStrategies(atlasPlan, cortexReasoning),
    };
  }

  /**
   * Merge Atlas and Cortex planning strategies
   */
  private mergePlanningStrategies(atlas: any, cortex: ThinkResponse): any[] {
    const steps: any[] = [];

    // Add Atlas structural planning
    if (atlas?.steps) {
      steps.push({
        source: 'atlas',
        phase: 'structured_planning',
        steps: atlas.steps,
      });
    }

    // Add Cortex optimized steps
    if (cortex.text) {
      steps.push({
        source: 'cortex',
        phase: 'optimized_execution',
        reasoning: cortex.text,
      });
    }

    return steps;
  }

  /**
   * Fallback response when all systems fail
   */
  private fallbackResponse(request: ThinkRequest): ThinkResponse {
    console.log('[UNIFIED-BRAIN] Using fallback response');

    return {
      text: JSON.stringify({
        message: 'Fallback response from Unified Brain',
        original_prompt: request.user_prompt,
        suggestion: 'Please check AI provider configuration',
      }),
    };
  }

  /**
   * Process packet with unified reasoning
   */
  /**
   * Process packet with unified reasoning
   * OVERRIDES CortexBrain.process to ensure we use the new 'think' logic
   */
  async process(packet: KPP_Packet): Promise<void> {
    const prompt = packet.payload.prompt || packet.instruction.op_code;
    console.log(`[UNIFIED-BRAIN] 🧠 Processing: "${prompt}"`);

    try {
      // 1. Detect mode based on packet intent and prompt content
      const mode = this.detectMode(prompt, packet);

      // 2. Get ATLAS persona for chat, use specialized prompt for planning
      const atlasPersona = getPersona('ATLAS');
      const systemPrompt = mode === 'chat'
        ? atlasPersona.systemPrompt
        : 'You are ATLAS, the Architect. Create a structured execution plan.';

      // 3. Think using the new architecture with detected mode
      const response = await this.think({
        system_prompt: systemPrompt,
        user_prompt: prompt,
        mode,
        tools: [], // We could inject tools here if we had them in request
      });

      // 3. Handle response based on mode
      if (!response.text) throw new Error("No response text from Brain");

      if (mode === 'chat') {
        // Simple chat - emit text directly without JSON parsing
        const chatPacket = createPacket(
          'kontur://cortex/ai/main',
          'kontur://organ/ui/shell',
          PacketIntent.EVENT,
          { msg: response.text, type: 'chat' }
        );
        this.emit('decision', chatPacket);
      } else {
        // Planning mode - parse JSON and emit structured plan
        let decision: any;
        try {
          decision = JSON.parse(response.text);
        } catch (e) {
          // Fallback if already parsed or malformed
          decision = { response: response.text, thought: "Raw output", plan: [] };
        }

        // If there is a plan
        if (decision.plan && decision.plan.length > 0) {
          const systemPacket = createPacket(
            'kontur://cortex/ai/main',
            'kontur://core/system',
            PacketIntent.AI_PLAN,
            {
              reasoning: decision.thought,
              user_response: decision.response,
              steps: decision.plan.map((step: PlanStep) => ({
                tool: step.tool,
                action: step.action,
                args: step.args,
                target: step.target || 'kontur://organ/worker' // Default, router handles optimization
              }))
            }
          );
          this.emit('decision', systemPacket);

          // Also emit chat if present
          if (decision.response) {
            const chatPacket = createPacket(
              'kontur://cortex/ai/main',
              'kontur://organ/ui/shell',
              PacketIntent.EVENT,
              { msg: decision.response, type: 'chat', reasoning: decision.thought }
            );
            this.emit('decision', chatPacket);
          }
        } else {
          // Just Chat from planning response
          const chatPacket = createPacket(
            'kontur://cortex/ai/main',
            'kontur://organ/ui/shell',
            PacketIntent.EVENT,
            { msg: decision.response || response.text, type: 'chat', reasoning: decision.thought }
          );
          this.emit('decision', chatPacket);
        }
      }

    } catch (error: any) {
      console.error('[UNIFIED-BRAIN] ❌ Process Error:', error);
      const errorPacket = createPacket(
        'kontur://cortex/ai/main',
        'kontur://organ/ui/shell',
        PacketIntent.ERROR,
        { error: error.message, msg: "Brain Failure: " + error.message }
      );
      this.emit('decision', errorPacket);
    }
  }

  /**
   * Detect whether request should use chat or planning mode
   */
  private detectMode(prompt: string, packet: KPP_Packet): 'chat' | 'planning' {
    // If intent is already AI_PLAN - this is planning
    if (packet.instruction.intent === PacketIntent.AI_PLAN) {
      console.log(`[UNIFIED-BRAIN] 🔍 Mode: planning (intent=${packet.instruction.intent})`);
      return 'planning';
    }

    // Check for planning keywords in prompt
    const planningKeywords = ['plan', 'execute', 'task', 'do', 'create', 'build', 'make', 'develop', 'implement'];
    const lowerPrompt = prompt.toLowerCase();

    const matchedKeyword = planningKeywords.find(kw => lowerPrompt.includes(kw));
    if (matchedKeyword) {
      console.log(`[UNIFIED-BRAIN] 🔍 Mode: planning (keyword="${matchedKeyword}" in "${prompt}")`);
      return 'planning';
    }

    // Default to chat for greetings and questions
    console.log(`[UNIFIED-BRAIN] 🔍 Mode: chat (default for "${prompt}")`);
    return 'chat';
  }

  async processUnified(packet: KPP_Packet): Promise<KPP_Packet> {
    const response = await this.think({
      system_prompt: 'You are KONTUR Unified Brain',
      user_prompt: packet.payload.prompt || JSON.stringify(packet.payload),
    });

    const resultPacket = createPacket(
      packet.route.to,
      packet.route.from,
      PacketIntent.RESPONSE,
      {
        reasoning: response.text,
        tool_calls: response.tool_calls,
        timestamp: Date.now(),
      }
    );

    return resultPacket;
  }
}

export function createUnifiedBrain(): UnifiedBrain {
  return new UnifiedBrain();
}
