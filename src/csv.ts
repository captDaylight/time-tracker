import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { exportsDir } from "./paths.js";
import { hhmm } from "./timeutil.js";
import type { Block } from "./types.js";

function esc(v: string): string {
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

const HEADERS = [
  "Date",
  "Start",
  "End",
  "Duration (min)",
  "Type",
  "Project",
  "Task",
  "App",
  "Detail",
  "Confidence",
  "Notes",
];

export function blocksToCsv(blocks: Block[]): string {
  const rows = [HEADERS.join(",")];
  for (const b of blocks) {
    rows.push(
      [
        b.date,
        hhmm(b.start),
        hhmm(b.end),
        String(b.durationMin),
        b.type,
        b.project,
        b.task,
        b.app,
        b.detail,
        b.confidence,
        b.notes,
      ]
        .map(esc)
        .join(",")
    );
  }
  return rows.join("\n") + "\n";
}

/** Write the CSV for a date and return the file path. */
export function writeCsv(date: string, blocks: Block[]): string {
  const file = join(exportsDir(), `${date}.csv`);
  writeFileSync(file, blocksToCsv(blocks), "utf8");
  return file;
}
