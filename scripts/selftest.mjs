// Deterministic self-test of the core pipeline (no Electron, no permissions).
import { aggregate } from "../dist/aggregate.js";
import { classify } from "../dist/classify.js";
import { blocksToCsv } from "../dist/csv.js";

const config = {
  workHours: { start: "08:00", end: "19:00" },
  sampleIntervalSec: 15,
  blockMinGapSec: 120,
  idleThresholdSec: 300,
  minBlockMinutes: 1,
  projects: [
    { id: "strong", name: "Strong Residence", folders: ["Strong Residence", "StrongRes"], titleKeywords: ["strong"] },
    { id: "oak", name: "Oak Street", folders: ["Oak Street"], titleKeywords: ["oak"] },
  ],
  taskRules: [
    { label: "indesign", app: "indesign", task: "Presentation drawing" },
    { label: "excel", app: "excel", task: "Bidding / documentation" },
    { label: "pinterest", urlContains: ["pinterest.com"], task: "Reference research" },
  ],
};

// Build a synthetic morning: 15s samples.
const base = new Date("2026-05-30T09:00:00").getTime();
const mk = (offsetMin, app, title, url = "", idleSec = 0) => ({
  ts: base + offsetMin * 60000,
  date: "2026-05-30",
  time: "",
  app,
  title,
  exePath: "C:/Program Files/" + app + "/app.exe",
  url,
  idleSec,
});

const samples = [];
// 09:00-09:20 InDesign on Strong Residence presentation (every 15s)
for (let m = 0; m < 20; m += 0.25) samples.push(mk(m, "Adobe InDesign 2024", "Strong Residence - Presentation.indd"));
// 09:20-09:35 Excel on Oak Street bidding
for (let m = 20; m < 35; m += 0.25) samples.push(mk(m, "Microsoft Excel", "Oak Street Bid Tracker.xlsx"));
// 09:35-09:45 Chrome on Pinterest (unknown project, but task = reference research)
for (let m = 35; m < 45; m += 0.25) samples.push(mk(m, "Google Chrome", "fence colors - Pinterest", "https://www.pinterest.com/search"));
// GAP: nothing from 09:45 to 10:15 (phone call / printed something)
// 10:15-10:30 back in InDesign Strong
for (let m = 75; m < 90; m += 0.25) samples.push(mk(m, "Adobe InDesign 2024", "Strong Residence - Presentation.indd"));
// 10:30-10:45 idle (away)
for (let m = 90; m < 105; m += 0.25) samples.push(mk(m, "Finder", "Desktop", "", 600));

console.log("=== classify spot checks ===");
for (const s of [samples[0], samples[85], samples[150]]) {
  console.log(`${s.app} | "${s.title}" ->`, classify(s, config));
}

console.log("\n=== aggregated blocks ===");
const blocks = aggregate(samples, config);
for (const b of blocks) {
  const t = new Date(b.start).toTimeString().slice(0, 5);
  const e = new Date(b.end).toTimeString().slice(0, 5);
  console.log(`${t}-${e} [${b.type}] ${b.project || ""} ${b.task ? "/ " + b.task : ""} (${b.durationMin}min, conf=${b.confidence})`);
}

console.log("\n=== CSV ===");
console.log(blocksToCsv(blocks));

// Assertions
const types = blocks.map((b) => b.type);
// The gap (09:45–10:15) and the trailing idle (10:30–10:45) should both be "away".
const awayBlocks = blocks.filter((b) => b.type === "away");
const ok =
  blocks.some((b) => b.project === "Strong Residence" && b.task === "Presentation drawing" && b.confidence === "high") &&
  blocks.some((b) => b.project === "Oak Street" && b.task === "Bidding / documentation") &&
  blocks.some((b) => b.task === "Reference research") &&
  types.includes("away") &&
  !types.includes("gap") &&
  !types.includes("idle") &&
  awayBlocks.length >= 1;
console.log(`away blocks: ${awayBlocks.length}`);
console.log(ok ? "\nSELFTEST: PASS" : "\nSELFTEST: FAIL");
process.exit(ok ? 0 : 1);
