import type { Config, Sample } from "./types.js";

export interface Classification {
  projectId: string | null;
  project: string;
  task: string;
  confidence: "high" | "medium" | "low";
}

function has(haystack: string, needle: string): boolean {
  return needle.length > 0 && haystack.toLowerCase().includes(needle.toLowerCase());
}

/** Normalize path separators so a folder rule matches on both Windows (\) and macOS (/).
 * Backslashes become forward slashes; trailing slashes are dropped. */
function normalizePath(s: string): string {
  return s.replace(/\\/g, "/").replace(/\/+$/g, "");
}

/** Folder match that is path-separator agnostic (works for Windows and Mac paths). */
function hasFolder(haystack: string, folder: string): boolean {
  return has(normalizePath(haystack), normalizePath(folder));
}

/**
 * Map a single sample to a project + task using the rules config.
 *
 * Project signal strength:
 *   high   — a project folder/path fragment appears in the title or exe path
 *   medium — a project title keyword appears
 *   low    — nothing matched (project unknown)
 */
export function classify(sample: Sample, config: Config): Classification {
  const hayStrong = `${sample.title} ${sample.exePath} ${sample.url}`;
  const hayKeyword = `${sample.title} ${sample.url}`;

  let projectId: string | null = null;
  let project = "";
  let confidence: "high" | "medium" | "low" = "low";

  for (const p of config.projects) {
    if (p.folders.some((f) => hasFolder(hayStrong, f))) {
      projectId = p.id;
      project = p.name;
      confidence = "high";
      break;
    }
  }
  if (!projectId) {
    for (const p of config.projects) {
      if (p.titleKeywords.some((k) => has(hayKeyword, k))) {
        projectId = p.id;
        project = p.name;
        confidence = "medium";
        break;
      }
    }
  }

  // Task inference (independent of project): first matching task rule wins.
  let task = "";
  for (const rule of config.taskRules) {
    const appOk = rule.app ? has(sample.app, rule.app) : true;
    const urlOk = rule.urlContains ? rule.urlContains.some((u) => has(sample.url, u)) : true;
    const titleOk = rule.titleContains ? rule.titleContains.some((t) => has(sample.title, t)) : true;
    const usedAny = Boolean(rule.app || rule.urlContains || rule.titleContains);
    if (usedAny && appOk && urlOk && titleOk) {
      task = rule.task;
      break;
    }
  }

  return { projectId, project: project || "(unknown)", task, confidence };
}
