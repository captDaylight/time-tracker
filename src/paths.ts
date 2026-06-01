import { homedir, platform } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

/**
 * Resolve the app data directory in a way that works BOTH inside Electron and
 * in a plain Node process (the CLI exporter). We deliberately avoid depending on
 * Electron's app.getPath() so the same storage layout is shared by every entry point.
 */
export function dataDir(): string {
  const p = platform();
  let base: string;
  if (p === "win32") {
    base = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
  } else if (p === "darwin") {
    base = join(homedir(), "Library", "Application Support");
  } else {
    base = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  }
  const dir = join(base, "time-tracker");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function samplesDir(): string {
  const dir = join(dataDir(), "samples");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function exportsDir(): string {
  const dir = join(dataDir(), "exports");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function editsDir(): string {
  const dir = join(dataDir(), "edits");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** JSON file holding manual edits/overrides for a given local date. */
export function editsFileFor(date: string): string {
  return join(editsDir(), `${date}.json`);
}

export function screenshotsDir(): string {
  const dir = join(dataDir(), "screenshots");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** JSONL file holding raw samples for a given local date (YYYY-MM-DD). */
export function samplesFileFor(date: string): string {
  return join(samplesDir(), `${date}.jsonl`);
}

export function configFile(): string {
  return join(dataDir(), "config.json");
}
