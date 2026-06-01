// Test screenshot listing/serving + purge (no Electron capture needed — we
// fabricate JPEG files with timestamped names, then exercise the server + purge).
import { writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { startServer } from "../dist/server.js";
import { loadConfig } from "../dist/config.js";
import { screenshotsDir } from "../dist/paths.js";
import { purgeOldShots } from "../dist/screenshots.js";

const dir = screenshotsDir();
mkdirSync(dir, { recursive: true });

// Minimal valid 1x1 JPEG.
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB/8AACwgAAQABAQERAP/EABQAAQAAAAAAAAAAAAAAAAAAAAD/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/AKp//9k=",
  "base64"
);

const now = Date.now();
// In-range shots (last 5 min), 2 monitors.
const t1 = now - 60_000, t2 = now - 120_000;
writeFileSync(join(dir, `${t1}_0.jpg`), JPEG);
writeFileSync(join(dir, `${t1}_1.jpg`), JPEG);
writeFileSync(join(dir, `${t2}_0.jpg`), JPEG);
// An old shot (20 days ago) that should be purged with 14-day retention.
const old = now - 20 * 86_400_000;
writeFileSync(join(dir, `${old}_0.jpg`), JPEG);

const s = await startServer(loadConfig());
const base = s.url;

// shotsInRange via API
const list = await fetch(`${base}/api/shots?start=${now - 300_000}&end=${now}`).then((r) => r.json());
console.log("Shots in last 5 min:", list.shots.map((x) => x.file));
const got3 = list.shots.length === 3;

// Serve one image
const img = await fetch(`${base}/shot?file=${encodeURIComponent(list.shots[0].file)}`);
const okImg = img.status === 200 && (img.headers.get("content-type") || "").includes("image/jpeg");
console.log("Serve image:", img.status, img.headers.get("content-type"));

// Path-traversal guard
const bad = await fetch(`${base}/shot?file=${encodeURIComponent("../config.json")}`);
console.log("Traversal blocked:", bad.status === 404);

// Purge old
const removed = purgeOldShots(14, now);
const oldGone = !existsSync(join(dir, `${old}_0.jpg`));
console.log(`Purged ${removed} old file(s); old gone: ${oldGone}`);

// cleanup our fabricated files
for (const f of readdirSync(dir)) if (/^\d+_\d+\.jpg$/.test(f)) {
  const ts = Number(f.split("_")[0]);
  if (ts === t1 || ts === t2) { try { (await import("node:fs")).unlinkSync(join(dir, f)); } catch {} }
}

s.stop();
const pass = got3 && okImg && bad.status === 404 && removed === 1 && oldGone;
console.log(pass ? "\nSHOTTEST: PASS" : "\nSHOTTEST: FAIL");
process.exit(pass ? 0 : 1);
