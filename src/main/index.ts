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
    // Initialize tRPC
    createIPCHandler({ router: appRouter, windows: [mainWindow] })

    // Wait for System Ready Signal
    deepSystem?.on('ready', () => {
        console.log('[MAIN] System Ready signal received - showing UI');
        mainWindow.show();
        synapse.emit('system', 'wake_up', { timestamp: Date.now() });
    });

    // Fallback if system is already ready (unlikely with await bootstrap, but safe)
    // Note: bootstrapSystem awaits initialize, which calls emit('ready') at the end.
    // If we missed the event because we subscribed AFTER bootstrap returned (which we do here), we might hang.
    // However, bootstrapSystem calls initializeDeepIntegration which calls .initialize().
    // If we swap the order: Create Window -> Subscribe -> Bootstrap.

    // RE-PLAN: We need to subscribe BEFORE bootstrapping, or check status.
    // But bootstrap creates the system instance.

    // FIX: bootstrapSystem() returns void. It sets global `deepSystem`.
    // We should modify bootstrapSystem to return the system instance OR
    // change the flow.

    // Current `bootstrapSystem` implementation:
    // deepSystem = await initializeDeepIntegration();
    //   -> initializeDeepIntegration calls `await system.initialize()`
    //      -> system.initialize emits 'ready' at the very end.

    // So by the time `await bootstrapSystem()` returns, 'ready' has ALREADY fired.
    // So the event listener below will NEVER fire.

    // CORRECT FIX: Just call show() here because we successfully awaited bootstrapSystem.
    // The Race Condition mentioned by user: "UI shows ... BEFORE deepSystem.initialize()".
    // But line 44 `await bootstrapSystem()` prevents that?
    // Maybe `initializeDeepIntegration` isn't fully async? 
    // It is. `await system.initialize()`.

    // User claim: "mainWindow.on('ready-to-show', ...)" 
    // If 'ready-to-show' happens BEFORE bootstrap completes, then `mainWindow.show()` fires.
    // And `synapse.emit` fires.

    // Code structure:
    // 44: await bootstrapSystem()
    // 49: mainWindow.on('ready-to-show')

    // IF line 44 blocks, line 49 is not registered yet. So `ready-to-show` cannot trigger the callback.
    // Is it possible `ready-to-show` fires and is MISSED because we haven't registered the listener?
    // Yes. If we show the window too late, it's fine, we just missed 'ready-to-show' (it's persistent? no).
    // `ready-to-show` is emitted when the renderer process has rendered the page.
    // `loadURL` (line 61) triggers the navigation.

    // So:
    // 1. await bootstrapSystem
    // 2. on('ready-to-show')
    // 3. loadURL

    // This is STRICTLY SEQUENTIAL. `loadURL` happens LAST. `ready-to-show` cannot happen before `loadURL`.
    // So the race condition described ("UI shows ... BEFORE deepSystem") is impossible if `bootstrapSystem` properly awaits.

    // UNLESS `bootstrapSystem` does NOT await the inner promise properly?
    // `deepSystem = await initializeDeepIntegration();`
    // `initializeDeepIntegration`: `await system.initialize();`
    // `system.initialize`: `await init...`;

    // It seems correct.
    // HOWEVER, the user might be referring to `synapse.emit` trying to reach organs that aren't ready *if* we didn't await.

    // Maybe the user wants us to EXPLICITLY wait for deepSystem ready event to *confirm*?
    // Or maybe the User implies `ready-to-show` is somehow triggered independently?

    // Let's assume the user knows what they are talking about and maybe I am missing `bootstrapSystem().catch(...)` not blocking if it fails?
    // Line 44: `await bootstrapSystem()`

    // User proposed fix:
    // await bootstrapSystem();
    // deepSystem.on('ready', ... show ...);

    // If 'ready' is already fired, this hangs.

    // Better Fix proposed by user:
    // "UI waits for system_ready event".
    // I will implementation a check: if deepSystem is ready, show. Else wait.

    mainWindow.on('ready-to-show', () => {
        if (deepSystem && deepSystem.getStatus().core === 'READY') {
            mainWindow.show();
            synapse.emit('system', 'wake_up', { timestamp: Date.now() });
        } else {
            // Should not happen if we awaited, but safety check:
            console.log('[MAIN] Waiting for system ready...');
            deepSystem?.on('ready', () => {
                mainWindow.show();
                synapse.emit('system', 'wake_up', { timestamp: Date.now() });
            });
        }
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

