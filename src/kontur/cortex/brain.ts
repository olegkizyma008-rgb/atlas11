/**
 * Cortex Brain - AI Reasoning Engine for KONTUR
 * Integrates with OpenAI, Gemini, and Claude for intelligent planning
 */

import { EventEmitter } from 'events';
import { KPP_Packet, SecurityScope, createPacket, PacketIntent } from '../protocol/nexus';
import * as crypto from 'crypto';

interface AIProvider {
  name: string;
  apiKey?: string;
  available: boolean;
}

export class CortexBrain extends EventEmitter {
  private urn = 'kontur://cortex/ai/main';
  private provider: string = process.env.AI_PROVIDER || 'gemini';
  private apiKey: string = process.env.AI_API_KEY || '';

  private toolsMap: Record<string, string> = {
    calculator: 'kontur://organ/worker',
    memory: 'kontur://organ/memory',
    ui: 'kontur://organ/ui/shell',
    ag_sim: 'kontur://organ/ag/sim',
  };

  private providers: AIProvider[] = [
    { name: 'gemini', available: !!process.env.GEMINI_API_KEY },
    { name: 'openai', available: !!process.env.OPENAI_API_KEY },
    { name: 'claude', available: !!process.env.ANTHROPIC_API_KEY },
  ];

  constructor() {
    super();
    console.log(`[CORTEX] 🧠 Initialized with provider: ${this.provider}`);
  }

  /**
   * Process incoming packet and generate reasoning/plans
   */
  async process(packet: KPP_Packet) {
    const prompt = packet.payload.prompt || packet.instruction.op_code;
    console.log(`[CORTEX] 🤔 Reasoning about: ${prompt}`);

    try {
      // Detect if this is a simple chat (greeting, question) vs task request
      const isChat = this.isChatMessage(prompt);

      if (isChat) {
        console.log(`[CORTEX] 💬 Chat mode detected`);
        const chatResponse = await this.handleChat(prompt);

        const chatPacket = createPacket(
          this.urn,
          'kontur://organ/ui/shell',
          PacketIntent.EVENT,
          { msg: chatResponse, type: 'chat' }
        );

        this.emit('decision', chatPacket);
        return;
      }

      console.log(`[CORTEX] 📋 Task mode detected`);
      let aiResponse: any = { reasoning: 'Default reasoning', plan: [] };

      // Try primary provider first
      if (this.provider === 'gemini' && process.env.GEMINI_API_KEY) {
        aiResponse = await this.reasonWithGemini(packet);
      } else if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
        aiResponse = await this.reasonWithOpenAI(packet);
      } else if (this.provider === 'claude' && process.env.ANTHROPIC_API_KEY) {
        aiResponse = await this.reasonWithClaude(packet);
      } else {
        aiResponse = this.fallbackReasoning(packet);
      }

      // Enhance plan with AG if low gravity
      if (packet.nexus.gravity_factor < 0.5) {
        aiResponse.plan.push({
          tool: 'ag_sim',
          action: 'LEVITATE',
          args: { msg: 'AG: Floating task for zero-g optimization' },
        });
      }

      // Create system packet with plan
      const systemPacket = createPacket(
        this.urn,
        'kontur://core/system',
        PacketIntent.AI_PLAN,
        {
          reasoning: aiResponse.reasoning,
          steps: aiResponse.plan.map((step: any) => ({
            target: this.toolsMap[step.tool] || step.tool,
            action: step.action,
            args: step.args,
          })),
        },
        { quantum_state: { amp1: 0.7, amp2: 0.3 } }
      );

      this.emit('decision', systemPacket);
    } catch (e) {
      console.error(`[CORTEX ERROR]:`, e);
      const errorPacket = createPacket(
        this.urn,
        'kontur://core/system',
        PacketIntent.ERROR,
        {
          error: e instanceof Error ? e.message : String(e),
        }
      );
      this.emit('error', errorPacket);
    }
  }

  /**
   * Detect if message is a simple chat (greeting, question) vs action request
   */
  private isChatMessage(prompt: string): boolean {
    const normalizedPrompt = prompt.toLowerCase().trim();

    // Greetings patterns (Ukrainian and English)
    const greetings = [
      'привіт', 'вітаю', 'доброго', 'добрий', 'здоров', 'хай', 'салют',
      'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'
    ];

    // Chat questions patterns
    const chatPatterns = [
      'як справи', 'що нового', 'як ти', 'хто ти', 'що ти',
      'how are you', 'what are you', 'who are you', "what's up"
    ];

    // Task action words (should trigger task mode)
    const taskActionWords = [
      'відкрий', 'запусти', 'створи', 'обчисли', 'порахуй', 'знайди', 'покажи',
      'open', 'launch', 'create', 'calculate', 'compute', 'find', 'show', 'run'
    ];

    // If contains action word, it's a task
    for (const action of taskActionWords) {
      if (normalizedPrompt.includes(action)) {
        return false;
      }
    }

    // If it's a greeting or chat question, it's chat
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

    // Short messages without action verbs are likely chat
    if (normalizedPrompt.split(' ').length <= 3 && !normalizedPrompt.includes('?')) {
      return true;
    }

    return false;
  }

  /**
   * Handle simple chat messages with direct AI response
   */
  private async handleChat(prompt: string): Promise<string> {
    const normalizedPrompt = prompt.toLowerCase().trim();

    // Simple greeting responses
    if (normalizedPrompt.includes('привіт') || normalizedPrompt.includes('hello') || normalizedPrompt.includes('hi')) {
      return 'Привіт! Я ATLAS — твій AI-асистент. Чим можу допомогти?';
    }

    if (normalizedPrompt.includes('як справи') || normalizedPrompt.includes('how are you')) {
      return 'Все чудово, дякую! Працюю на повну потужність. Чим можу допомогти?';
    }

    if (normalizedPrompt.includes('хто ти') || normalizedPrompt.includes('who are you')) {
      return 'Я ATLAS — система штучного інтелекту з архітектурою KONTUR. Можу допомогти з розрахунками, запуском додатків та іншими задачами.';
    }

    // Default friendly response
    return `Зрозумів! Якщо потрібна допомога з конкретною задачею — просто скажи. Наприклад: "Відкрий калькулятор" або "Порахуй 2+2".`;
  }

  /**
   * Reasoning with Google Gemini
   */
  private async reasonWithGemini(packet: KPP_Packet): Promise<any> {
    try {
      // Placeholder for actual Gemini integration
      // In production: use @google/generative-ai SDK
      const prompt = packet.nexus.gen_prompt || packet.payload.prompt || 'Analyze and plan';

      // Simulated response
      return {
        reasoning: `Analyzed prompt: ${prompt}`,
        plan: [
          { tool: 'ui', action: 'UPDATE', args: { msg: `I received your request: "${prompt}". Processing...` } },
          { tool: 'memory', action: 'STORE', args: { data: prompt } },
          { tool: 'calculator', action: 'EXECUTE', args: { task: 'process' } },
        ],
      };
    } catch (e) {
      console.error('[CORTEX-GEMINI] Error:', e);
      return this.fallbackReasoning(packet);
    }
  }

  /**
   * Reasoning with OpenAI GPT
   */
  private async reasonWithOpenAI(packet: KPP_Packet): Promise<any> {
    try {
      // Placeholder for actual OpenAI integration
      // In production: use openai SDK
      const prompt = packet.nexus.gen_prompt || packet.payload.prompt || 'Analyze and plan';

      return {
        reasoning: `GPT Analysis: ${prompt}`,
        plan: [
          { tool: 'memory', action: 'STORE', args: { data: prompt } },
          { tool: 'ui', action: 'UPDATE', args: { msg: 'Processing...' } },
        ],
      };
    } catch (e) {
      console.error('[CORTEX-OPENAI] Error:', e);
      return this.fallbackReasoning(packet);
    }
  }

  /**
   * Reasoning with Anthropic Claude
   */
  private async reasonWithClaude(packet: KPP_Packet): Promise<any> {
    try {
      // Placeholder for actual Claude integration
      // In production: use @anthropic-ai/sdk
      const prompt = packet.nexus.gen_prompt || packet.payload.prompt || 'Analyze and plan';

      return {
        reasoning: `Claude Reasoning: ${prompt}`,
        plan: [
          { tool: 'memory', action: 'STORE', args: { data: prompt } },
          { tool: 'calculator', action: 'EXECUTE', args: { task: 'analyze' } },
        ],
      };
    } catch (e) {
      console.error('[CORTEX-CLAUDE] Error:', e);
      return this.fallbackReasoning(packet);
    }
  }

  /**
   * Fallback reasoning when no AI provider available
   */
  private fallbackReasoning(packet: KPP_Packet): any {
    console.warn('[CORTEX] Using fallback reasoning (no AI provider available)');

    return {
      reasoning: 'Fallback reasoning: Simple pattern matching',
      plan: [
        { tool: 'memory', action: 'LOG', args: { msg: packet.payload.prompt || 'No prompt' } },
      ],
    };
  }

  /**
   * Generate code for given task with AI
   */
  async genCode(packet: KPP_Packet): Promise<string> {
    let prompt = packet.nexus.gen_prompt || `Generate ${packet.payload.lang || 'typescript'} code for ${packet.payload.task}.`;

    if (packet.nexus.gravity_factor < 0.5) {
      prompt += ' Optimize for zero-gravity (low overhead) using physics-js or similar.';
    }

    console.log(`[CORTEX] 💻 Generating code with prompt: ${prompt}`);

    // Placeholder for actual code generation
    // In production: would call AI API and get actual code
    return `// Auto-generated code for: ${packet.payload.task}\nconsole.log('Generated code placeholder');`;
  }

  /**
   * Get available AI providers
   */
  public getProviders(): AIProvider[] {
    return this.providers;
  }

  /**
   * Check provider health
   */
  public async checkHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const provider of this.providers) {
      health[provider.name] = provider.available;
    }

    return health;
  }
}
