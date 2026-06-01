import { powerMonitor } from "electron";
import { appendSample } from "./store.js";
import { reportCaptureOk, reportCaptureError, reportCaptureEmpty } from "./health.js";
import { localDate, localTime } from "./timeutil.js";
import type { Config, Sample } from "./types.js";

// get-windows is ESM-only; import the function lazily so this module stays simple.
type ActiveWindow = {
  title?: string;
  owner?: { name?: string; path?: string };
  url?: string;
};
type GetWindows = { activeWindow: () => Promise<ActiveWindow | undefined> };

let timer: NodeJS.Timeout | null = null;

export async function startSampler(config: Config): Promise<() => void> {
  const { activeWindow } = (await import("get-windows")) as unknown as GetWindows;

  const tick = async () => {
    try {
      const win = await activeWindow();
      const now = new Date();
      const idleSec =
        typeof powerMonitor?.getSystemIdleTime === "function"
          ? powerMonitor.getSystemIdleTime()
          : 0;
      const sample: Sample = {
        ts: now.getTime(),
        date: localDate(now),
        time: localTime(now),
        app: win?.owner?.name ?? "",
        title: win?.title ?? "",
        exePath: win?.owner?.path ?? "",
        url: win?.url ?? "",
        idleSec,
      };
      // Skip totally empty samples (e.g. no focused window) to avoid noise.
      if (sample.app || sample.title) {
        appendSample(sample);
        reportCaptureOk(sample.ts);
      } else {
        reportCaptureEmpty();
      }
    } catch (err) {
      reportCaptureError(err instanceof Error ? err.message : String(err));
      console.error("[sampler] tick failed:", err);
    }
  };

  await tick();
  timer = setInterval(tick, config.sampleIntervalSec * 1000);
  console.log(`[sampler] running every ${config.sampleIntervalSec}s`);

  return () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
}
