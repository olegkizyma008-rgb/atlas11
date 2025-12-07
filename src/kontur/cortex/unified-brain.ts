/**
 * Unified Brain - Integration of Atlas Brain + KONTUR Cortex
 * Coordinates planning, execution, safety through unified AI engine
 * Supports multiple AI providers with Atlas fallback
 */

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
   * Think using KONTUR Cortex providers
   */
  private async thinkWithCortex(
    request: ThinkRequest
  ): Promise<ThinkResponse> {
    // Simulate Cortex reasoning
    console.log('[UNIFIED-BRAIN] Using Cortex for reasoning...');

    const provider = process.env.AI_PROVIDER || 'gemini';
    const apiKey = process.env.AI_API_KEY || '';

    if (!apiKey) {
      throw new Error('No AI provider configured');
    }

    // In real implementation, call actual API
    // For now, simulate structured response
    return {
      text: JSON.stringify({
        reasoning: 'Unified reasoning process',
        steps: ['Analyze', 'Plan', 'Execute'],
        provider,
      }),
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    };
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
