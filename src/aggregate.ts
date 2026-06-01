import { classify } from "./classify.js";
import { minutesBetween } from "./timeutil.js";
import type { Block, Config, Sample } from "./types.js";

function includesCI(haystack: string, needle: string): boolean {
  return needle.length > 0 && haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Collapse raw samples into contiguous blocks.
 *
 *  - Consecutive samples that share the same project merge into one work block.
 *  - "away" time has two sources that are merged into a single block type:
 *      • an idle sample (idleSec >= threshold) — at the computer but no input, and
 *      • a time gap between samples (> blockMinGapSec) — no data at all (asleep,
 *        on a phone call, printed something, etc).
 *    Treating them separately produced a confusing ladder of alternating idle/gap
 *    slivers when the machine half-slept, so consecutive away time of EITHER source
 *    merges into one block.
 *
 * Each sample represents roughly sampleIntervalSec of time; a block's end is extended one
 * interval past its last sample so durations reflect occupied time rather than sample spans.
 */
export function aggregate(samples: Sample[], config: Config): Block[] {
  if (samples.length === 0) return [];
  const intervalMs = config.sampleIntervalSec * 1000;
  const gapMs = config.blockMinGapSec * 1000;

  type Open = {
    type: "work" | "away";
    projectId: string | null;
    project: string;
    task: string;
    app: string;
    confidence: "high" | "medium" | "low";
    start: number;
    end: number;
    titles: Map<string, number>;
  };

  const blocks: Block[] = [];
  let open: Open | null = null;

  const flush = () => {
    if (!open) return;
    const detail = [...open.titles.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([t]) => t)
      .join(" | ");
    const away = open.type === "away";
    blocks.push({
      date: samples[0].date,
      start: open.start,
      end: open.end,
      durationMin: minutesBetween(open.start, open.end),
      type: open.type,
      projectId: away ? null : open.projectId,
      project: away ? "" : open.project,
      task: away ? "" : open.task,
      app: away ? "" : open.app,
      detail: away ? "" : detail,
      confidence: away ? "" : open.confidence,
      notes: "",
    });
    open = null;
  };

  // Open or extend an "away" block spanning [start, end], merging with the
  // currently-open away block (from either a gap or an idle sample).
  const openAway = (start: number, end: number) => {
    if (open && open.type === "away") {
      open.start = Math.min(open.start, start);
      open.end = Math.max(open.end, end);
    } else {
      flush();
      open = {
        type: "away",
        projectId: null,
        project: "",
        task: "",
        app: "",
        confidence: "low",
        start,
        end,
        titles: new Map(),
      };
    }
  };

  let prevTs: number | null = null;

  for (const s of samples) {
    // A time gap between this sample and the previous one is "away" time.
    if (prevTs !== null && s.ts - prevTs > gapMs) {
      openAway(prevTs + intervalMs, s.ts);
    }
    prevTs = s.ts;

    // An idle sample is "away" time. So is time spent in an ignored app (the
    // tracker's own window) — looking at the tracker isn't work. Both merge with
    // any adjacent gap.
    const ignored = config.ignoreApps?.some((a) => includesCI(s.app, a)) ?? false;
    if (s.idleSec >= config.idleThresholdSec || ignored) {
      openAway(s.ts, s.ts + intervalMs);
      continue;
    }

    const c = classify(s, config);
    const key = c.projectId ?? "__unknown__";
    if (open && open.type === "work" && (open.projectId ?? "__unknown__") === key) {
      open.end = s.ts + intervalMs;
      if (s.title) open.titles.set(s.title, (open.titles.get(s.title) ?? 0) + 1);
      if (c.confidence === "high") open.confidence = "high";
      if (c.task) open.task = c.task;
      if (s.app) open.app = s.app;
    } else {
      flush();
      open = {
        type: "work",
        projectId: c.projectId,
        project: c.project,
        task: c.task,
        app: s.app,
        confidence: c.confidence,
        start: s.ts,
        end: s.ts + intervalMs,
        titles: new Map(s.title ? [[s.title, 1]] : []),
      };
    }
  }
  flush();

  const filtered = blocks.filter((b) => b.type !== "work" || b.durationMin >= config.minBlockMinutes);
  return coalesceAway(filtered, config.coalesceAwayMaxMin);
}

/**
 * Tidy up "away" runs so they read as one block:
 *  1. A short unknown-project work block (≤ maxMin) sandwiched BETWEEN away on both
 *     sides is just a brief wake-up (e.g. an empty browser tab popping up mid-break)
 *     — convert it to away. We deliberately require away on BOTH sides so that
 *     recently-started or trailing activity (which has no "away" after it yet) is
 *     never swallowed — that previously made live, active work show up as "away".
 *  2. Merge consecutive away blocks into one contiguous span.
 */
function coalesceAway(blocks: Block[], maxMin: number): Block[] {
  const converted = blocks.map((b, i) => {
    if (b.type === "work" && b.projectId === null && b.durationMin <= maxMin) {
      const prevAway = i > 0 && blocks[i - 1].type === "away";
      const nextAway = i < blocks.length - 1 && blocks[i + 1].type === "away";
      if (prevAway && nextAway) {
        return { ...b, type: "away" as const, projectId: null, project: "", task: "", app: "", detail: "", confidence: "" as const };
      }
    }
    return b;
  });

  const out: Block[] = [];
  for (const b of converted) {
    const last = out[out.length - 1];
    if (b.type === "away" && last && last.type === "away") {
      last.start = Math.min(last.start, b.start);
      last.end = Math.max(last.end, b.end);
      last.durationMin = minutesBetween(last.start, last.end);
    } else {
      out.push({ ...b });
    }
  }
  return out;
}
