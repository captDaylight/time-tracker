import { appendFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { samplesDir, samplesFileFor } from "./paths.js";
import type { Sample } from "./types.js";

/** All local dates (YYYY-MM-DD) that have recorded samples, newest first. */
export function listDates(): string[] {
  try {
    return readdirSync(samplesDir())
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => f.replace(/\.jsonl$/, ""))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

/** Append one sample to today's JSONL file. */
export function appendSample(sample: Sample): void {
  appendFileSync(samplesFileFor(sample.date), JSON.stringify(sample) + "\n", "utf8");
}

/** Read all samples for a given local date (YYYY-MM-DD), sorted by time. */
export function readSamples(date: string): Sample[] {
  const file = samplesFileFor(date);
  if (!existsSync(file)) return [];
  const out: Sample[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed) as Sample);
    } catch {
      // skip malformed lines rather than failing the whole export
    }
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}
