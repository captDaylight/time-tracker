import { app, Tray, Menu, BrowserWindow, desktopCapturer, screen, powerMonitor, shell, nativeImage } from "electron";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig, configPath } from "./config.js";
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

function buildTray(): void {
  tray = new Tray(nativeImage.createEmpty());
  if (process.platform === "darwin") tray.setTitle(" ⏱");
  tray.setToolTip("TimeTracker — passively recording your day");
  const menu = Menu.buildFromTemplate([
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
    { label: "Quit", click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on("click", showWindow);
}

app.whenReady().then(async () => {
  const config = loadConfig();
  console.log(`[main] config at ${configPath()}`);

  try {
    server = await startServer(config);
  } catch (err) {
    console.error(`[main] could not start web server on port ${config.httpPort}:`, err);
  }

  buildTray();
  stopSampler = await startSampler(config);
  startScreenshots(config);
  showWindow();

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
