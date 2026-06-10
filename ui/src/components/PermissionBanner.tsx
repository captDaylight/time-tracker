import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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
    <Alert variant="warn" className="mt-3">
      <AlertTriangle />
      <AlertTitle>TimeTracker can't see your windows</AlertTitle>
      <AlertDescription>
        <p>
          Your active work is being logged as <span className="italic">away</span> because macOS
          hasn't granted window-tracking permission. Grant both, then restart the app.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => open("accessibility")}>
            {busy === "accessibility" ? "Opening…" : "Open Accessibility settings"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => open("screen")}>
            {busy === "screen" ? "Opening…" : "Open Screen Recording settings"}
          </Button>
        </div>
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDismiss}
        className="absolute top-2.5 right-2.5 size-7 text-ink-400 hover:text-ink-100"
        aria-label="Dismiss"
      >
        <X />
      </Button>
    </Alert>
  );
}
