import 'dotenv/config';
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createIPCHandler } from 'electron-trpc/main'
import { synapse } from '../kontur/synapse'
import { Core, CortexBrain, Synapse } from '../kontur'
import { createPacket, PacketIntent } from '../kontur/protocol/nexus'

// Import appRouter from a file we will create later
import { appRouter } from './router'

let konturCore: Core;
let konturCortex: CortexBrain;

async function initializeKONTUR() {
    konturCore = new Core();
    konturCortex = new CortexBrain();
    konturCortex.on('decision', (packet) => konturCore.ingest(packet));
    konturCortex.on('error', (packet) => konturCore.ingest(packet));

    // Register Cortex as AI handler
    konturCore.register('kontur://cortex/ai/main', {
        send: (packet: any) => {
            console.log('[CORTEX HANDLER] Processing AI request...');
            konturCortex.process(packet);
        }
    });

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const workerScript = join(__dirname, '../kontur/organs/worker.py');

    try {
        konturCore.loadPlugin('kontur://organ/worker', { cmd: pythonCmd, args: [workerScript] });
    } catch (e) {
        console.error('[KONTUR] Failed to load worker:', e);
    }

    {
        // UI Bridge - Forward Core packets to Synapse (Frontend)
        const uiBridge = {
            send: (packet: any) => {
                // Determine Source Name for UI (ATLAS, TETYANA, GRISHA, SYSTEM)
                let source = 'SYSTEM';

                // ATLAS: AI responses from cortex
                if (packet.route.from.includes('cortex')) {
                    source = 'ATLAS';
                }
                // ATLAS: AI-generated chat responses (even routed through core)
                else if (packet.payload?.type === 'chat' || packet.instruction?.intent === 'AI_PLAN') {
                    source = 'ATLAS';
                }
                // TETYANA: Task execution results from MCP handlers
                else if (packet.route.from.includes('mcp') || packet.payload?.type === 'task_result') {
                    source = 'TETYANA';
                }
                // GRISHA: Security/observation from AG module
                else if (packet.route.from.includes('ag') || packet.payload?.type === 'security') {
                    source = 'GRISHA';
                }

                // Extract message
                let payload = packet.payload;
                if (payload && payload.msg) payload = payload.msg;

                // Emit to Synapse Bus (which TRPC forwards to UI)
                console.log(`[MAIN BRIDGE] Forwarding to UI: ${source} -> ${JSON.stringify(payload)}`);
                synapse.emit(source, packet.instruction.intent || 'INFO', payload);
            }
        };
        konturCore.register('kontur://organ/ui/shell', uiBridge);
    }

    {
        // System Organ - Handle OS operations
        const { SystemCapsule } = await import('../kontur/system/SystemCapsule');
        const systemCapsule = new SystemCapsule();

        const systemHandler = {
            send: async (packet: any) => {
                console.log('[SYSTEM ORGAN] Received packet:', packet.instruction.op_code);

                const { intent, op_code } = packet.instruction;
                const { task, app } = packet.payload;

                let result: any = { success: false, output: '' };

                if (op_code === 'OPEN_APP' || (task && task.startsWith('open '))) {
                    const appName = app || task.replace('open ', '').trim();
                    result = await systemCapsule.openApp(appName);
                } else if (op_code === 'EXEC' || intent === 'CMD') {
                    result = await systemCapsule.runCommand(task);
                }

                // Send response back
                if (packet.route.reply_to) {
                    const response = createPacket(
                        'kontur://organ/system',
                        packet.route.reply_to,
                        PacketIntent.RESPONSE,
                        { msg: result.success ? `Done: ${result.output || result.message}` : `Error: ${result.message || result.output}` }
                    );
                    konturCore.ingest(response);
                }
            }
        };
        konturCore.register('kontur://organ/system', systemHandler);
    }

    // MCP Handlers (Filesystem)
    konturCore.register('kontur://organ/mcp/filesystem', {
        send: async (packet: any) => {
            console.log('[MCP HANDLER] Processing Filesystem Request:', packet.payload);
            const tool = packet.payload.tool || packet.payload.action; // Fallback
            const args = packet.payload.args;

            try {
                const result = await konturCortex.executeTool(tool, args);

                if (packet.route.reply_to) {
                    const response = createPacket(
                        'kontur://organ/mcp/filesystem',
                        packet.route.reply_to,
                        PacketIntent.RESPONSE,
                        { msg: `MCP Logic Executed. Result: ${JSON.stringify(result)}` }
                    );
                    konturCore.ingest(response);
                }
            } catch (e: any) {
                console.error('[MCP HANDLER] Execution Failed:', e);
                if (packet.route.reply_to) {
                    const response = createPacket(
                        'kontur://organ/mcp/filesystem',
                        packet.route.reply_to,
                        PacketIntent.ERROR,
                        { error: e.message, msg: `Failed to execute ${tool}: ${e.message}` }
                    );
                    konturCore.ingest(response);
                }
            }
        }
    });

    // MCP Handlers (OS)
    konturCore.register('kontur://organ/mcp/os', {
        send: async (packet: any) => {
            console.log('[MCP HANDLER] Processing OS Request:', packet.payload);
            const tool = packet.payload.tool || packet.payload.action;
            const args = packet.payload.args;

            try {
                const result = await konturCortex.executeTool(tool, args);
                if (packet.route.reply_to) {
                    const response = createPacket(
                        'kontur://organ/mcp/os',
                        packet.route.reply_to,
                        PacketIntent.RESPONSE,
                        { msg: `OS Command Executed: ${JSON.stringify(result)}` }
                    );
                    konturCore.ingest(response);
                }
            } catch (e: any) {
                console.error('[MCP HANDLER] OS Execution Failed:', e);
                if (packet.route.reply_to) {
                    const response = createPacket(
                        'kontur://organ/mcp/os',
                        packet.route.reply_to,
                        PacketIntent.ERROR,
                        { error: e.message, msg: `Failed to execute ${tool}: ${e.message}` }
                    );
                    konturCore.ingest(response);
                }
            }
        }
    });

    if (process.env.AG === 'true') {
        const agScript = join(__dirname, '../kontur/ag/ag-worker.py');
        konturCore.loadPlugin('kontur://organ/ag/sim', { cmd: pythonCmd, args: [agScript] });
    }

    return { core: konturCore, cortex: konturCortex };
}

function createWindow(): void {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        ...(process.platform === 'linux' ? { icon: join(__dirname, '../../build/icon.png') } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    // Initialize KONTUR system
    initializeKONTUR().catch(e => console.error('[KONTUR] Initialization failed:', e));

    // Setup IPC handlers for KONTUR
    ipcMain.removeHandler('kontur:registry');
    ipcMain.handle('kontur:registry', () => konturCore.getRegistry());

    ipcMain.removeHandler('kontur:send');
    ipcMain.handle('kontur:send', (_, packet) => {
        console.log('[MAIN IPC] Received packet:', JSON.stringify(packet, null, 2));
        konturCore.ingest(packet);
        return true;
    });

    // Voice TTS handler
    ipcMain.removeHandler('voice:speak');
    ipcMain.handle('voice:speak', async (_, { text, voiceName }) => {
        try {
            const { VoiceCapsule } = await import('../kontur/voice/VoiceCapsule');
            const voice = new VoiceCapsule();
            const audioBuffer = await voice.speak(text, { voiceName });

            if (audioBuffer) {
                // Return audio buffer directly to renderer
                return { success: true, audioBuffer };
            }
            return { success: false, error: 'No audio generated' };
        } catch (error: any) {
            console.error('[MAIN] Voice TTS error:', error);
            return { success: false, error: error.message };
        }
    });

    // --- GRISHA: Gemini Live Vision Integration ---
    (async () => {
        try {
            const { GeminiLiveService } = await import('../kontur/vision/GeminiLiveService');
            // Use GEMINI_LIVE_API_KEY as requested
            const apiKey = process.env.GEMINI_LIVE_API_KEY || process.env.GOOGLE_API_KEY;
            console.log('[MAIN] Grisha Key Source:', process.env.GEMINI_LIVE_API_KEY ? 'GEMINI_LIVE_API_KEY' : 'GOOGLE_API_KEY');

            if (apiKey) {
                const geminiLive = new GeminiLiveService(apiKey);

                // Connect automatically
                geminiLive.connect().catch(e => console.error("Gemini Connect Fail", e));

                // Handle critical errors to prevent crash
                geminiLive.on('error', (err) => {
                    console.error('[MAIN] Gemini Live Error:', err.message);
                    // Optionally notify UI
                    synapse.emit('GRISHA', 'ALERT', `Помилка доступу до зору: ${err.message}`);
                });

                // Forward Grisha's voice/text to UI is handled by GrishaObserver below
                // geminiLive.on('text', (text) => {
                //    synapse.emit('GRISHA', 'INFO', text);
                // });

                // IPC: Receive Video Stream from Client
                ipcMain.removeHandler('vision:stream_frame');
                ipcMain.handle('vision:stream_frame', (_, { image }) => {
                    geminiLive.sendVideoFrame(image);
                    return true;
                });

                // --- Initialize GrishaObserver for automatic task observation ---
                const { GrishaObserver } = await import('../kontur/vision/GrishaObserver');
                const grishaObserver = new GrishaObserver();
                grishaObserver.setGeminiLive(geminiLive);

                // Forward Grisha's observations to UI
                grishaObserver.on('observation', (result: any) => {
                    synapse.emit('GRISHA', result.type.toUpperCase(), result.message);
                });

                // Forward Grisha's AUDIO to UI for playback
                grishaObserver.on('audio', (audioChunk: string) => {
                    // audioChunk is base64 PCM 24kHz (usually from Gemini Live output)
                    // We emit it to Synapse so the frontend can receive and play it
                    synapse.emit('GRISHA', 'AUDIO_CHUNK', { chunk: audioChunk });
                });

                // Expose observer for dispatcher to control
                (global as any).grishaObserver = grishaObserver;

                console.log('[MAIN] 👁️ Grisha Vision Service Bridge Active');
                console.log('[MAIN] 🔍 Grisha Observer Initialized');
            } else {
                console.warn('[MAIN] ⚠️ No API Key for Gemini Live Vision (GEMINI_LIVE_API_KEY/GOOGLE_API_KEY)');
            }
        } catch (e) {
            console.error('[MAIN] Failed to start Vision Service:', e);
        }
    })();

    // --- GRISHA: Window/Screen Source Selection ---
    ipcMain.removeHandler('vision:get_sources');
    ipcMain.handle('vision:get_sources', async () => {
        const { desktopCapturer } = await import('electron');
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
    });
    // ----------------------------------------------

    // Initialize tRPC
    createIPCHandler({ router: appRouter, windows: [mainWindow] })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
        // Emit Wake Signal
        synapse.emit('system', 'wake_up', { timestamp: Date.now() })
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.atlas.kontur')

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
