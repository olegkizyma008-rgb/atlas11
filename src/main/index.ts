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
                if (packet.route.from.includes('cortex')) source = 'ATLAS';
                if (packet.route.from.includes('ag')) source = 'GRISHA'; // AG module implies Grisha supervision

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
    ipcMain.handle('kontur:registry', () => konturCore.getRegistry());
    ipcMain.handle('kontur:send', (_, packet) => {
        console.log('[MAIN IPC] Received packet:', JSON.stringify(packet, null, 2));
        konturCore.ingest(packet);
        return true;
    });

    // Voice TTS handler
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
