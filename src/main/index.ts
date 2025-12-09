import 'dotenv/config';
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createIPCHandler } from 'electron-trpc/main'
import { synapse } from '../kontur/synapse'

// Import appRouter
import { appRouter } from './router'

// Import Unified System
import { initializeDeepIntegration, DeepIntegrationSystem } from './initialize-deep-integration';

let deepSystem: DeepIntegrationSystem | null = null;

async function bootstrapSystem() {
    try {
        deepSystem = await initializeDeepIntegration();

        // Setup IPC Bridge
        deepSystem.setupIPC(ipcMain);

        console.log('[MAIN] 🚀 Unified ATLAS-KONTUR System Booted');
    } catch (error) {
        console.error('[MAIN] 💥 Critical System Failure during Boot:', error);
    }
}

async function createWindow(): Promise<void> {
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

    // Initialize KONTUR system BEFORE showing window (fix race condition)
    await bootstrapSystem().catch(e => console.error('[KONTUR] Initialization failed:', e));

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

// Graceful Shutdown
app.on('before-quit', async () => {
    if (deepSystem) {
        console.log('[MAIN] Requesting System Shutdown...');
        await deepSystem.shutdown();
    }
});

