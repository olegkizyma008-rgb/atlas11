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
    }

    /**
     * Auto-select source by app name
     */
    async autoSelectSource(appName: string): Promise<boolean> {
        const sources = await this.getSources();
        const matched = sources.find(s =>
            s.name.toLowerCase().includes(appName.toLowerCase())
        );

        if (matched) {
            this.selectSource(matched.id, matched.name);
            return true;
        }
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
    async verifyStep(stepAction: string, stepDetails?: string): Promise<VisionObservationResult> {
        console.log(`[GRISHA VISION] 🔍 Verifying step: ${stepAction}`);

        const currentMode = this.mode;

        if (currentMode === 'live') {
            // Live mode: just notify Gemini Live
            await this.notifyActionLive(stepAction, stepDetails || '');
            return {
                type: 'verification',
                message: 'Запит надіслано до Gemini Live',
                verified: true, // Assume OK for live (async confirmation)
                timestamp: Date.now(),
                mode: 'live'
            };
        }

        // On-Demand mode: capture and analyze
        try {
            const base64Image = await this.captureFrame();
            if (!base64Image) {
                return this.errorResult('Не вдалося захопити екран');
            }

            const router = getProviderRouter();
            const response = await router.analyzeVision({
                image: base64Image,
                mimeType: 'image/jpeg',
                taskContext: stepAction,
                prompt: `Перевір виконання кроку: "${stepAction}". ${stepDetails || ''}\n\nЧи виконано цю дію успішно? Опиши що бачиш.`
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
            console.log(`[GRISHA VISION] ${response.verified ? '✅' : '⚠️'} Step verified: ${response.analysis.slice(0, 100)}`);

            return result;

        } catch (error: any) {
            console.error('[GRISHA VISION] Verification failed:', error);
            return this.errorResult(`Помилка аналізу: ${error.message}`);
        }
    }

    /**
     * Capture a single frame from selected source or screen
     */
    async captureFrame(): Promise<string | null> {
        try {
            let sources;

            if (this.selectedSourceId) {
                // Capture specific window
                sources = await desktopCapturer.getSources({
                    types: ['window', 'screen'],
                    thumbnailSize: { width: 1280, height: 720 } // Higher res for on-demand
                });
                const source = sources.find(s => s.id === this.selectedSourceId);
                if (source) {
                    const jpegBuffer = source.thumbnail.toJPEG(85);
                    return jpegBuffer.toString('base64');
                }
            }

            // Fallback to full screen
            sources = await desktopCapturer.getSources({
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
