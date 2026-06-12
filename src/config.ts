import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { configFile } from "./paths.js";
import type { Config, ProjectRule } from "./types.js";

export const DEFAULT_CONFIG: Config = {
  workHours: { start: "08:00", end: "19:00" },
  autoLaunch: true,
  httpPort: 4321,
  sampleIntervalSec: 15,
  screenshotsEnabled: true,
  screenshotIntervalSec: 600,
  screenshotRetentionDays: 14,
  screenshotWidth: 1280,
  blockMinGapSec: 120,
  idleThresholdSec: 300,
  minBlockMinutes: 1,
  ignoreApps: ["TimeTracker", "Electron"],
  coalesceAwayMaxMin: 5,
  projects: [],
  taskRules: [
    { label: "InDesign → presentation drawing", app: "indesign", task: "Presentation drawing" },
    { label: "Illustrator → presentation drawing", app: "illustrator", task: "Presentation drawing" },
    { label: "AutoCAD → drafting", app: "autocad", task: "Drafting" },
    { label: "Excel → bidding / documentation", app: "excel", task: "Bidding / documentation" },
    { label: "Acrobat → markups", app: "acrobat", task: "Markups / review" },
    { label: "Outlook → email", app: "outlook", task: "Email / coordination" },
    { label: "Teams → calls", app: "teams", task: "Coordination call" },
    { label: "Zoom → calls", app: "zoom", task: "Coordination call" },
    { label: "Pinterest → reference research", urlContains: ["pinterest.com"], task: "Reference research" },
    { label: "Word → documentation", app: "word", task: "Documentation" },
  ],
};

/** Load config from disk, seeding the default on first run. */
export function loadConfig(): Config {
  const file = configFile();
  if (!existsSync(file)) {
    writeFileSync(file, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
    return DEFAULT_CONFIG;
  }
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<Config>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err) {
    console.error(`[config] Failed to parse ${file}, using defaults:`, err);
    return DEFAULT_CONFIG;
  }
}

/** Persist the full config object to disk. */
export function saveConfig(config: Config): void {
  writeFileSync(configFile(), JSON.stringify(config, null, 2), "utf8");
}

/** Replace the projects list and persist; returns the updated config. */
export function saveProjects(projects: ProjectRule[]): Config {
  const config = loadConfig();
  config.projects = projects;
  saveConfig(config);
  return config;
}

export function configPath(): string {
  return configFile();
}
