/**
 * Unified Brain - Integration of Atlas Brain + KONTUR Cortex
 * Coordinates planning, execution, safety through unified AI engine
 * Supports multiple AI providers with Atlas fallback
 */

import { GoogleGenAI } from '@google/genai';
import { EventEmitter } from 'events';
import { CortexBrain } from './brain';
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

export class UnifiedBrain extends CortexBrain {
  private atlasAPI: BrainAPI | null = null;
  private atlasOrganAPI: AtlasAPI | null = null;

  constructor() {
    super();
    console.log('[UNIFIED-BRAIN] 🧠🔗 Unified Brain initialized');
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

      // 2. If Cortex succeeds, return enriched with Atlas insights
      if (cortexResponse.text) {
        const enrichedResponse = await this.enrichWithAtlasContext(
          cortexResponse,
          request
        );
        return enrichedResponse;
      }

      // 3. Fallback to Atlas Brain
      return await this.thinkWithAtlas(request);
    } catch (error) {
      console.error('[UNIFIED-BRAIN] Error:', error);
      return this.fallbackResponse(request);
    }
  }

  /**
   * Think using KONTUR Cortex providers (Real Intelligence)
   */
  private async thinkWithCortex(
    request: ThinkRequest
  ): Promise<ThinkResponse> {
    console.log('[UNIFIED-BRAIN] 🧠 Engaging Cortex Intelligence (Gemini 2.0)...');

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_LIVE_API_KEY;

    if (!apiKey) {
      console.error('[UNIFIED-BRAIN] ❌ No API key found for Cortex');
      throw new Error('No AI provider configured');
    }

    try {
      const genAI = new GoogleGenAI({ apiKey });
      // User requested 'gemini-2.5-flash'
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      console.log(`[UNIFIED-BRAIN] 🧠 Engaging Cortex Intelligence (${modelName})...`);

      const systemPrompt = `${request.system_prompt}\n\nIMPORTANT: Think in ENGLISH. Reply in UKRAINIAN.`;

      const response = await genAI.models.generateContent({
        model: modelName,
        contents: [
          { role: 'user', parts: [{ text: request.user_prompt }] }
        ],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7, // Balance between creativity and precision
          responseMimeType: 'application/json', // Force JSON structure
          // safetySettings: ... (Configure as needed)
        }
      });

      const content = response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error('Empty response from Cortex');
      }

      // Parse JSON response safely
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        // Fallback if model didn't return pure JSON (sometimes adds markdown blocks)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse JSON from Cortex response');
        }
      }

      return {
        text: JSON.stringify(parsed), // Keep consistent format for internal passing
        tool_calls: parsed.plan?.map((step: any) => ({
          name: step.tool,
          args: step.args
        })) || [],
        usage: {
          input_tokens: response.usageMetadata?.promptTokenCount || 0,
          output_tokens: response.usageMetadata?.candidatesTokenCount || 0
        }
      };

    } catch (error: any) {
      console.error('[UNIFIED-BRAIN] ❌ Cortex Reasoning Failed:', error.message);
      throw error; // Let the fallback mechanism handle it
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
      // 1. Think using the new architecture
      const response = await this.think({
        system_prompt: 'You are KONTUR Unified Brain (Gemini 2.0).',
        user_prompt: prompt,
        tools: [], // We could inject tools here if we had them in request
      });

      // 2. Parse the result (The 'think' method returns text which is JSON string)
      if (!response.text) throw new Error("No response text from Brain");

      let decision: any;
      try {
        decision = JSON.parse(response.text);
      } catch (e) {
        // Fallback if already parsed or malformed
        decision = { response: response.text, thought: "Raw output", plan: [] };
      }

      // 3. Emit Decision (Standard Cortex Protocol)
      // We construct a similar structure to CortexBrain.handlePlan/handleChat

      // If there is a plan
      if (decision.plan && decision.plan.length > 0) {
        const systemPacket = createPacket(
          'kontur://cortex/ai/main',
          'kontur://core/system',
          PacketIntent.AI_PLAN,
          {
            reasoning: decision.thought,
            user_response: decision.response,
            steps: decision.plan.map((step: any) => ({
              tool: step.tool,
              action: step.action,
              args: step.args,
              target: 'kontur://organ/worker' // Default, router handles optimization
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
        // Just Chat
        const chatPacket = createPacket(
          'kontur://cortex/ai/main',
          'kontur://organ/ui/shell',
          PacketIntent.EVENT,
          { msg: decision.response, type: 'chat', reasoning: decision.thought }
        );
        this.emit('decision', chatPacket);
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
