import { app, Tray, Menu, BrowserWindow, desktopCapturer, screen, powerMonitor, shell, nativeImage } from "electron";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig, saveConfig, configPath } from "./config.js";
import { startSampler } from "./sampler.js";
import { startServer, type RunningServer } from "./server.js";
import { readSamples } from "./store.js";
import { aggregate } from "./aggregate.js";
import { applyEdits, readEdits } from "./edits.js";
import { purgeOldShots } from "./screenshots.js";
import { writeCsv } from "./csv.js";
import { exportsDir, dataDir, screenshotsDir } from "./paths.js";
import { localDate } from "./timeutil.js";
import type { Config } from "./types.js";

/** Marker passed on Windows so a login-triggered launch can start hidden. */
const HIDDEN_FLAG = "--hidden";

/** True when this process was started by the OS at login (vs. opened by the user). */
function wasOpenedAtLogin(): boolean {
  if (process.platform === "darwin") return app.getLoginItemSettings().wasOpenedAtLogin;
  return process.argv.includes(HIDDEN_FLAG);
}

/** Reconcile the OS login item (macOS Login Items / Windows Run key) with config.
 * Only touches packaged builds — in dev this would register the Electron binary. */
function syncAutoLaunch(config: Config): void {
  if (!app.isPackaged) return;
  try {
    // Always apply the desired state — setLoginItemSettings is idempotent, and
    // reading back via getLoginItemSettings is unreliable on Windows unless the
    // exact same path/args are passed, which would make a disable silently no-op.
    app.setLoginItemSettings({
      openAtLogin: config.autoLaunch,
      openAsHidden: true, // macOS: launch in the background without a window
      path: process.execPath, // Windows: the installed executable
      args: [HIDDEN_FLAG], // Windows: tell the login launch to stay hidden
    });
    console.log(`[autolaunch] open at login = ${config.autoLaunch}`);
  } catch (err) {
    console.error("[autolaunch] failed to set login item:", err);
  }
}

/** Flip auto-launch on/off, persisting to config and updating the OS login item. */
function setAutoLaunch(enabled: boolean): void {
  const config = loadConfig();
  config.autoLaunch = enabled;
  saveConfig(config);
  syncAutoLaunch(config);
  tray?.setContextMenu(buildMenu()); // refresh the checkbox state without re-creating the tray
}

let tray: Tray | null = null;
let win: BrowserWindow | null = null;
let server: RunningServer | null = null;
let stopSampler: (() => void) | null = null;
let shotTimer: NodeJS.Timeout | null = null;
let purgeTimer: NodeJS.Timeout | null = null;

/** Capture one JPEG per monitor into the screenshots dir, named <ts>_<index>.jpg. */
async function captureScreens(config: Config): Promise<void> {
  try {
    const displays = screen.getAllDisplays();
    const sf = displays[0]?.scaleFactor ?? 1;
    const width = config.screenshotWidth;
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width, height: Math.round((width * 0.625) / sf) * sf },
    });
    const ts = Date.now();
    sources.forEach((src, i) => {
      const jpeg = src.thumbnail.toJPEG(70);
      if (jpeg.length > 0) writeFileSync(join(screenshotsDir(), `${ts}_${i}.jpg`), jpeg);
    });
  } catch (err) {
    console.error("[screenshots] capture failed:", err);
  }
}

function startScreenshots(config: Config): void {
  if (!config.screenshotsEnabled) {
    console.log("[screenshots] disabled in config");
    return;
  }
  void captureScreens(config);
  shotTimer = setInterval(() => void captureScreens(config), config.screenshotIntervalSec * 1000);
  const purge = () => {
    const n = purgeOldShots(config.screenshotRetentionDays, Date.now());
    if (n) console.log(`[screenshots] purged ${n} old file(s)`);
  };
  purge();
  purgeTimer = setInterval(purge, 6 * 3600 * 1000); // every 6h
  console.log(`[screenshots] capturing every ${config.screenshotIntervalSec}s, keeping ${config.screenshotRetentionDays}d`);
}

function exportToday(): string | null {
  const config = loadConfig();
  const date = localDate();
  const samples = readSamples(date);
  if (samples.length === 0) return null;
  return writeCsv(date, applyEdits(aggregate(samples, config), readEdits(date)));
}

/** The Electron window is just a thin shell around the local web UI. */
function showWindow(): void {
  if (!server) return;
  if (win) {
    win.show();
    win.focus();
    win.reload();
    return;
  }
  win = new BrowserWindow({
    width: 820,
    height: 680,
    title: "TimeTracker",
    backgroundColor: "#1e1f24",
  });
  win.loadURL(server.url);
  win.on("closed", () => {
    win = null;
  });
}

function buildMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: "Show window", click: showWindow },
    { label: "Open in browser", click: () => server && shell.openExternal(server.url) },
    { type: "separator" },
    {
      label: "Export today's CSV",
      click: () => {
        const file = exportToday();
        if (file) shell.showItemInFolder(file);
      },
    },
    { label: "Open data folder", click: () => shell.openPath(dataDir()) },
    { label: "Open exports folder", click: () => shell.openPath(exportsDir()) },
    { label: "Open screenshots folder", click: () => shell.openPath(screenshotsDir()) },
    { label: "Open config file", click: () => shell.openPath(configPath()) },
    { type: "separator" },
    {
      label: "Start at login (background)",
      type: "checkbox",
      checked: loadConfig().autoLaunch,
      click: (item) => setAutoLaunch(item.checked),
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);
}

function buildTray(): void {
  tray = new Tray(nativeImage.createEmpty());
  if (process.platform === "darwin") tray.setTitle(" ⏱");
  tray.setToolTip("TimeTracker — passively recording your day");
  tray.setContextMenu(buildMenu());
  tray.on("click", showWindow);
}

app.whenReady().then(async () => {
  const config = loadConfig();
  console.log(`[main] config at ${configPath()}`);

  syncAutoLaunch(config);

  try {
    server = await startServer(config);
  } catch (err) {
    console.error(`[main] could not start web server on port ${config.httpPort}:`, err);
  }

  buildTray();
  stopSampler = await startSampler(config);
  startScreenshots(config);
  // When launched at login, stay in the background (tray only) — tracking still runs.
  if (!wasOpenedAtLogin()) showWindow();

  powerMonitor.on("suspend", () => exportToday());
  powerMonitor.on("shutdown", () => exportToday());
});

app.on("activate", showWindow);
app.on("before-quit", () => {
  stopSampler?.();
  if (shotTimer) clearInterval(shotTimer);
  if (purgeTimer) clearInterval(purgeTimer);
  server?.stop();
  exportToday();
});
app.on("window-all-closed", () => {
  // Stay alive in the background (tray app) even when the window is closed.
});
