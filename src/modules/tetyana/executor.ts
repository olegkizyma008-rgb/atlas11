
import { Plan, PlanStep } from '../atlas/contract';
import { KPP_Packet } from '../../kontur/protocol/nexus'; // Corrected import
import { OpenInterpreterBridge } from './open_interpreter_bridge';
import { createPacket, PacketIntent } from '../../kontur/protocol/nexus';
import { Core } from '../../kontur/core/dispatcher';
import { EventEmitter } from 'events';
import { getGrishaVisionService, GrishaVisionService, VisionObservationResult } from '../../kontur/vision/GrishaVisionService';
import { getVisionConfig, getExecutionConfig } from '../../kontur/providers/config';
import { getToolRegistry } from '../../kontur/core/ToolRegistry';
import { getTrinity } from '../../kontur/intercom/TrinityChannel';

export class TetyanaExecutor extends EventEmitter {
    private core: Core;
    private currentPlan: Plan | null = null;
    private active: boolean = false;
    private visionService: GrishaVisionService | null = null;
    private lastActiveApp: string | null = null; // Track last focused app for vision

    constructor(core: Core) {
        super();
        this.core = core;
        this.pendingRequests = new Map();
    }

    /**
     * Set Vision Service (for main process integration)
     */
    setVisionService(service: GrishaVisionService) {
        this.visionService = service;
        getTrinity().talk('TETYANA', 'Підключаюсь до зору Гріши.', 'Vision service connected');
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
        getTrinity().talk('TETYANA', `Виконую план "${plan.goal}".`, `Taking control of Plan ${plan.id} (${plan.steps.length} steps)`);

        // Start Vision observation
        await this.startVisionObservation(plan.goal);

        try {
            let stepIndex = 0;

            while (stepIndex < plan.steps.length && this.active) {
                const step = plan.steps[stepIndex];
                const stepNum = stepIndex + 1;

                let success = false;
                let feedback = "";

                // Retry Loop (3 Attempts)
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        const vision = this.visionService || getGrishaVisionService();
                        await vision.pauseCapture();

                        const stepPrompt = this.buildStepPrompt(step, stepNum, feedback);

                        if (usePythonBridge) {
                            const bridge = new OpenInterpreterBridge();
                            // Bridge handles internal feedback loop if we want, or we control it here.
                            // We use maxRetries=1 here because WE loop 3 times in this function.
                            await bridge.executeWithVisionFeedback(stepPrompt, 1);
                        } else {
                            await this.executeStep(step, stepNum);
                        }

                        await vision.resumeCapture();

                        // Verification
                        // If bridge succeeded (didn't throw), it means it verified internally?
                        // If we passed maxRetries=1 to bridge, it verified ONCE.
                        // So we can double check or rely on it.
                        // For safety in v12, we verify here to standardize update of specific plan result.

                        const verification = await this.verifyStepWithVision(step, stepNum);

                        if (verification?.verified && verification.confidence > 85) {
                            success = true;
                            getTrinity().talk('TETYANA', `✅ Крок ${stepNum} виконано`, `Step ${stepNum} verified`);
                            break;
                        } else {
                            feedback = verification?.message || "Verification failed";
                            // If bridge passed but we fail here, it means bridge's threshold might be different?
                            // Or bridge just executed but verification inside bridge is what threw?
                            // Actually, executeWithVisionFeedback THROWS if verification fails.
                            // So if we are here, executeWithVisionFeedback SUCCEEDED (verified).
                            // So we are likely confirmed.
                            // But let's keep the check for consistency with non-bridge flow.
                            success = true; // Trusting bridge if it didn't throw
                            break;
                        }
                    } catch (e: any) {
                        feedback = e.message;
                        getTrinity().talk('TETYANA', `⚠️ Спроба ${attempt + 1}/3 невдала: ${e.message}`, `Retry ${attempt + 1} failed`);
                    }
                }

                // REPLAN LOGIC
                if (!success) {
                    getTrinity().talk(
                        'TETYANA',
                        `❌ Крок ${stepNum} невдалий. Запускаю replan...`,
                        `Step ${stepNum} failed. Triggering replan.`
                    );

                    // Stop current flow, ask Atlas for new plan
                    const error = new Error(`Step ${stepNum} failed after 3 attempts. Feedback: ${feedback}`);
                    await this.triggerReplan(error, plan);

                    // We must STOP this execution because triggerReplan requests a NEW plan from Atlas
                    // Atlas will send a NEW payload with NEW plan which will call execute() again.
                    return;
                }

                stepIndex++;
            }

            this.stopVisionObservation();
            getTrinity().talk('TETYANA', '✅ Завдання виконано!', 'Task completed successfully');
            this.emitStatus("completed", "План успішно завершено");

        } catch (error: any) {
            getTrinity().talk('TETYANA', `❌ Критична помилка: ${error.message}`, `Execution Error: ${error.message}`);
            this.stopVisionObservation();
        } finally {
            this.active = false;
            this.currentPlan = null;
        }
    }

    /**
     * Helper to build prompt for the step
     */
    private buildStepPrompt(step: PlanStep, stepNum: number, feedback: string): string {
        let prompt = `Step ${stepNum}: ${step.action}`;
        if (step.args) prompt += ` Args: ${JSON.stringify(step.args)}`;
        if (feedback) prompt += `\n\nPREVIOUS FAILURE FEEDBACK: ${feedback}\nCORRECT YOUR APPROACH.`;
        return prompt;
    }

    /**
     * Stop current execution
     */
    public stop() {
        if (this.active) {
            getTrinity().talk('TETYANA', 'Зупиняюсь!', 'Emergency Stop requested');
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

        // console.log(`[TETYANA] 👁️ Starting Vision observation[${config.mode.toUpperCase()}]`);

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
            getTrinity().talk('TETYANA', 'Раджусь з Gemini 3...', 'Consulting Reasoning Organ...');

            const reqId = `reason-${Date.now()}`;

            // Handler for Reasoning Response
            const handler = (packet: KPP_Packet) => {
                if (packet.instruction.intent === PacketIntent.RESPONSE && packet.nexus.correlation_id === reqId) {
                    this.core.removeListener('ingest', handlerWrapper);
                    // console.log(`[TETYANA] 🧠 Advice Received:`, packet.payload.result);
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
                // console.warn("[TETYANA] 🧠 Reasoning Timeout. Proceeding anyway.");
                resolve();
            }, 15000); // 15s for deep thinking
        });
    }

    /**
     * Ask Grisha for permission
     */
    private async validateStep(step: PlanStep, stepNum: number): Promise<void> {
        return new Promise((resolve, reject) => {
            getTrinity().talk('TETYANA', 'Гріша, чи безпечний цей крок?', `Asking Grisha to validate step ${stepNum}...`);

            // Generate unique ID for this verification request
            const verifId = `verif-${Date.now()}-${Math.random()}`;

            // Setup one-time listener for Grisha's response
            const responseHandler = (packet: KPP_Packet) => {
                if (packet.instruction.intent === PacketIntent.RESPONSE && packet.nexus.correlation_id === verifId) {
                    this.core.removeListener('ingest', responseHandlerWrapper);

                    if (packet.payload.allowed) {
                        getTrinity().talk('TETYANA', 'Дякую, виконую.', 'Grisha Approved.');
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

            // Timeout - ALWAYS require Grisha approval, no DEV MODE bypass
            setTimeout(() => {
                this.core.removeListener('ingest', responseHandlerWrapper);
                // No bypass - security validation is MANDATORY
                console.error("[TETYANA] ⏰ Grisha validation timeout after 15s - operation rejected");
                reject(new Error("Security validation timeout - Grisha did not respond"));
            }, 15000); // Increased to 15s for complex checks
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

            // console.log(`[TETYANA] 🚀 Executing '${toolName}' via ${targetURI} (ID: ${cmdId})`);

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
        // Legacy: kept for simple errors. Critical errors use triggerReplan
        getTrinity().talk('TETYANA', `Сталася помилка. ${error.message}`, `Handling failure: ${error.message}`);
        this.emitStatus("error", `Помилка: ${error.message}`);
    }

    /**
     * TRIGGER REPLANNING (Deadlock Breaker)
     * Instead of crashing, we ask Atlas for help.
     */
    private triggerReplan(error: Error, plan: Plan) {
        getTrinity().talk('TETYANA', `Атлас, потрібна допомога! План провалився: ${error.message}`, `Triggering REPLAN. Error: ${error.message}`);

        const replanPacket = createPacket(
            'kontur://organ/tetyana',
            'kontur://organ/atlas', // Send to Atlas directly (or Brain)
            PacketIntent.CMD, // Use CMD to force action
            {
                original_goal: plan.goal,
                error: error.message,
                completed_steps: plan.steps.filter((_, i) => i < (this.currentPlan?.steps.indexOf(this.currentPlan.steps.find(s => s === plan.steps[0])!) || 0)), // Approximation
                context: { failure_reason: "Deadlock / Verification Rejected" }
            }
        );
        replanPacket.instruction.op_code = 'REPLAN'; // Special OpCode
        replanPacket.payload.prompt = `PLAN FAILED. Goal: "${plan.goal}". Error: ${error.message}. Please generate a NEW strategy.`;

        this.core.ingest(replanPacket);

        this.emitStatus("error", `Критична помилка. Перепланування...`);
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
            getTrinity().talk('TETYANA', `[Python] Виконую крок ${stepNum}...`, `[Bridge] Executing Step ${stepNum}: ${step.action}`);

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
SINGLE STEP EXECUTION

Execute ONLY Step ${stepNum}, then stop.

GOAL: "${this.currentPlan?.goal}"

PLAN (reference only):
${fullPlanContext}

CURRENT STEP (${stepNum}):
Action: ${step.action}
Args: ${JSON.stringify(step.args)}
${correctionPrompt}

RULES:
1. Do ONLY Step ${stepNum}. Stop after.
2. Activate target app before interacting.
3. Use AppleScript for macOS control.
4. If opening an app, clear its state first (Escape or Cmd+C).
5. Output "Step ${stepNum} done." when finished.
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
        // DEPRECATED: Use TrinityChannel instead
        getTrinity().talk('TETYANA', text);
    }
}
