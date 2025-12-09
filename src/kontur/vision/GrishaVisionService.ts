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
                    console.log('[GRISHA VISION] 🔇 Audio started - pausing frame capture');
                    setTimeout(() => {
                        if (this.isSpeaking) {
                            console.log('[GRISHA VISION] ⏱️ Audio timeout - resuming');
                            this.isSpeaking = false;
                        }
                    }, 5000);
                }
                this.emit('audio', audio);
            });

            geminiLive.on('turnComplete', () => {
                console.log('[GRISHA VISION] 🎤 Turn complete');
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
        console.log(`[GRISHA VISION] 🎯 Selected source: ${sourceName} (${sourceId})`);
        this.emit('source_changed', { id: sourceId, name: sourceName });
    }

    /**
     * Auto-select source by app name
     */
    async autoSelectSource(appName: string): Promise<boolean> {
        const sources = await this.getSources();

        // Filter out Atlas/Electron windows to avoid self-capture
        const externalSources = sources.filter(s =>
            !s.name.toLowerCase().includes('electron') &&
            !s.name.toLowerCase().includes('atlas') &&
            !s.name.toLowerCase().includes('kontur')
        );

        console.log(`[GRISHA VISION] 🔍 Looking for "${appName}" among ${externalSources.length} external windows`);

        const normalize = (s: string) => s.toLowerCase().trim();
        const target = normalize(appName);

        // Common mappings (UA <-> EN)
        const ALIASES: Record<string, string[]> = {
            'калькулятор': ['calculator'],
            'calculator': ['калькулятор'],
            'термінал': ['terminal', 'iterm'],
            'terminal': ['термінал', 'iterm'],
            'нотатки': ['notes'],
            'notes': ['нотатки'],
            'сафарі': ['safari'],
            'safari': ['сафарі'],
            'файндер': ['finder'],
            'finder': ['файндер']
        };

        const searchTerms = [target, ...(ALIASES[target] || [])];

        let matched = externalSources.find(s =>
            searchTerms.some(term => normalize(s.name) === term)
        );

        if (!matched) {
            matched = externalSources.find(s =>
                searchTerms.some(term => normalize(s.name).includes(term))
            );
        }

        if (matched) {
            console.log(`[GRISHA VISION] ✅ Found window: "${matched.name}" (matched for "${appName}")`);
            this.selectSource(matched.id, matched.name);
            return true;
        }

        console.warn(`[GRISHA VISION] ⚠️ Window not found for: "${appName}". Available: ${externalSources.map(s => s.name).join(', ')}`);
        return false;
    }

    /**
     * Clear source selection (capture entire screen)
     */
    clearSourceSelection() {
        this.selectedSourceId = null;
        this.selectedSourceName = null;
        console.log('[GRISHA VISION] 🖥️ Using full screen capture');
    }

    /**
     * Start observation (works for both modes)
     */
    async startObservation(taskDescription?: string) {
        if (this.isObserving) return;

        const currentMode = this.mode;
        console.log(`[GRISHA VISION] 👁️ Starting observation [${currentMode.toUpperCase()}]...`);
        this.isObserving = true;
        this.frameCount = 0;

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

        console.log(`[GRISHA VISION] 👁️ Observation stopped after ${this.frameCount} frames`);
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
            console.log('[GRISHA VISION] ⏸️ Capture paused');
        }
    }

    /**
     * Resume capture (for step verification)
     */
    resumeCapture() {
        if (this.isPaused) {
            this.isPaused = false;
            console.log('[GRISHA VISION] ▶️ Capture resumed');
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
    async verifyStep(stepAction: string, stepDetails?: string): Promise<VisionObservationResult> {
        console.log(`[GRISHA VISION] 🔍 Verifying step: ${stepAction}`);

        // If ON-DEMAND mode, run directly
        if (this.mode === 'on-demand') {
            return this.verifyStepOnDemand(stepAction, stepDetails);
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
                console.warn('[GRISHA VISION] ⚠️ Verification timeout (Live Mode). Falling back to On-Demand verification...');

                try {
                    // FALLBACK: Try GPT-4o / Copilot analysis as backup
                    const fallbackResult = await this.verifyStepOnDemand(stepAction, stepDetails);
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
    private async checkObjectVisibility(stepAction: string, base64Image: string): Promise<{ visible: boolean, message: string }> {
        try {
            const router = getProviderRouter();

            // Extract object/app name from step action
            const objectMatch = stepAction.match(/(?:відкрити|open|launch|в програмі|in|у|click|натисни|type in)\s+([A-Za-zА-Яа-яіІїЇєЄ0-9\s]+)/i);
            const objectName = objectMatch ? objectMatch[1].trim() : 'об\'єкт';

            const visibilityPrompt = `
АНАЛІЗ ВИДИМОСТІ:
Завдання: "${stepAction}"
Об'єкт/вікно для пошуку: "${objectName}"

ВАЖЛИВО:
- Ігноруй текстові логи, консоль або чат, де написано про цей об'єкт.
- Ти повинен бачити САМ ІНТЕРФЕЙС програми (кнопки, поля, вікно).
- Якщо ти бачиш тільки текст "Calculator opened" або подібне в логах - це invisible.
- Якщо вікно перекрито іншим (наприклад ATLAS KONTUR) - це invisible.

ВІДПОВІДЬ НА ПИТАННЯ:
1. Чи бачиш ти ІНТЕРФЕЙС програми "${objectName}"?
2. Якщо так - опиши як він виглядає (колір, елементи)?
3. Якщо ні - що саме перекриває його?

Формат відповіді JSON:
{
  "visible": true/false,
  "location": "опис де знаходиться" або null,
  "screen_content": "що видно на екрані",
  "is_obscured_by_atlas": true/false
}`;

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
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    const visible = parsed.visible === true;

                    if (visible) {
                        const location = parsed.location || 'на екрані';
                        return {
                            visible: true,
                            message: `Бачу "${objectName}" ${location}`
                        };
                    } else {
                        const screenContent = parsed.screen_content || 'інший вміст';
                        return {
                            visible: false,
                            message: `Не бачу "${objectName}" на екрані. Видно: ${screenContent}`
                        };
                    }
                }
            } catch (parseErr) {
                console.warn('[GRISHA VISION] Could not parse visibility JSON, analyzing text:', response.analysis);
            }

            // Fallback: analyze text response
            const analysisLower = response.analysis.toLowerCase();
            const positiveIndicators = ['бачу', 'yes', 'visible', 'відкрито', 'opened', 'present'];
            const negativeIndicators = ['не бачу', 'no', 'not visible', 'закрито', 'hidden', 'absent', 'missing'];

            const hasPositive = positiveIndicators.some(ind => analysisLower.includes(ind));
            const hasNegative = negativeIndicators.some(ind => analysisLower.includes(ind));

            if (hasNegative || !hasPositive) {
                return {
                    visible: false,
                    message: `Не бачу "${objectName}" на екрані. ${response.analysis.slice(0, 100)}`
                };
            }

            return {
                visible: true,
                message: `Бачу "${objectName}". ${response.analysis.slice(0, 100)}`
            };

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
     * NOW WITH VISIBILITY CHECK FIRST
     */
    private async verifyStepOnDemand(stepAction: string, stepDetails?: string): Promise<VisionObservationResult> {
        try {
            const base64Image = await this.captureFrame();
            if (!base64Image) {
                return this.errorResult('Не вдалося захопити екран');
            }

            // STEP 1: Check if object is visible
            console.log('[GRISHA VISION] 👁️ Checking object visibility first...');
            const visibilityCheck = await this.checkObjectVisibility(stepAction, base64Image);

            if (!visibilityCheck.visible) {
                console.warn(`[GRISHA VISION] ⚠️ Object not visible: ${visibilityCheck.message}`);
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

            console.log(`[GRISHA VISION] ✅ Object visible: ${visibilityCheck.message}`);

            // STEP 2: Verify the action was completed
            const router = getProviderRouter();
            const response = await router.analyzeVision({
                image: base64Image,
                mimeType: 'image/jpeg',
                taskContext: stepAction,
                prompt: `Об'єкт підтверджено видимим: "${visibilityCheck.message}".

Тепер перевір виконання кроку: "${stepAction}". ${stepDetails || ''}

Чи виконано цю дію успішно? Що саме змінилось або відбулось?`
            });

            this.frameCount++;

            const result: VisionObservationResult = {
                type: response.verified ? 'verification' : 'alert',
                message: response.analysis,
                verified: response.verified,
                confidence: response.confidence,
                anomalies: response.anomalies,
                timestamp: Date.now(),
                mode: 'on-demand'
            };

            this.emit('observation', result);
            console.log(`[GRISHA VISION] ${response.verified ? '✅' : '⚠️'} Step verified (On-Demand): ${response.analysis.slice(0, 100)}`);

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

            if (targetId) {
                // Capture specific window/screen
                const sources = await desktopCapturer.getSources({
                    types: ['window', 'screen'],
                    thumbnailSize: { width: 1280, height: 720 }
                });
                const source = sources.find(s => s.id === targetId);
                if (source) {
                    const jpegBuffer = source.thumbnail.toJPEG(85);
                    return jpegBuffer.toString('base64');
                }
            }

            // Fallback to full screen (first screen)
            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { width: 1280, height: 720 }
            });

            if (sources.length > 0) {
                const jpegBuffer = sources[0].thumbnail.toJPEG(85);
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
            console.log(`[GRISHA VISION] 🗣️ Prompting verification: ${action}`);
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

        console.log(`[GRISHA VISION] 🔍 ${resultType.toUpperCase()}: ${text}`);
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
