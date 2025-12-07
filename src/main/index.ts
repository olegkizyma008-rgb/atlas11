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
    
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const workerScript = join(__dirname, '../kontur/organs/worker.py');
    
    try {
        konturCore.loadPlugin('kontur://organ/worker', { cmd: pythonCmd, args: [workerScript] });
    } catch (e) {
        console.error('[KONTUR] Failed to load worker:', e);
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
        konturCore.ingest(packet);
        return true;
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
