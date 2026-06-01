/** A single raw observation of the focused window, taken every sampleIntervalSec. */
export interface Sample {
  /** Epoch milliseconds. */
  ts: number;
  /** Local date YYYY-MM-DD (the file this belongs to). */
  date: string;
  /** Local clock HH:MM:SS. */
  time: string;
  /** Application/owner name, e.g. "Adobe InDesign 2024". */
  app: string;
  /** Window title (often contains the document/file name). */
  title: string;
  /** Path to the application executable. */
  exePath: string;
  /** Browser URL when available (later phase; empty for now). */
  url: string;
  /** Seconds the system had been idle (no input) at sample time. */
  idleSec: number;
}

export interface ProjectRule {
  /** Stable internal id (used as the key in edits/classification). */
  id: string;
  /** Display name. */
  name: string;
  /** External id for downstream systems (e.g. Monograph). Optional. */
  externalId?: string;
  /** Root folder names / path fragments that identify this project — if a window's
   * file path or title contains one of these, the work is auto-tagged to this project
   * (case-insensitive substring). */
  folders: string[];
  /** Extra keywords in the window title that identify this project. */
  titleKeywords: string[];
  /** Hex color (e.g. "#3a7afe") used in the timeline, chips, and row dots. */
  color?: string;
}

export interface TaskRule {
  /** Human label for this rule (for debugging). */
  label: string;
  /** Match the app name (case-insensitive substring). Optional. */
  app?: string;
  /** Match any of these substrings in the URL (case-insensitive). Optional. */
  urlContains?: string[];
  /** Match any of these substrings in the title (case-insensitive). Optional. */
  titleContains?: string[];
  /** The inferred task to assign when this rule matches. */
  task: string;
}

export interface Config {
  workHours: { start: string; end: string };
  /** Port the local web UI listens on (http://localhost:PORT). */
  httpPort: number;
  sampleIntervalSec: number;
  /** Whether to capture periodic screenshots (memory aid for the review). */
  screenshotsEnabled: boolean;
  /** Seconds between screenshot captures. */
  screenshotIntervalSec: number;
  /** Delete screenshots older than this many days. */
  screenshotRetentionDays: number;
  /** Captured thumbnail width in px (height scales to each display's aspect). */
  screenshotWidth: number;
  /** Gap between consecutive samples larger than this (sec) becomes an unexplained "gap". */
  blockMinGapSec: number;
  /** System idle longer than this (sec) is treated as a break/away. */
  idleThresholdSec: number;
  /** Minimum minutes for a block to appear in the CSV (filters out micro-switches). */
  minBlockMinutes: number;
  /** App-name substrings that never count as activity (the tracker's own window, etc.).
   * Time spent here is treated as "away". */
  ignoreApps: string[];
  /** A short unknown-project work block (≤ this many minutes) sitting next to "away"
   * time is absorbed into it — removes the brief wake-ups that chop up away stretches. */
  coalesceAwayMaxMin: number;
  projects: ProjectRule[];
  taskRules: TaskRule[];
}

export type BlockType = "work" | "away" | "break";

/** An aggregated, contiguous stretch of time attributed to one project (or away/break).
 * "away" covers both unsampled gaps (asleep, phone call, off-screen) and OS-idle stretches —
 * they mean the same thing to the user, so they are merged. */
export interface Block {
  date: string;
  start: number;
  end: number;
  durationMin: number;
  type: BlockType;
  projectId: string | null;
  project: string;
  task: string;
  app: string;
  /** Top distinct window titles / urls seen during the block (memory aid). */
  detail: string;
  /** "high" (folder match) | "medium" (keyword) | "low" (none) | "" (gap/idle). */
  confidence: "high" | "medium" | "low" | "";
  notes: string;
  /** True when a manual edit has been applied to this block. */
  edited?: boolean;
  /** True when the user filled in a previously-empty gap/idle block by hand. */
  manual?: boolean;
}
