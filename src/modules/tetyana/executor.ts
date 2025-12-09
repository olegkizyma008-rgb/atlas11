
import { Plan, PlanStep } from '../atlas/contract';
import { createPacket, KPP_Packet, PacketIntent } from '../../kontur/protocol/nexus';
import { Core } from '../../kontur/core/dispatcher';
import { EventEmitter } from 'events';
import { getGrishaVisionService, GrishaVisionService, VisionObservationResult } from '../../kontur/vision/GrishaVisionService';
import { getVisionConfig } from '../../kontur/providers/config';
import { getToolRegistry } from '../../kontur/core/ToolRegistry';

export class TetyanaExecutor extends EventEmitter {
    private core: Core;
    private currentPlan: Plan | null = null;
    private active: boolean = false;
    private visionService: GrishaVisionService | null = null;

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
    public async execute(plan: Plan) {
        if (this.active) {
            console.warn('[TETYANA] Already executing a plan. Queuing not implemented yet.');
            return;
        }

        this.active = true;
        this.currentPlan = plan;
        console.log(`[TETYANA] ⚡ Taking control of Plan ${plan.id} (${plan.steps.length} steps)`);

        // Notify UI of start
        this.emitStatus("starting", `Починаю виконання: ${plan.goal}`);

        // Start Vision observation
        await this.startVisionObservation(plan.goal);

        // 🛡️ VALIDATE ALL TOOLS BEFORE EXECUTION
        const registry = getToolRegistry();
        if (registry.isInitialized()) {
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
        } else {
            console.warn('[TETYANA] ⚠️ ToolRegistry not initialized, skipping validation');
        }

        try {
            for (let i = 0; i < plan.steps.length; i++) {
                if (!this.active) break; // formatting break

                const step = plan.steps[i];
                const stepNum = i + 1;
                console.log(`[TETYANA] ▶️ Step ${stepNum}: ${step.action}`);

                // 🛑 SYSTEM 2 THINKING (Gemini 3)
                // If plan is complex (>3 steps) and it's the first step, or if step is marked critical
                if (plan.steps.length > 3 && i === 0) {
                    this.emitStatus("thinking", "🤔 Аналізую план дій (Gemini 3)...");
                    await this.consultReasoning(plan);
                }

                // 👁️ VISION OPTIMIZATION: Pause during step execution
                const vision = this.visionService || getGrishaVisionService();
                vision.pauseCapture();

                // 🎯 Auto-select window if step targets an app
                const appName = step.args?.appName || step.args?.app;
                if (appName) {
                    console.log(`[TETYANA] 🎯 Targeting window: ${appName}`);
                    await vision.autoSelectSource(appName);
                }

                // 1. Validate with Grisha (security check)
                await this.validateStep(step, stepNum);

                // 2. Execute Step
                const result = await this.executeStep(step, stepNum);

                // 👁️ VISION OPTIMIZATION: Resume for verification
                vision.resumeCapture();

                // 3. Vision Verification (verify step was executed correctly)
                const visionResult = await this.verifyStepWithVision(step, stepNum);

                // 4. Check if Vision detected a problem
                if (visionResult && !visionResult.verified && visionResult.type === 'alert') {
                    console.warn(`[TETYANA] ⚠️ Vision alert: ${visionResult.message}`);
                    this.emitStatus("warning", `Grisha: ${visionResult.message}`);
                    // Continue for now, but could be configurable to stop
                }

                // 5. Report Success
                this.emitStatus("progress", `Крок ${stepNum} виконано: ${step.action}`);
            }

            // Stop Vision observation
            this.stopVisionObservation();

            if (this.active) {
                this.emitStatus("completed", `План успішно завершено.`);
                if (plan.user_response_ua) {
                    this.speak(plan.user_response_ua);
                }
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

        console.log(`[TETYANA] 👁️ Starting Vision observation [${config.mode.toUpperCase()}]`);

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
            const result = await vision.verifyStep(
                step.action,
                `Крок ${stepNum}: ${JSON.stringify(step.args || {})}`
            );
            return result;
        } catch (e) {
            console.warn('[TETYANA] Vision verification failed:', e);
            return null;
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
            packet.nexus.correlation_id = cmdId;

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
