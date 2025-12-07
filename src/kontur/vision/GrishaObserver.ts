/**
 * GrishaObserver - Automatic Security Observation Module
 * 
 * Watches task execution by capturing screen frames and feeding them to Gemini Live
 * Reports observations, confirmations, and alerts to the system
 */

import { EventEmitter } from 'events';
import { desktopCapturer, nativeImage } from 'electron';

export interface ObservationResult {
    type: 'confirmation' | 'alert' | 'observation';
    message: string;
    timestamp: number;
}

export class GrishaObserver extends EventEmitter {
    private isObserving: boolean = false;
    private captureInterval: NodeJS.Timeout | null = null;
    private geminiLive: any = null;
    private frameCount: number = 0;

    constructor() {
        super();
    }

    /**
     * Initialize with Gemini Live service reference
     */
    setGeminiLive(geminiLive: any) {
        this.geminiLive = geminiLive;

        // Listen to Grisha's responses
        if (geminiLive) {
            geminiLive.on('text', (text: string) => {
                this.processGrishaResponse(text);
            });

            geminiLive.on('audio', (audio: any) => {
                this.emit('audio', audio);
            });
        }
    }

    /**
     * Start observing task execution
     * Called when TETYANA begins executing a plan
     */
    async startObservation(taskDescription?: string) {
        if (this.isObserving) return;

        console.log('[GRISHA OBSERVER] 👁️ Starting observation...');
        this.isObserving = true;
        this.frameCount = 0;

        // Reconnect Gemini Live if needed
        if (this.geminiLive && !this.geminiLive.isConnected) {
            try {
                await this.geminiLive.connect();
                // Wait for connection to stabilize
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                console.error('[GRISHA OBSERVER] Failed to connect Gemini Live:', e);
            }
        }

        // Send FIRST FRAME IMMEDIATELY to keep session alive
        await this.captureAndSendFrame();
        console.log(`[GRISHA OBSERVER] 📸 First frame sent`);

        // Continue capturing screen at 2 FPS
        this.captureInterval = setInterval(async () => {
            await this.captureAndSendFrame();
        }, 500);

        // Emit start event
        this.emit('observation', {
            type: 'observation',
            message: `Спостереження розпочато. ${taskDescription || 'Моніторю виконання...'}`,
            timestamp: Date.now()
        } as ObservationResult);
    }

    /**
     * Stop observing
     */
    stopObservation() {
        if (!this.isObserving) return;

        console.log(`[GRISHA OBSERVER] 👁️ Observation stopped after ${this.frameCount} frames`);
        this.isObserving = false;

        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
        }

        // Emit stop event
        this.emit('observation', {
            type: 'confirmation',
            message: `Спостереження завершено. Перевірено ${this.frameCount} кадрів.`,
            timestamp: Date.now()
        } as ObservationResult);
    }

    /**
     * Capture current screen and send to Gemini Live
     */
    private async captureAndSendFrame() {
        try {
            console.log('[GRISHA OBSERVER] 📸 Capturing screen...');
            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { width: 640, height: 360 }
            });

            console.log(`[GRISHA OBSERVER] 🖥️ Found ${sources.length} sources`);

            if (sources.length > 0) {
                const thumbnail = sources[0].thumbnail;
                const jpegBuffer = thumbnail.toJPEG(70);
                const base64 = jpegBuffer.toString('base64');

                // Send to Gemini Live
                if (this.geminiLive) {
                    if (this.geminiLive.isConnected) {
                        this.geminiLive.sendVideoFrame(base64);
                        this.frameCount++;
                        console.log(`[GRISHA OBSERVER] 📤 Frame ${this.frameCount} sent`);
                    } else {
                        console.warn('[GRISHA OBSERVER] ⚠️ Gemini Live NOT connected, cannot send frame');
                    }
                } else {
                    console.error('[GRISHA OBSERVER] ❌ Gemini Live instance is missing');
                }
            }
        } catch (e) {
            console.error('[GRISHA OBSERVER] ❌ Capture failed:', e);
        }
    }

    /**
     * Process Grisha's response from Gemini Live
     */
    private processGrishaResponse(text: string) {
        const lowerText = text.toLowerCase();

        let resultType: 'confirmation' | 'alert' | 'observation' = 'observation';

        if (lowerText.includes('alert') || lowerText.includes('помилка') || lowerText.includes('error')) {
            resultType = 'alert';
        } else if (lowerText.includes('ok') || lowerText.includes('виконано') || lowerText.includes('stable')) {
            resultType = 'confirmation';
        }

        const result: ObservationResult = {
            type: resultType,
            message: text,
            timestamp: Date.now()
        };

        console.log(`[GRISHA OBSERVER] 🔍 ${resultType.toUpperCase()}: ${text}`);
        this.emit('observation', result);
    }

    /**
     * Check if currently observing
     */
    get isActive(): boolean {
        return this.isObserving;
    }
}
