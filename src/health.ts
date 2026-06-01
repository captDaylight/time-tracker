/**
 * Tracks whether the sampler is actually capturing window info. On macOS, missing
 * Accessibility/Screen-Recording permission makes get-windows throw or return empty,
 * so active work looks like "away". The UI polls this to show a permission banner.
 * (On Windows titles are always available, so status stays "ok".)
 */
export type CaptureStatus = "ok" | "no-permission" | "starting";

interface Health {
  status: CaptureStatus;
  /** Last error message from a failed capture, if any. */
  lastError: string | null;
  /** Epoch ms of the last successful capture that included an app/title. */
  lastGoodTs: number | null;
  platform: NodeJS.Platform;
}

const state: Health = {
  status: "starting",
  lastError: null,
  lastGoodTs: null,
  platform: process.platform,
};

/** A capture succeeded and yielded a usable app/title. */
export function reportCaptureOk(ts: number): void {
  state.status = "ok";
  state.lastError = null;
  state.lastGoodTs = ts;
}

/** A capture failed (threw). On macOS this is almost always missing permission. */
export function reportCaptureError(message: string): void {
  state.lastError = message;
  // Only downgrade to no-permission if we've never had a good capture, so a
  // transient blip after working fine doesn't flip the banner on.
  if (state.lastGoodTs === null) state.status = "no-permission";
}

/** A capture returned but had no app/title (empty window info). */
export function reportCaptureEmpty(): void {
  if (state.lastGoodTs === null && process.platform === "darwin") {
    state.status = "no-permission";
  }
}

export function getHealth(): Health {
  return { ...state };
}
