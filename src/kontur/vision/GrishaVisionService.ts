/**
 * GrishaVisionService - Unified Vision Service for Grisha
 * 
 * Supports both modes:
 * - LIVE: Continuous streaming to Gemini Live (real-time observation)
 * - ON-DEMAND: Screenshot after each step, analyzed by Copilot/GPT-4o
 * 
 * Both modes share the same interface for window selection and verification
 */

import { EventEmitter } from 'events';
import { desktopCapturer } from 'electron';
import { getVisionConfig } from '../providers/config';
import { getProviderRouter } from '../providers/router';
import { VisionResponse } from '../providers/types';
import { getTrinity } from '../intercom/TrinityChannel';

export interface VisionObservationResult {
    type: 'confirmation' | 'alert' | 'observation' | 'verification';
    message: string;
    verified?: boolean; // For on-demand: did the task succeed?
    confidence?: number;
    anomalies?: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high';
        description: string;
    }>;
    timestamp: number;
    mode: 'live' | 'on-demand';
}

export interface ScreenSource {
    id: string;
    name: string;
    thumbnail: string;
    isScreen: boolean;
}

export class GrishaVisionService extends EventEmitter {
    private isObserving: boolean = false;
    private isPaused: boolean = false;
    private captureInterval: NodeJS.Timeout | null = null;
    private captureIntervalMs: number = 2000; // 2s = 0.5 FPS (optimized for API)
    private geminiLive: any = null;
    private frameCount: number = 0;
    private isSpeaking: boolean = false;

    // Selected source for capture
    private selectedSourceId: string | null = null;
    private selectedSourceName: string | null = null;

    constructor() {
        super();
    }

    /**
     * Get current Vision mode from config
     */
    get mode(): 'live' | 'on-demand' {
        return getVisionConfig().mode;
    }

    /**
     * Set Gemini Live service (for live mode)
     */
    setGeminiLive(geminiLive: any) {
        this.geminiLive = geminiLive;

        if (geminiLive) {
            geminiLive.on('text', (text: string) => {
                this.processLiveResponse(text);
            });

            geminiLive.on('audio', (audio: any) => {
                if (!this.isSpeaking) {
                    this.isSpeaking = true;
                    // console.log('[GRISHA VISION] 🔇 Audio started - pausing frame capture');
                    getTrinity().talk('GRISHA', '...', 'Audio started - pausing frame capture');
                    setTimeout(() => {
                        if (this.isSpeaking) {
                            // console.log('[GRISHA VISION] ⏱️ Audio timeout - resuming');
                            getTrinity().talk('GRISHA', '...', 'Audio timeout - resuming');
                            this.isSpeaking = false;
                        }
                    }, 5000);
                }
                this.emit('audio', audio);
            });

            geminiLive.on('turnComplete', () => {
                // console.log('[GRISHA VISION] 🎤 Turn complete');
                getTrinity().talk('GRISHA', 'Дякую.', 'Turn complete');
                this.isSpeaking = false;
                this.emitResult('confirmation', 'Grisha finished speaking', true);
            });
        }
    }

    /**
     * Get available screen/window sources
     */
    async getSources(): Promise<ScreenSource[]> {
        try {
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
        } catch (err) {
            console.error('[GRISHA VISION] Failed to get sources:', err);
            return [];
        }
    }

    /**
     * Select a specific source (window/screen) for capture
     */
    selectSource(sourceId: string, sourceName: string) {
        this.selectedSourceId = sourceId;
        this.selectedSourceName = sourceName;
        getTrinity().talk('GRISHA', `Бачу вікно "${sourceName}".`, `Selected source: ${sourceName} (${sourceId})`);
        this.emit('source_changed', { id: sourceId, name: sourceName });
    }

    /**
     * Helper: Find window TITLE via generic AppleScript
     * This bridges the gap between App Name (known by user) and Window Title (known by desktopCapturer)
     */
    private async findWindowTitleForApp(appName: string): Promise<string | null> {
        const script = `
        tell application "System Events"
            try
                set targetApp to process "${appName}"
                if not (exists targetApp) then return ""
                if (count of windows of targetApp) is 0 then return ""
                
                set winTitle to name of window 1 of targetApp
                return winTitle
            on error
                return ""
            end try
        end tell
        `;

        try {
            const { exec } = require('child_process');
            const result: string = await new Promise((resolve) => {
                exec(`osascript -e '${script}'`, (err: any, stdout: string) => {
                    if (err) resolve("");
                    else resolve(stdout.trim());
                });
            });

            return result || null;
        } catch (e) {
            console.warn(`[GRISHA VISION] AppleScript Lookup Failed for ${appName}:`, e);
            return null;
        }
    }

    /**
     * Auto-select source by app name
     */
    async autoSelectSource(appName: string): Promise<boolean> {
        const sources = await this.getSources();

        // Debug: List all available windows for troubleshooting
        const externalSources = sources.filter(s =>
            !s.name.toLowerCase().includes('electron') &&
            !s.name.toLowerCase().includes('atlas') &&
            !s.name.toLowerCase().includes('kontur')
        );

        // console.log(`[GRISHA VISION] 🔍 Looking for "${appName}" among ${externalSources.length} external windows`);

        if (externalSources.length === 0) {
            // console.log('[GRISHA VISION] ⚠️ No external windows found via desktopCapturer.');
        } else {
            // console.log('[GRISHA VISION] 📋 Available Windows: ' + externalSources.map(s => `"${s.name}"`).join(', '));
        }

        const normalize = (s: string) => s.toLowerCase().trim().replace(/[\u2013\u2014]/g, "-");
        const target = normalize(appName);

        // Common mappings (UA <-> EN)
        const ALIASES: Record<string, string[]> = {
            'калькулятор': ['Calculator'],
            'calculator': ['Calculator'],
            'термінал': ['Terminal', 'iTerm2'],
            'terminal': ['Terminal', 'iTerm2'],
            'нотатки': ['Notes'],
            'notes': ['Notes'],
            'сафарі': ['Safari'],
            'safari': ['Safari'],
            'файндер': ['Finder'],
            'finder': ['Finder'],
            'chrome': ['Google Chrome'],
            'google chrome': ['Google Chrome'],
            'code': ['Code', 'Visual Studio Code'],
            'vscode': ['Code', 'Visual Studio Code']
        };

        const potentialAppNames = [appName, ...(ALIASES[target] || [])];

        // --- STRATEGY 1: AppleScript Title Lookup (Most Accurate) ---
        // Get the Window Title from the OS for the given App, then find source with that Title
        for (const name of potentialAppNames) {
            const trueWindowTitle = await this.findWindowTitleForApp(name);
            if (trueWindowTitle) {
                // console.log(`[GRISHA VISION] 🍏 AppleScript found Title "${trueWindowTitle}" for app "${name}"`);

                const exactMatch = externalSources.find(s => normalize(s.name) === normalize(trueWindowTitle));

                if (exactMatch) {
                    // console.log(`[GRISHA VISION] ✅ Exact Title Match: "${exactMatch.name}"`);
                    this.selectSource(exactMatch.id, exactMatch.name);
                    return true;
                }

                // Partial match on title if exact fails (e.g. specialized chars)
                const partialMatch = externalSources.find(s => normalize(s.name).includes(normalize(trueWindowTitle)) || normalize(trueWindowTitle).includes(normalize(s.name)));
                if (partialMatch) {
                    // console.log(`[GRISHA VISION] ✅ Partial Title Match: "${partialMatch.name}" matches "${trueWindowTitle}"`);
                    this.selectSource(partialMatch.id, partialMatch.name);
                    return true;
                }
            }
        }

        // --- STRATEGY 2: Fuzzy Title Matching (Fallback) ---
        // console.log(`[GRISHA VISION] ⚠️ Title Lookup failed, falling back to title matching...`);

        const searchTerms = [target, ...(ALIASES[target] || []).map(s => normalize(s))];

        // 2.1 Exact Title Match
        let matched = externalSources.find(s =>
            searchTerms.some(term => normalize(s.name) === term)
        );

        // 2.2 Starts With
        if (!matched) {
            matched = externalSources.find(s =>
                searchTerms.some(term => normalize(s.name).startsWith(term))
            );
        }

        // 2.3 Contains
        if (!matched) {
            matched = externalSources.find(s =>
                searchTerms.some(term => normalize(s.name).includes(term))
            );
        }

        // 2.4 Word Match
        if (!matched) {
            matched = externalSources.find(s =>
                searchTerms.some(term => {
                    const windowWords = normalize(s.name).split(' ');
                    return windowWords.includes(term);
                })
            );
        }

        if (matched) {
            // console.log(`[GRISHA VISION] ✅ Found window via Title: "${matched.name}" (matched for "${appName}")`);
            this.selectSource(matched.id, matched.name);
            return true;
        }

        getTrinity().talk('GRISHA', `Не можу знайти вікно "${appName}".`, `Window not found for: "${appName}".`);
        return false;
    }

    /**
     * Clear source selection (capture entire screen)
     */
    clearSourceSelection() {
        this.selectedSourceId = null;
        this.selectedSourceName = null;
        getTrinity().talk('GRISHA', 'Дивлюсь на весь екран.', 'Using full screen capture');
    }

    /**
     * Start observation (works for both modes)
     */
    async startObservation(taskDescription?: string) {
        if (this.isObserving) return;

        const currentMode = this.mode;
        getTrinity().talk('GRISHA', 'Починаю спостереження.', `Starting observation [${currentMode.toUpperCase()}]`);

        this.isObserving = true;
        this.frameCount = 0;

        // Clear cached source from previous session
        this.selectedSourceId = null;
        this.selectedSourceName = null;

        if (currentMode === 'live') {
            await this.startLiveObservation(taskDescription);
        } else {
            // On-demand: just mark as observing, capture happens per-step
            this.emitResult('observation', `On-Demand спостереження активовано. ${taskDescription || 'Готовий до перевірки.'}`);
        }
    }

    /**
     * Stop observation
     */
    stopObservation() {
        if (!this.isObserving) return;

        // console.log(`[GRISHA VISION] 👁️ Observation stopped after ${this.frameCount} frames`);
        this.isObserving = false;
        this.isSpeaking = false;
        this.isPaused = false;

        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
        }

        this.emitResult('confirmation', `Спостереження завершено. Перевірено ${this.frameCount} кадрів.`);
    }

    /**
     * Pause capture (during step execution)
     */
    pauseCapture() {
        if (!this.isPaused) {
            this.isPaused = true;
            // console.log('[GRISHA VISION] ⏸️ Capture paused');
        }
    }

    /**
     * Resume capture (for step verification)
     */
    resumeCapture() {
        if (this.isPaused) {
            this.isPaused = false;
            // console.log('[GRISHA VISION] ▶️ Capture resumed');
            // Send immediate frame on resume for verification
            if (this.mode === 'live') {
                this.captureAndSendLiveFrame();
            }
        }
    }

    /**
     * Verify a step was executed (On-Demand mode)
     * Captures screenshot and sends to Copilot/GPT-4o for analysis
     */
    /**
     * Verify a step was executed
     */
    async verifyStep(stepAction: string, stepDetails?: string, globalContext?: string, targetApp?: string): Promise<VisionObservationResult> {

        getTrinity().talk('GRISHA', 'Перевіряю виконання...', `Verifying step: ${stepAction}`);

        // If ON-DEMAND mode, run directly
        if (this.mode === 'on-demand') {
            return this.verifyStepOnDemand(stepAction, stepDetails, globalContext, targetApp);
        }

        // Live mode with fallback
        return new Promise(async (resolve) => {
            // Notify Gemini Live
            await this.notifyActionLive(stepAction, stepDetails || '');

            const cleanup = () => {
                this.removeListener('observation', responseHandler);
            };

            const responseHandler = (result: VisionObservationResult) => {
                if (result.type === 'confirmation' || result.type === 'alert') {
                    cleanup();
                    resolve(result);
                }
            };

            this.on('observation', responseHandler);

            // Timeout with FALLBACK
            setTimeout(async () => {
                cleanup();

                getTrinity().talk('GRISHA', 'Gemini Live не відповідає, переключаюсь на ручну перевірку...', 'Verification timeout (Live Mode). Falling back to On-Demand verification...');

                try {
                    // FALLBACK: Try GPT-4o / Copilot analysis as backup
                    const fallbackResult = await this.verifyStepOnDemand(stepAction, stepDetails, globalContext, targetApp);
                    resolve(fallbackResult);
                } catch (e) {
                    resolve({
                        type: 'alert',
                        message: 'Timeout & Fallback Failed: Gemini Live did not respond and On-Demand analysis failed.',
                        verified: false,
                        timestamp: Date.now(),
                        mode: 'live'
                    });
                }
            }, 10000); // 10s timeout before fallback
        });
    }

    /**
     * Check if an object/window is visible on screen
     * Returns visibility check result
     */
    private async checkObjectVisibility(stepAction: string, base64Image: string, explicitTarget?: string): Promise<{ visible: boolean, message: string }> {
        try {
            const router = getProviderRouter();

            // Use explicit target if available, otherwise try to extract
            let objectName = explicitTarget;

            if (!objectName) {
                // Extract object/app name from step action
                const objectMatch = stepAction.match(/(?:відкрити|open|launch|в програмі|in|у|click|натисни|type in)\s+([A-Za-zА-Яа-яіІїЇєЄ0-9\s]+)/i);
                objectName = objectMatch
                    ? objectMatch[1].trim()
                    : (this.selectedSourceName || stepAction);
            }

            const visibilityPrompt = `
ANALYZE VISIBILITY:
Task: "${stepAction}"
Target Object/Window: "${objectName}"

CRITICAL:
- Ignore text logs or chat windows. Look for the ACTUAL APP INTERFACE (buttons, inputs).
- If you only see text "Calculator opened" in a terminal -> INVISIBLE.
- If obscured -> INVISIBLE.

OUTPUT FORMAT:
Return valid JSON:
{
  "visible": boolean,
  "description": "string (what you see)",
  "message_ua": "string (Ukrainian description for user)"
}
`;

            const response = await router.analyzeVision({
                image: base64Image,
                mimeType: 'image/jpeg',
                taskContext: stepAction,
                prompt: visibilityPrompt
            });

            // Parse visibility response
            try {
                const analysis = response.analysis;
                const jsonMatch = analysis.match(/\{[\s\S]*\}/);

                let visible = false;
                let message = `Не бачу "${objectName}".`;

                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    visible = parsed.visible === true;
                    message = parsed.message_ua || parsed.description;
                } else {
                    // Fallback heuristics
                    const analysisLower = analysis.toLowerCase();
                    if (analysisLower.includes('visible') || analysisLower.includes('true')) visible = true;
                    message = analysis;
                }

                return { visible, message };

            } catch (parseErr) {
                // console.warn('[GRISHA VISION] Could not parse visibility JSON, analyzing text:', response.analysis);
                return { visible: false, message: response.analysis };
            }

        } catch (error: any) {
            console.error('[GRISHA VISION] Visibility check failed:', error);
            return {
                visible: false,
                message: `Помилка перевірки видимості: ${error.message}`
            };
        }
    }

    /**
     * Private: On-Demand Verification Logic
     * NOW WITH VISIBILITY CHECK FIRST AND GLOBAL CONTEXT
     */
    private async verifyStepOnDemand(stepAction: string, stepDetails?: string, globalContext?: string, targetApp?: string): Promise<VisionObservationResult> {
        try {
            const base64Image = await this.captureFrame();
            if (!base64Image) {
                return this.errorResult('Не вдалося захопити екран');
            }

            // STEP 1: Check if object is visible
            // console.log('[GRISHA VISION] 👁️ Checking object visibility first...');
            const visibilityCheck = await this.checkObjectVisibility(stepAction, base64Image, targetApp);

            if (!visibilityCheck.visible) {
                getTrinity().talk('GRISHA', `Не бачу потрібного об'єкта. ${visibilityCheck.message}`, `Object not visible: ${visibilityCheck.message}`);

                const result: VisionObservationResult = {
                    type: 'alert',
                    message: visibilityCheck.message,
                    verified: false,
                    confidence: 0.9, // High confidence in "not seeing"
                    timestamp: Date.now(),
                    mode: 'on-demand'
                };
                this.emit('observation', result);
                return result;
            }

            // console.log(`[GRISHA VISION] ✅ Object visible: ${visibilityCheck.message}`);

            // STEP 2: Verify Action
            const router = getProviderRouter();

            const verificationPrompt = `
STEP VERIFICATION
Action performed: "${stepAction}"
Details: ${stepDetails || 'none'}
Target: ${targetApp || 'screen'}
${globalContext ? `Goal: "${globalContext}"` : ''}

Verify:
1. Did this action complete successfully?
2. Is the result correct?

OUTPUT FORMAT:
Return valid JSON:
{
  "verified": boolean,
  "confidence": number (0-1),
  "analysis": "string (technical reasoning)",
  "message_ua": "string (Ukrainian report for user. Start with 'ВЕРИФІКОВАНО:' or 'ПОМИЛКА:')"
}
`;

            const response = await router.analyzeVision({
                image: base64Image,
                mimeType: 'image/jpeg',
                taskContext: stepAction,
                prompt: verificationPrompt
            });

            this.frameCount++;

            let verified = response.verified;
            let message = response.analysis;
            let confidence = response.confidence;

            // Try parse JSON
            const jsonMatch = response.analysis.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    verified = parsed.verified === true;
                    message = parsed.message_ua || parsed.analysis;
                    confidence = parsed.confidence || 0.8;
                } catch (e) { }
            }

            getTrinity().talk('GRISHA', message, `Verification result: ${verified}`);

            const result: VisionObservationResult = {
                type: verified ? 'verification' : 'alert',
                message: message,
                verified: verified,
                confidence: confidence,
                anomalies: response.anomalies,
                timestamp: Date.now(),
                mode: 'on-demand'
            };

            this.emit('observation', result);
            return result;

        } catch (error: any) {
            console.error('[GRISHA VISION] Verification failed:', error);
            return this.errorResult(`Помилка аналізу: ${error.message}`);
        }
    }

    /**
     * Capture a single frame from selected source or screen
     */
    async captureFrame(overrideSourceId?: string): Promise<string | null> {
        try {
            const targetId = overrideSourceId || this.selectedSourceId;

            // Always fetch fresh sources to handle newly opened windows
            const sources = await desktopCapturer.getSources({
                types: ['window', 'screen'],
                thumbnailSize: { width: 1280, height: 720 }
            });

            // Emit sources update for UI
            this.emit('sources_updated', sources.map(s => ({
                id: s.id,
                name: s.name,
                thumbnail: s.thumbnail.toDataURL(),
                isScreen: s.id.startsWith('screen:')
            })));

            if (targetId) {
                // Try to find the selected source
                let source = sources.find(s => s.id === targetId);

                // If not found by ID, try by name (window IDs can change)
                if (!source && this.selectedSourceName) {
                    source = sources.find(s =>
                        s.name.toLowerCase().includes(this.selectedSourceName!.toLowerCase())
                    );
                    if (source && source.id !== targetId) {
                        // console.log(`[GRISHA VISION] 🔄 Source ID changed for "${this.selectedSourceName}": ${targetId} -> ${source.id}`);
                        this.selectedSourceId = source.id;
                    }
                }

                if (source) {
                    const jpegBuffer = source.thumbnail.toJPEG(85);
                    return jpegBuffer.toString('base64');
                }
            }

            // Fallback to full screen (first screen)
            const screenSources = sources.filter(s => s.id.startsWith('screen:'));

            if (screenSources.length > 0) {
                const jpegBuffer = screenSources[0].thumbnail.toJPEG(85);
                return jpegBuffer.toString('base64');
            }

            return null;
        } catch (e) {
            console.error('[GRISHA VISION] Capture failed:', e);
            return null;
        }
    }

    // ==================== PRIVATE METHODS ====================

    /**
     * Start Live observation (Gemini Live streaming)
     */
    private async startLiveObservation(taskDescription?: string) {
        if (this.geminiLive && !this.geminiLive.isConnected) {
            try {
                await this.geminiLive.connect();
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                console.error('[GRISHA VISION] Failed to connect Gemini Live:', e);
            }
        }

        if (this.geminiLive?.sendText) {
            this.geminiLive.sendText("Система: Починаємо спостереження. Опиши що бачиш на екрані.");
        }

        await this.captureAndSendLiveFrame();

        this.captureInterval = setInterval(async () => {
            if (this.isSpeaking || this.isPaused) return;
            await this.captureAndSendLiveFrame();
        }, this.captureIntervalMs);

        this.emitResult('observation', `Live спостереження розпочато (${this.captureIntervalMs}ms). ${taskDescription || 'Моніторю виконання...'}`);
    }

    /**
     * Capture and send frame to Gemini Live
     */
    private async captureAndSendLiveFrame() {
        try {
            const base64 = await this.captureFrame();
            if (base64 && this.geminiLive?.isConnected) {
                this.geminiLive.sendVideoFrame(base64);
                this.frameCount++;
            }
        } catch (e) {
            console.error('[GRISHA VISION] Live capture failed:', e);
        }
    }

    /**
     * Notify Gemini Live about an action (Live mode)
     */
    private async notifyActionLive(action: string, details: string) {
        if (this.geminiLive?.sendText) {
            // console.log(`[GRISHA VISION] 🗣️ Prompting verification: ${action}`);
            getTrinity().talk('GRISHA', 'Дивлюсь...', `Prompting verification: ${action}`);

            this.geminiLive.sendText(`Система: Виконано дію "${action}" (${details}). Підтвердь словом "Виконано" або повідом про помилку.`);

            // Also send a fresh frame
            await this.captureAndSendLiveFrame();
        }
    }

    /**
     * Process response from Gemini Live
     */
    private processLiveResponse(text: string) {
        const lowerText = text.toLowerCase();
        let resultType: 'confirmation' | 'alert' | 'observation' = 'observation';

        if (lowerText.includes('alert') || lowerText.includes('помилка') || lowerText.includes('error') || lowerText.includes('не виконано')) {
            resultType = 'alert';
        } else if (lowerText.includes('ok') || lowerText.includes('виконано') || lowerText.includes('stable') || lowerText.includes('done')) {
            resultType = 'confirmation';
        }

        const result: VisionObservationResult = {
            type: resultType,
            message: text,
            verified: resultType === 'confirmation',
            timestamp: Date.now(),
            mode: 'live'
        };

        // console.log(`[GRISHA VISION] 🔍 ${resultType.toUpperCase()}: ${text}`);
        getTrinity().talk('GRISHA', text, `Live Response: ${text}`);
        this.emit('observation', result);
    }

    /**
     * Helper: emit observation result
     */
    private emitResult(type: VisionObservationResult['type'], message: string, verified?: boolean) {
        this.emit('observation', {
            type,
            message,
            verified,
            timestamp: Date.now(),
            mode: this.mode
        } as VisionObservationResult);
    }

    /**
     * Helper: create error result
     */
    private errorResult(message: string): VisionObservationResult {
        return {
            type: 'alert',
            message,
            verified: false,
            timestamp: Date.now(),
            mode: this.mode
        };
    }

    get isActive(): boolean {
        return this.isObserving;
    }
}

// Singleton instance
let visionServiceInstance: GrishaVisionService | null = null;

export function getGrishaVisionService(): GrishaVisionService {
    if (!visionServiceInstance) {
        visionServiceInstance = new GrishaVisionService();
    }
    return visionServiceInstance;
}

