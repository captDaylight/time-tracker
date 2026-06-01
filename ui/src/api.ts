export type BlockType = "work" | "away" | "break";

export interface Project {
  id: string;
  name: string;
  externalId?: string;
  folders: string[];
  titleKeywords?: string[];
  color?: string;
}

export interface UIBlock {
  id: string;
  date: string;
  start: number;
  end: number;
  durationMin: number;
  type: BlockType;
  project: string;
  task: string;
  app: string;
  detail: string;
  notes: string;
  confidence: "high" | "medium" | "low" | "";
  edited?: boolean;
  manual?: boolean;
  startLabel: string;
  endLabel: string;
}

export interface DaySummary {
  trackedMin: number;
  workMin: number;
  awayMin: number;
  breakMin: number;
  byProject: { project: string; min: number; confidence: string }[];
  current: { project: string; task: string; app: string; type: BlockType; sinceMin: number } | null;
}

export interface DayPayload {
  date: string;
  blocks: UIBlock[];
  summary: DaySummary;
  projects: Project[];
}

export interface Shot {
  ts: number;
  display: number;
  file: string;
  label: string;
}

export interface Health {
  status: "ok" | "no-permission" | "starting";
  lastError: string | null;
  lastGoodTs: number | null;
  platform: string;
}

const j = (r: Response) => {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
};

export const api = {
  days: (): Promise<{ days: string[] }> => fetch("/api/days").then(j),
  health: (): Promise<Health> => fetch("/api/health").then(j),
  day: (date: string): Promise<DayPayload> => fetch(`/api/day?date=${encodeURIComponent(date)}`).then(j),
  projects: (): Promise<{ projects: Project[] }> => fetch("/api/projects").then(j),
  saveProjects: (projects: Project[]): Promise<{ projects: Project[] }> =>
    fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects }),
    }).then(j),
  shots: (start: number, end: number): Promise<{ shots: Shot[] }> =>
    fetch(`/api/shots?start=${start}&end=${end}`).then(j),
  edit: (payload: {
    date: string;
    id: string;
    category?: "work" | "break";
    project?: string;
    task?: string;
    detail?: string;
    cleared?: boolean;
  }): Promise<DayPayload> =>
    fetch("/api/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(j),
  exportUrl: (date: string) => `/api/export?date=${encodeURIComponent(date)}`,
  shotUrl: (file: string) => `/shot?file=${encodeURIComponent(file)}`,
};

export const fmtH = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/** The ~20-color palette offered by the project color picker. */
export const PALETTE = [
  "#3a7afe", "#4f8cff", "#3fb6c4", "#23a06b", "#4caf78",
  "#86b300", "#c4b000", "#e0a33e", "#f0883e", "#e0617d",
  "#d6456b", "#b65fd6", "#9b7ed6", "#7c6cf5", "#5a6cf0",
  "#c47d4b", "#8a6f5c", "#5f8a8a", "#8a8a5f", "#6b7280",
];
