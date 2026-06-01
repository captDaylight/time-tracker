// End-to-end test of the gap-edit feature against the live server.
import { startServer } from "../dist/server.js";
import { loadConfig } from "../dist/config.js";

const s = await startServer(loadConfig());
const base = s.url;
const get = (p) => fetch(base + p).then((r) => r.json());

const days = (await get("/api/days")).days;
const date = days[0];
let day = await get("/api/day?date=" + date);

// Find a gap (or idle) block to fill.
const gap = day.blocks.find((b) => b.type === "gap" || b.type === "idle");
if (!gap) { console.log("No gap/idle block to test against; skipping."); s.stop(); process.exit(0); }
console.log(`Found ${gap.type} ${gap.startLabel}-${gap.endLabel} id=${gap.id}`);

const beforeWork = day.summary.workMin;

// Fill the gap as worked time.
async function post(payload) {
  return fetch(base + "/api/edit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then((r) => r.json());
}
day = await post({ date, id: gap.id, category: "work", project: "Strong Residence", task: "Phone call", detail: "Contractor called about hose bibs" });
let edited = day.blocks.find((b) => b.id === gap.id);
console.log("After fill:", { type: edited.type, project: edited.project, task: edited.task, notes: edited.notes, edited: edited.edited, manual: edited.manual });
console.log(`workMin ${beforeWork} -> ${day.summary.workMin} (should increase by ~${Math.round(gap.durationMin)})`);

// Verify it shows up in the CSV.
const csv = await fetch(base + "/api/export?date=" + date).then((r) => r.text());
const csvHasIt = csv.includes("Strong Residence") && csv.includes("Contractor called about hose bibs");
console.log("CSV contains the filled gap:", csvHasIt);

// Mark another block as break, if available.
const second = day.blocks.find((b) => (b.type === "gap" || b.type === "idle") && b.id !== gap.id);
if (second) {
  const d2 = await post({ date, id: second.id, category: "break", task: "Lunch", detail: "stepped out" });
  const e2 = d2.blocks.find((b) => b.id === second.id);
  console.log("Break test:", { type: e2.type, task: e2.task }, "breakMin =", d2.summary.breakMin);
}

// Clear the first edit (revert).
const cleared = await post({ date, id: gap.id, cleared: true });
const reverted = cleared.blocks.find((b) => b.id === gap.id);
console.log("After clear, block type back to:", reverted.type, "(workMin", cleared.summary.workMin + ")");

const pass = edited.type === "work" && edited.project === "Strong Residence" && edited.manual === true &&
  day.summary.workMin > beforeWork && csvHasIt && reverted.type === gap.type;
console.log(pass ? "\nEDITTEST: PASS" : "\nEDITTEST: FAIL");
s.stop();
process.exit(pass ? 0 : 1);
