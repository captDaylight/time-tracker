import { Card } from "@/components/ui/card";
import { ProjectDot } from "@/components/ProjectDot";
import { cn } from "@/lib/utils";

type Tone = "default" | "warn" | "violet" | "muted" | "striped";

const DOT_TONE: Record<Exclude<Tone, "striped">, string> = {
  default: "bg-brand-500",
  warn: "bg-warn-500",
  violet: "bg-violet-500",
  muted: "bg-ink-400",
};

/** Compact metric pill (Worked / Away / Break) shown in the day header. */
export function StatCard({
  value,
  label,
  tone = "default",
}: {
  value: string;
  label: string;
  tone?: Tone;
}) {
  return (
    <Card className="flex-row items-center gap-2.5 rounded-xl border-ink-700/70 bg-ink-850 px-3.5 py-2">
      {tone === "striped" ? (
        <ProjectDot striped />
      ) : (
        <span className={cn("size-2 shrink-0 rounded-full", DOT_TONE[tone])} />
      )}
      <div className="leading-tight">
        <div className="text-base font-semibold tabular-nums text-ink-100">{value}</div>
        <div className="text-[11px] uppercase tracking-wide text-ink-400">{label}</div>
      </div>
    </Card>
  );
}
