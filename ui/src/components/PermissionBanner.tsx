import { useState } from "react";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { Button } from "./bits";

/**
 * Shown when the sampler can't read window info (macOS permissions not granted),
 * so the user understands why their active work is being logged as "away".
 * Harmless on Windows, where capture always works and this never appears.
 */
export function PermissionBanner({ onDismiss }: { onDismiss: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  const open = async (which: "accessibility" | "screen") => {
    setBusy(which);
    try {
      await fetch("/api/open-settings", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: which,
      });
    } catch {
      /* ignore — button is best-effort */
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-3 flex items-start gap-3 rounded-xl border border-warn-500/40 bg-warn-500/10 px-4 py-3">
      <ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0 text-warn-500" />
      <div className="flex-1">
        <div className="text-sm font-medium text-ink-100">TimeTracker can't see your windows</div>
        <p className="mt-0.5 text-sm text-ink-300">
          Your active work is being logged as <span className="italic">away</span> because macOS hasn't granted
          window-tracking permission. Grant both, then restart the app.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => open("accessibility")}>
            {busy === "accessibility" ? "Opening…" : "Open Accessibility settings"}
          </Button>
          <Button variant="secondary" onClick={() => open("screen")}>
            {busy === "screen" ? "Opening…" : "Open Screen Recording settings"}
          </Button>
        </div>
      </div>
      <button onClick={onDismiss} className="rounded-md p-1 text-ink-400 transition hover:bg-ink-700 hover:text-ink-100" aria-label="Dismiss">
        <XMarkIcon className="size-5" />
      </button>
    </div>
  );
}
