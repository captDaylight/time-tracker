import { fmtH, type DaySummary } from "@/api";
import { ProjectDot } from "@/components/ProjectDot";

/** Per-project time legend shown beneath the day stats. */
export function ProjectChips({
  byProject,
  colors,
}: {
  byProject: DaySummary["byProject"];
  colors: Map<string, string>;
}) {
  if (!byProject.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {byProject.map((p) => (
        <span
          key={p.project}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-850 px-3 py-1 text-xs text-ink-100"
        >
          <ProjectDot color={colors.get(p.project) ?? "#6b7280"} />
          <span className="font-semibold">{p.project}</span>
          <span className="text-ink-400">{fmtH(p.min)}</span>
        </span>
      ))}
    </div>
  );
}
