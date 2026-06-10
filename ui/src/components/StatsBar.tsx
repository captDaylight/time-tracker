import { fmtH, type DaySummary } from "@/api";
import { StatCard } from "@/components/StatCard";

/** Worked / Away / Break summary pills for the selected day. */
export function StatsBar({ summary }: { summary: DaySummary }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2.5">
      <StatCard value={fmtH(summary.workMin)} label="Worked" tone="default" />
      <StatCard value={fmtH(summary.awayMin)} label="Away" tone="warn" />
      <StatCard value={fmtH(summary.breakMin)} label="Break" tone="striped" />
    </div>
  );
}
