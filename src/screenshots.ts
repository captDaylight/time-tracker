import { existsSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { screenshotsDir } from "./paths.js";

/**
 * Screenshots are stored as files named `<epochMs>_<displayIndex>.jpg` in the
 * screenshots dir. This module handles listing/lookup/purge with NO Electron
 * dependency, so the web server can use it. Capture itself lives in main.ts
 * (it needs Electron's desktopCapturer).
 */

export interface Shot {
  /** Capture time, epoch ms. */
  ts: number;
  /** Which monitor (0-based). */
  display: number;
  /** Bare filename, e.g. "1780165442733_0.jpg". */
  file: string;
}

const FILE_RE = /^(\d+)_(\d+)\.jpg$/;

function parse(file: string): Shot | null {
  const m = FILE_RE.exec(file);
  if (!m) return null;
  return { ts: Number(m[1]), display: Number(m[2]), file };
}

/** All shots whose capture time falls within [startMs, endMs], oldest first. */
export function shotsInRange(startMs: number, endMs: number): Shot[] {
  const dir = screenshotsDir();
  if (!existsSync(dir)) return [];
  const out: Shot[] = [];
  for (const f of readdirSync(dir)) {
    const s = parse(f);
    if (s && s.ts >= startMs && s.ts <= endMs) out.push(s);
  }
  out.sort((a, b) => a.ts - b.ts || a.display - b.display);
  return out;
}

/** Resolve a requested filename to a safe absolute path inside the screenshots dir. */
export function shotPath(file: string): string | null {
  const safe = basename(file); // strip any path components (traversal guard)
  if (!FILE_RE.test(safe)) return null;
  const full = join(screenshotsDir(), safe);
  return existsSync(full) ? full : null;
}

/** Delete screenshots older than retentionDays. Returns count removed. */
export function purgeOldShots(retentionDays: number, nowMs: number): number {
  const dir = screenshotsDir();
  if (!existsSync(dir)) return 0;
  const cutoff = nowMs - retentionDays * 86_400_000;
  let removed = 0;
  for (const f of readdirSync(dir)) {
    const s = parse(f);
    const ts = s ? s.ts : safeMtime(join(dir, f));
    if (ts !== null && ts < cutoff) {
      try {
        unlinkSync(join(dir, f));
        removed++;
      } catch {
        // ignore files we can't remove
      }
    }
  }
  return removed;
}

function safeMtime(p: string): number | null {
  try {
    return statSync(p).mtimeMs;
  } catch {
    return null;
  }
}
