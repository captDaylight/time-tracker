import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { editsFileFor } from "./paths.js";
import type { Block } from "./types.js";

/**
 * A manual edit/override for one block, keyed by the block's start timestamp.
 * Stored separately from raw samples so re-aggregation never loses the user's input.
 */
export interface BlockEdit {
  /** Block start time in epoch ms, as a string (stable across re-aggregation). */
  id: string;
  project?: string;
  task?: string;
  /** Free-text details / notes from the user. */
  detail?: string;
  /** "work" counts toward worked time; "break" is labeled time-away (lunch, break, personal). */
  category?: "work" | "break";
  /** When true, the edit is removed (revert to the auto-detected value). */
  cleared?: boolean;
}

export function readEdits(date: string): Record<string, BlockEdit> {
  const file = editsFileFor(date);
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Record<string, BlockEdit>;
  } catch {
    return {};
  }
}

/** Persist (or clear) one edit for a date. */
export function saveEdit(date: string, edit: BlockEdit): void {
  const all = readEdits(date);
  if (edit.cleared) {
    delete all[edit.id];
  } else {
    all[edit.id] = { ...edit };
  }
  writeFileSync(editsFileFor(date), JSON.stringify(all, null, 2), "utf8");
}

/**
 * Overlay manual edits onto auto-detected blocks. A filled gap/idle becomes a
 * "work" (or "break") block; an edited work block gets its project/task/notes replaced.
 */
export function applyEdits(blocks: Block[], edits: Record<string, BlockEdit>): Block[] {
  return blocks.map((b) => {
    const e = edits[String(b.start)];
    if (!e) return b;
    const wasUntracked = b.type === "away";
    const category = e.category ?? "work";
    return {
      ...b,
      type: category === "break" ? "break" : "work",
      project: e.project !== undefined ? e.project : b.project,
      task: e.task !== undefined ? e.task : b.task,
      notes: e.detail !== undefined ? e.detail : b.notes,
      confidence: wasUntracked ? "" : b.confidence,
      edited: true,
      manual: wasUntracked,
    };
  });
}
