
import { Plan, PlanStep } from '../atlas/contract';
import { KPP_Packet } from '../../kontur/protocol/nexus'; // Corrected import
import { OpenInterpreterBridge } from './open_interpreter_bridge';
import { createPacket, PacketIntent } from '../../kontur/protocol/nexus';
import { Core } from '../../kontur/core/dispatcher';
import { EventEmitter } from 'events';
import { getGrishaVisionService, GrishaVisionService, VisionObservationResult } from '../../kontur/vision/GrishaVisionService';
import { getVisionConfig, getExecutionConfig } from '../../kontur/providers/config';
import { getToolRegistry } from '../../kontur/core/ToolRegistry';

export class TetyanaExecutor extends EventEmitter {
    private core: Core;
    private currentPlan: Plan | null = null;
    private active: boolean = false;
    private visionService: GrishaVisionService | null = null;
    private lastActiveApp: string | null = null; // Track last focused app for vision

    constructor(core: Core) {
        super();
        this.core = core;
    }

    /**
     * Set Vision Service (for main process integration)
     */
    setVisionService(service: GrishaVisionService) {
        this.visionService = service;
        console.log('[TETYANA] 👁️ Vision service connected');
    }

    /**
     * Start executing a plan
     */
    public async execute(plan: Plan, inputPacket: KPP_Packet): Promise<void> {
        const executionConfig = getExecutionConfig();
        const usePythonBridge = executionConfig.engine === 'python-bridge';

        if (this.active) {
            console.warn('[TETYANA] Already executing a plan. Queuing not implemented yet.');
            return;
        }

        this.active = true;
        this.currentPlan = plan;
        console.log(`[TETYANA] ⚡ Taking control of Plan ${plan.id} (${plan.steps.length} steps) [Engine: ${usePythonBridge ? 'HYBRID (Python+Native)' : 'NATIVE'}]`);

        // Notify UI of start
        // this.emitStatus("starting", `Починаю виконання: ${plan.goal}`);

        // Start Vision observation
        await this.startVisionObservation(plan.goal);

        // 🛡️ VALIDATE ALL TOOLS BEFORE EXECUTION
        const registry = getToolRegistry();
        // Skip validation for Python Bridge as it handles tools dynamically
        if (!usePythonBridge && registry.isInitialized()) {
            const validation = registry.validatePlanTools(plan.steps);
            if (!validation.valid) {
                const errorDetail = validation.errors.map(err => {
                    const toolName = err.replace("Unknown tool: '", "").replace("'", "");
                    const similar = registry.findSimilarTools(toolName);
                    return similar.length > 0
                        ? `${err}. Did you mean: ${similar.join(', ')}?`
                        : err;
                }).join('; ');

                console.error(`[TETYANA] ❌ Plan validation failed: ${errorDetail}`);
                this.emitStatus("error", `Невідомі інструменти: ${errorDetail}`);
                throw new Error(`Plan validation failed: ${errorDetail}`);
            }
            console.log(`[TETYANA] ✅ All ${plan.steps.length} tools validated`);
        } else if (!usePythonBridge) { // Only warn if not using Python bridge and registry isn't initialized
            console.warn('[TETYANA] ⚠️ ToolRegistry not initialized, skipping validation');
        }


        try {
            const MAX_RETRIES = 3;

            for (let i = 0; i < plan.steps.length; i++) {
                if (!this.active) break;

                const step = plan.steps[i];
                const stepNum = i + 1;
                console.log(`[TETYANA] ▶️ Step ${stepNum}: ${step.action}`);

                // 🛑 SYSTEM 2 THINKING (Gemini 3)
                if (plan.steps.length > 3 && i === 0) {
                    this.emitStatus("thinking", "🤔 Аналізую план дій (Gemini 3)...");
                    await this.consultReasoning(plan);
                }

                // --- RETRY LOOP ---
                let attempts = 0;
                let verified = false;
                let feedbackContext: string = ""; // Feedback from Grisha to guide retry

                while (!verified && attempts < MAX_RETRIES) {
                    attempts++;
                    if (attempts > 1) {
                        console.warn(`[TETYANA] 🔄 Retry Attempt ${attempts}/${MAX_RETRIES} for Step ${stepNum}...`);
                        this.emitStatus("warning", `Корекція кроку ${stepNum} (Спроба ${attempts})...`);
                    }

                    // 👁️ VISION OPTIMIZATION: Pause during step execution
                    const vision = this.visionService || getGrishaVisionService();
                    vision.pauseCapture();

                    // 🎯 Auto-select window logic
                    // Support both camelCase and snake_case argument names
                    let appName = step.args?.appName || step.args?.app_name || step.args?.app || step.args?.name || step.args?.application;

                    if (!appName && (step.action === 'open_application' || step.action === 'open' || step.action === 'launch')) {
                        appName = step.args?.arg1 || step.args?.target || step.args?.app_name;
                    }

                    const APP_NAME_MAP: Record<string, string> = {
                        'calculator': 'Calculator',
                        'калькулятор': 'Calculator',
                        'safari': 'Safari',
                        'сафарі': 'Safari',
                        'chrome': 'Google Chrome',
                        'terminal': 'Terminal',
                        'термінал': 'Terminal',
                        'notes': 'Notes',
                        'нотатки': 'Notes',
                        'finder': 'Finder',
                        'textedit': 'TextEdit',
                    };
                    if (!appName && APP_NAME_MAP[step.action.toLowerCase()]) {
                        appName = APP_NAME_MAP[step.action.toLowerCase()];
                    }

                    const stepDescription = (step as any).description;
                    if (!appName && stepDescription) {
                        const descMatch = stepDescription.match(/(?:відкрити|open|launch|в програмі|in)\s+([A-Za-zА-Яа-яіІїЇєЄ0-9]+)/i);
                        if (descMatch) {
                            appName = descMatch[1];
                        }
                    }

                    if (!appName && step.action.includes('_')) {
                        const parts = step.action.split('_');
                        if (APP_NAME_MAP[parts[1]?.toLowerCase()]) {
                            appName = APP_NAME_MAP[parts[1].toLowerCase()];
                        }
                    }

                    if (appName) {
                        console.log(`[TETYANA] 🎯 Targeting window: ${appName}`);
                        this.lastActiveApp = appName;
                        await vision.autoSelectSource(appName);
                    } else if (this.lastActiveApp) {
                        console.log(`[TETYANA] 👁️ Re-selecting last app: ${this.lastActiveApp}`);
                        await vision.autoSelectSource(this.lastActiveApp);
                    } else {
                        console.warn(`[TETYANA] ⚠️ Unknown target app. Vision might lose context.`);
                    }

                    // 1. Validate with Grisha (security check)
                    if (attempts === 1) await this.validateStep(step, stepNum);

                    // 2. Execute Step (Via Bridge)
                    console.log(`[TETYANA] 🐍 Routing to Python Bridge (High Power Mode)...`);
                    await this.executeStepViaBridge(step, stepNum, feedbackContext);

                    // 👁️ VISION RESUME
                    vision.resumeCapture();

                    // 3. Vision Verification
                    console.log(`[TETYANA] 👁️ Requesting Grisha verification for step ${stepNum}...`);
                    if (this.lastActiveApp) {
                        console.log(`[TETYANA] 🎯 Verification focused on window: ${this.lastActiveApp}`);
                    }

                    const visionResult = await this.verifyStepWithVision(step, stepNum);

                    // 4. Check Verification Result
                    if (visionResult && visionResult.verified) {
                        console.log(`[TETYANA] ✅ Grisha confirmed: ${visionResult.message.slice(0, 100)}`);
                        verified = true;
                    } else {
                        const reason = visionResult?.message || "Unknown verification failure";
                        console.warn(`[TETYANA] ⚠️ Grisha Rejected Step ${stepNum}: ${reason}`);

                        feedbackContext = `PREVIOUS ATTEMPT FAILED. 
Vision Feedback: "${reason}". 
CORRECTION REQUIRED: Please analyze what went wrong and try a different approach/keys/command.`;
                    }
                } // End Retry Loop

                if (!verified) {
                    throw new Error(`Step ${stepNum} failed validation after ${MAX_RETRIES} attempts. Grisha refused to approve.`);
                }

                // 5. Report Success
                this.emitStatus("progress", `Крок ${stepNum} виконано: ${step.action}`);
            }

            // Stop Vision observation
            this.stopVisionObservation();

            if (this.active) {
                this.emitStatus("completed", `План успішно завершено.`);
            }

        } catch (error: any) {
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
    public stop() {
        if (this.active) {
            console.log('[TETYANA] 🛑 Emergency Stop requested');
            this.active = false;
            this.stopVisionObservation();
            this.emitStatus("stopped", "Виконання зупинено.");
        }
    }

    /**
     * Start Vision observation for the plan
     */
    private async startVisionObservation(goal: string) {
        const vision = this.visionService || getGrishaVisionService();
        const config = getVisionConfig();

        console.log(`[TETYANA] 👁️ Starting Vision observation[${config.mode.toUpperCase()}]`);

        try {
            await vision.startObservation(goal);
        } catch (e) {
            console.warn('[TETYANA] Vision observation failed to start:', e);
        }
    }

    /**
     * Stop Vision observation
     */
    private stopVisionObservation() {
        const vision = this.visionService || getGrishaVisionService();
        vision.stopObservation();
    }

    /**
     * Verify step with Vision (Grisha sees if it worked)
     */
    private async verifyStepWithVision(step: PlanStep, stepNum: number): Promise<VisionObservationResult | null> {
        const vision = this.visionService || getGrishaVisionService();

        try {
            // Enhanced Context: Explicitly tell Grisha about the target app and human-readable action
            const humanReadable = this.getHumanReadableAction(step, this.lastActiveApp);
            const targetApp = this.lastActiveApp || undefined;

            const result = await vision.verifyStep(
                humanReadable,
                `Крок ${stepNum}: ${JSON.stringify(step.args || {})}`,
                this.currentPlan ? this.currentPlan.goal : undefined,
                targetApp
            );
            return result;
        } catch (e) {
            console.warn('[TETYANA] Vision verification failed:', e);
            return null;
        }
    }

    /**
     * Helper: Convert PlanStep to Human Readable String
     */
    private getHumanReadableAction(step: PlanStep, targetApp: string | null): string {
        try {
            const args = step.args || {};
            // Prioritize lastActiveApp, then check all possible arg variants
            const app = targetApp || args.appName || args.app_name || args.app || args.application || "Application";

            switch (step.action.toLowerCase()) {
                case 'input':
                case 'type':
                    if (args.arg1 === '=') return `Press '=' in ${app}`;
                    if (args.arg1 && args.arg1.length === 1 && /[^a-zA-Z0-9]/.test(args.arg1)) {
                        return `Type Symbol '${args.arg1}' in ${app}`;
                    }
                    if (args.text || args.arg1) {
                        return `Type '${args.text || args.arg1}' in ${app}`;
                    }
                    return `Type in ${app}`;

                case 'launch':
                case 'open':
                case 'open_application':
                    return `Open ${app}`;

                case 'click':
                    if (args.element) return `Click ${args.element} in ${app}`;
                    if (args.text) return `Click text '${args.text}' in ${app}`;
                    return `Click in ${app}`;

                case 'press':
                case 'hotkey':
                    return `Press Hotkey ${args.keys || args.key || args.arg1} in ${app}`;

                default:
                    // Default fallback
                    return `${step.action} in ${app}`;
            }
        } catch (e) {
            return step.action;
        }
    }

    /**
     * Consult the Reasoning Organ (Gemini 3)
     */
    private async consultReasoning(plan: Plan): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`[TETYANA] 🧠 Consulting Reasoning Organ...`);

            const reqId = `reason-${Date.now()}`;

            // Handler for Reasoning Response
            const handler = (packet: KPP_Packet) => {
                if (packet.instruction.intent === PacketIntent.RESPONSE && packet.nexus.correlation_id === reqId) {
                    this.core.removeListener('ingest', handlerWrapper);
                    console.log(`[TETYANA] 🧠 Advice Received:`, packet.payload.result);
                    // Just log for now, but in future we could modify plan
                    resolve();
                }
            };
            const handlerWrapper = (p: KPP_Packet) => handler(p);
            this.core.on('ingest', handlerWrapper);

            const packet = createPacket(
                'kontur://organ/tetyana',
                'kontur://organ/reasoning',
                PacketIntent.CMD,
                {
                    prompt: `Review this plan for safety and efficiency: ${JSON.stringify(plan.steps.map(s => s.action))}`,
                    level: 'high'
                }
            );
            packet.nexus.correlation_id = reqId;
            packet.instruction.op_code = 'think';
            packet.route.reply_to = 'kontur://organ/tetyana';

            this.core.ingest(packet);

            // Timeout (don't block forever)
            setTimeout(() => {
                this.core.removeListener('ingest', handlerWrapper);
                console.warn("[TETYANA] 🧠 Reasoning Timeout. Proceeding anyway.");
                resolve();
            }, 15000); // 15s for deep thinking
        });
    }

    /**
     * Ask Grisha for permission
     */
    private async validateStep(step: PlanStep, stepNum: number): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`[TETYANA] 🛡️ Asking Grisha to validate step ${stepNum}...`);

            // Generate unique ID for this verification request
            const verifId = `verif-${Date.now()}-${Math.random()}`;

            // Setup one-time listener for Grisha's response
            const responseHandler = (packet: KPP_Packet) => {
                if (packet.instruction.intent === PacketIntent.RESPONSE && packet.nexus.correlation_id === verifId) {
                    this.core.removeListener('ingest', responseHandlerWrapper);

                    if (packet.payload.allowed) {
                        console.log(`[TETYANA] ✅ Grisha Approved.`);
                        resolve();
                    } else {
                        reject(new Error(`Security Restriction: ${packet.payload.reason}`));
                    }
                }
            };

            // We need to tap into Core's ingestion to see the reply
            // In a real event bus, we'd subscribe. querying Core event emitter:
            const responseHandlerWrapper = (p: KPP_Packet) => responseHandler(p);
            this.core.on('ingest', responseHandlerWrapper);

            // Send VALIDATE packet
            const packet = createPacket(
                'kontur://organ/tetyana',
                'kontur://organ/grisha', // Assuming Grisha listens here
                PacketIntent.QUERY,
                {
                    action: step.action,
                    args: step.args,
                    stepNum
                }
            );
            packet.instruction.op_code = 'VALIDATE';
            packet.route.reply_to = 'kontur://organ/tetyana';
            packet.nexus.correlation_id = verifId;

            this.core.ingest(packet);

            // Timeout
            setTimeout(() => {
                this.core.removeListener('ingest', responseHandlerWrapper);

                if (process.env.NODE_ENV === 'development') {
                    console.warn("[TETYANA] ⚠️ Grisha Timeout. Proceeding (DEV MODE).");
                    resolve();
                } else {
                    reject(new Error("Security validation timeout - operation rejected"));
                }
            }, 5000);
        });
    }

    /**
     * Send command to System/Writer and wait for result
     */
    private async executeStep(step: PlanStep, stepNum: number): Promise<any> {
        return new Promise((resolve, reject) => {
            const cmdId = `cmd-${Date.now()}-${Math.random()}`;

            // Helper to handle response
            const handler = (packet: KPP_Packet) => {
                // This is now handled by handleIncomingPacket, but we keep this logic 
                // implicitly if we wanted to listen on core directly, but we use pendingRequests map.
                // The pendingRequests map is cleaner.
            };

            // Register pending request
            this.pendingRequests.set(cmdId, { resolve, reject });

            // Resolve target URI
            const registry = getToolRegistry();
            const toolName = step.tool || step.action;
            const targetURI = registry.getToolTarget(toolName);

            if (!targetURI) {
                // If validation passed, this shouldn't happen, but just in case
                // Maybe it's a "native" Tetyana capability? 
                // For now, strict enforcement.
                this.pendingRequests.delete(cmdId);
                reject(new Error(`Tool execution failed: No target URI found for tool '${toolName}'. Is it registered?`));
                return;
            }

            console.log(`[TETYANA] 🚀 Executing '${toolName}' via ${targetURI} (ID: ${cmdId})`);

            const packet = createPacket(
                'kontur://organ/tetyana',
                targetURI,
                PacketIntent.CMD,
                step.args || {}
            );
            packet.instruction.op_code = toolName; // MCP expects the tool name as the method
            packet.route.reply_to = 'kontur://organ/tetyana';
            packet.nexus.correlation_id = cmdId; // Use nexus.correlation_id

            this.core.ingest(packet);
        });
    }

    // Map to store pending command promises
    public pendingRequests = new Map<string, { resolve: Function, reject: Function }>();

    /**
     * Called by TetyanaCapsule when a packet arrives for Tetyana
     */
    public handleIncomingPacket(packet: KPP_Packet) {
        // Use correlation_id if available to match pending requests
        const correlationId = packet.nexus.correlation_id;

        if (correlationId && this.pendingRequests.has(correlationId)) {
            const promise = this.pendingRequests.get(correlationId)!;
            if (packet.instruction.intent === PacketIntent.ERROR) {
                promise.reject(new Error(packet.payload.msg || "Unknown Error"));
            } else {
                promise.resolve(packet.payload);
            }
            this.pendingRequests.delete(correlationId);
        } else {
            // Fallback: If no correlation ID, logic for processing unrequested packets (e.g. events)
            // or if we rely on FIFO (not recommended but legacy fallback)
            // console.warn("[TETYANA] Received packet with no matching correlation ID:", packet.nexus.uid);
        }
    }


    private handleFailure(error: Error, plan: Plan) {
        // Auto-replan request
        const replanPacket = createPacket(
            'kontur://organ/tetyana',
            'kontur://cortex/ai/main',
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

    private emitStatus(type: string, msg: string) {
        const packet = createPacket(
            'kontur://organ/tetyana',
            'kontur://organ/ui/shell', // Send to UI
            PacketIntent.EVENT,
            { type, msg }
        );
        this.core.ingest(packet);
    }


    /**
     * Execute a SINGLE step via Python Bridge
     */
    private async executeStepViaBridge(step: PlanStep, stepNum: number, feedbackContext: string = ""): Promise<any> {
        return new Promise(async (resolve, reject) => {
            console.log(`[TETYANA] 🐍 Executing Step ${stepNum} via Python Bridge: ${step.action}`);

            const bridge = new OpenInterpreterBridge();
            if (!OpenInterpreterBridge.checkEnvironment()) {
                reject(new Error("Python environment not found"));
                return;
            }

            // Construct specific prompt for this step
            // Serialize the full plan for context
            const fullPlanContext = (this.currentPlan?.steps || []).map((s, i) =>
                `Step ${i + 1}: ${s.action} ${JSON.stringify(s.args || {})}`
            ).join('\n');

            let correctionPrompt = "";
            if (feedbackContext) {
                correctionPrompt = `
⚠️ PREVIOUS ATTEMPT REJECTED:
${feedbackContext}
INSTRUCTION: You must CORRECT your approach based on this feedback. Do not repeat the exact same action if it failed.
`;
            }

            const stepPrompt = `
🚨 CRITICAL: SINGLE STEP EXECUTION MODE 🚨

You MUST execute ONLY Step ${stepNum} and then STOP IMMEDIATELY.
DO NOT execute any other steps. DO NOT continue to the next step.
After completing THIS SINGLE ACTION, you MUST exit.

CONTEXT:
Goal: "${this.currentPlan?.goal}"
Full Plan (for reference only, DO NOT EXECUTE ALL):
${fullPlanContext}

═══════════════════════════════════════════════════════
YOUR SINGLE TASK (Step ${stepNum} ONLY):
Action: ${step.action}
Arguments: ${JSON.stringify(step.args)}
═══════════════════════════════════════════════════════
${correctionPrompt}

RULES:
1. Execute ONLY the action described above for Step ${stepNum}.
2. After this ONE action, output "Step ${stepNum} done." and EXIT.
3. DO NOT execute Steps ${stepNum + 1}, ${stepNum + 2}, etc.
4. DO NOT "be helpful" by doing more than asked.
5. ALWAYS activate the target app first: 'tell application "AppName" to activate'.
6. Use AppleScript via python subprocess for UI control.

VIOLATION WARNING: If you execute more than Step ${stepNum}, the entire plan will fail.
`;

            try {
                this.core.emit('ingest', createPacket(
                    'kontur://organ/tetyana',
                    'kontur://atlas/system',
                    PacketIntent.EVENT,
                    { type: 'log', message: `[Bridge] Executing Step ${stepNum}...` }
                ));

                const result = await bridge.execute(stepPrompt);

                this.core.emit('ingest', createPacket(
                    'kontur://organ/tetyana',
                    'kontur://atlas/system',
                    PacketIntent.EVENT,
                    { type: 'log', message: `[Bridge] Step ${stepNum} Done.` }
                ));
                resolve(result);
            } catch (e: any) {
                console.error("[TETYANA] 🐍 Bridge Execution Failed:", e);
                reject(e);
            }
        });
    }

    private speak(text: string) {
        const packet = createPacket(
            'kontur://organ/tetyana',
            'kontur://organ/ui/shell',
            PacketIntent.EVENT,
            { type: 'chat', msg: text }
        );
        this.core.ingest(packet);
    }
}
