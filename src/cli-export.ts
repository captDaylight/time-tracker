/**
 * Stand-alone exporter (no Electron). Usage:
 *   node dist/cli-export.js [YYYY-MM-DD]
 * Defaults to today. Reads raw samples, aggregates into blocks, writes the CSV.
 */
import { loadConfig } from "./config.js";
import { readSamples } from "./store.js";
import { aggregate } from "./aggregate.js";
import { applyEdits, readEdits } from "./edits.js";
import { writeCsv } from "./csv.js";
import { localDate } from "./timeutil.js";

function main(): void {
  const date = process.argv[2] ?? localDate();
  const config = loadConfig();
  const samples = readSamples(date);
  if (samples.length === 0) {
    console.log(`No samples for ${date}. Nothing to export.`);
    return;
  }
  const blocks = applyEdits(aggregate(samples, config), readEdits(date));
  const file = writeCsv(date, blocks);
  const work = blocks.filter((b) => b.type === "work");
  const totalMin = work.reduce((s, b) => s + b.durationMin, 0);
  console.log(`Exported ${blocks.length} blocks (${(totalMin / 60).toFixed(1)}h tracked) → ${file}`);
}

main();
