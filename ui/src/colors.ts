import type { Project, UIBlock } from "./api";

const AWAY_COLOR = "#3a3f4b"; // muted slate
const BREAK_COLOR = "#9b7ed6"; // violet
const UNKNOWN_COLOR = "#6b7280"; // gray

/**
 * Build a project-NAME → color map for a day. Each project defines its own color
 * (set in the projects manager); we fall back to gray for anything unconfigured.
 */
export function buildColorMap(projects: Project[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of projects) map.set(p.name, p.color || UNKNOWN_COLOR);
  return map;
}

/** Resolve the display color for a single block. */
export function blockColor(b: UIBlock, colors: Map<string, string>): string {
  if (b.type === "away") return AWAY_COLOR;
  if (b.type === "break") return BREAK_COLOR;
  if (!b.project || b.project === "(unknown)") return UNKNOWN_COLOR;
  return colors.get(b.project) ?? UNKNOWN_COLOR;
}

export { AWAY_COLOR, BREAK_COLOR, UNKNOWN_COLOR };
