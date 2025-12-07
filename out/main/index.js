"use strict";
require("dotenv/config");
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const main = require("electron-trpc/main");
const rxjs = require("rxjs");
const zod = require("zod");
const server = require("@trpc/server");
const observable = require("@trpc/server/observable");
const SignalSchema = zod.z.object({
  source: zod.z.string(),
  // e.g., 'atlas', 'system', 'voice'
  type: zod.z.string(),
  // e.g., 'context_updated', 'request_tts', 'voice_command'
  payload: zod.z.any()
  // Flexible payload for now
});
class Synapse {
  bus$ = new rxjs.Subject();
  /**
   * Emit a signal to the bus.
   */
  emit(source, type, payload = {}) {
    const signal = { source, type, payload };
    const result = SignalSchema.safeParse(signal);
    if (!result.success) {
      console.error("Invalid Synapse Signal:", result.error);
      return;
    }
    this.bus$.next(signal);
  }
  /**
   * Listen for specific signals.
   */
  listen(source, type) {
    return this.bus$.pipe(
      rxjs.filter((s) => s.source === source && s.type === type),
      rxjs.map((s) => s.payload)
    );
  }
  /**
   * Listen to EVERYTHING (for monitoring/UI).
   */
  monitor() {
    return this.bus$.asObservable();
  }
}
const synapse = new Synapse();
const t = server.initTRPC.create();
const router = t.router;
const publicProcedure = t.procedure;
const appRouter = router({
  health: publicProcedure.query(() => "KONTUR 2.0 Alive"),
  synapse: publicProcedure.subscription(() => {
    return observable.observable((emit) => {
      const sub = synapse.monitor().subscribe({
        next: (signal) => emit.next(signal),
        error: (err) => emit.error(err),
        complete: () => emit.complete()
      });
      return () => sub.unsubscribe();
    });
  })
});
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon: path.join(__dirname, "../../build/icon.png") } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  main.createIPCHandler({ router: appRouter, windows: [mainWindow] });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    synapse.emit("system", "wake_up", { timestamp: Date.now() });
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.atlas.kontur");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
