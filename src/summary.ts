import type { Block } from "./types.js";

export interface DaySummary {
  trackedMin: number;
  workMin: number;
  awayMin: number;
  breakMin: number;
  byProject: { project: string; min: number; confidence: "high" | "medium" | "low" | "mixed" }[];
  current: {
    project: string;
    task: string;
    app: string;
    type: Block["type"];
    sinceMin: number;
  } | null;
}

/** Roll blocks up into the numbers shown at the top of the Today window. */
export function summarize(blocks: Block[]): DaySummary {
  let workMin = 0;
  let awayMin = 0;
  let breakMin = 0;
  const projects = new Map<string, { min: number; confs: Set<string> }>();

  for (const b of blocks) {
    if (b.type === "work") {
      workMin += b.durationMin;
      const key = b.project || "(unknown)";
      const entry = projects.get(key) ?? { min: 0, confs: new Set() };
      entry.min += b.durationMin;
      if (b.confidence) entry.confs.add(b.confidence);
      projects.set(key, entry);
    } else if (b.type === "away") {
      awayMin += b.durationMin;
    } else if (b.type === "break") {
      breakMin += b.durationMin;
    }
  }

  const byProject = [...projects.entries()]
    .map(([project, v]) => ({
      project,
      min: Math.round(v.min),
      confidence:
        v.confs.size > 1 ? ("mixed" as const) : ((v.confs.values().next().value ?? "low") as "high" | "medium" | "low"),
    }))
    .sort((a, b) => b.min - a.min);

  const last = blocks[blocks.length - 1] ?? null;
  const current = last
    ? {
        project: last.project,
        task: last.task,
        app: last.app,
        type: last.type,
        sinceMin: last.durationMin,
      }
    : null;

  return {
    trackedMin: Math.round(workMin + awayMin + breakMin),
    workMin: Math.round(workMin),
    awayMin: Math.round(awayMin),
    breakMin: Math.round(breakMin),
    byProject,
    current,
  };
}
