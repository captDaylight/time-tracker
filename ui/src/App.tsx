import { useCallback, useEffect, useRef, useState } from "react";
import { api, type DayPayload, type Shot } from "@/api";
import { buildColorMap } from "@/colors";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/AppHeader";
import { DayTimeline } from "@/components/DayTimeline";
import { StatsBar } from "@/components/StatsBar";
import { ProjectChips } from "@/components/ProjectChips";
import { BlockTable } from "@/components/BlockTable";
import { Lightbox } from "@/components/Lightbox";
import { PermissionBanner } from "@/components/PermissionBanner";
import { ProjectsManager } from "@/components/ProjectsManager";

const todayStr = () => new Date().toLocaleDateString("en-CA");

export default function App() {
  const [days, setDays] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [data, setData] = useState<DayPayload | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ shots: Shot[]; index: number } | null>(null);
  const [today, setToday] = useState(todayStr());
  const [needsPerm, setNeedsPerm] = useState(false);
  const [permDismissed, setPermDismissed] = useState(false);
  const [view, setView] = useState<"day" | "projects">("day");
  const editingRef = useRef(editingId);
  editingRef.current = editingId;

  const loadDays = useCallback(async () => {
    const r = await api.days();
    let list = r.days;
    const t = todayStr();
    if (!list.includes(t)) list = [t, ...list];
    setDays(list);
    setCurrent((c) => c || list[0] || t);
  }, []);

  const load = useCallback(async (date: string) => {
    const payload = await api.day(date);
    setData(payload);
  }, []);

  useEffect(() => {
    loadDays();
  }, [loadDays]);

  // Poll capture health so we can warn when macOS permissions block window tracking.
  useEffect(() => {
    const check = () =>
      api
        .health()
        .then((h) => setNeedsPerm(h.status === "no-permission"))
        .catch(() => {});
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (current) load(current);
  }, [current, load]);

  // Keep today's view continuously up to date (every 5s), but never refresh
  // out from under an in-progress edit.
  useEffect(() => {
    const id = setInterval(() => {
      setToday(todayStr());
      if (current === todayStr() && !editingRef.current) load(current);
    }, 5000);
    return () => clearInterval(id);
  }, [current, load]);

  const select = (d: string) => {
    setEditingId(null);
    setCurrent(d);
  };

  // Auto-save on blur/change: persist but keep the row open so multiple fields can
  // be edited in sequence. The row closes only on explicit Close / Escape / click-out.
  const saveEdit = async (id: string, p: { category: "work" | "break"; project: string; task: string; detail: string }) => {
    const payload = await api.edit({ date: current, id, ...p });
    setData(payload);
  };
  const clearEdit = async (id: string) => {
    const payload = await api.edit({ date: current, id, cleared: true });
    setData(payload);
    setEditingId(null);
  };

  // Projects is a separate page you toggle to.
  if (view === "projects") {
    return <ProjectsManager onBack={() => setView("day")} onSaved={() => load(current)} />;
  }

  const summary = data?.summary;
  const isToday = current === today;
  const colors = buildColorMap(data?.projects ?? []);
  // Table shows most-recent first; the timeline stays chronological (left→right = morning→evening).
  const chronological = data?.blocks ?? [];
  const rows = [...chronological].reverse();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto flex h-full max-w-5xl flex-col">
        {/* Header (fixed; only the table area below scrolls) */}
        <header className="z-20 shrink-0 border-b border-ink-800 bg-ink-950/90 px-6 pt-5 pb-4 backdrop-blur">
          <AppHeader
            days={days}
            current={current}
            today={today}
            onSelectDay={select}
            onExport={() => (window.location.href = api.exportUrl(current))}
            onOpenProjects={() => setView("projects")}
          />

          {needsPerm && !permDismissed && <PermissionBanner onDismiss={() => setPermDismissed(true)} />}

          {/* Color-coded day histogram (chronological left→right) */}
          <DayTimeline blocks={chronological} colors={colors} activeId={editingId} onSelect={(id) => setEditingId(id)} />

          {summary && <StatsBar summary={summary} />}

          {summary && <ProjectChips byProject={summary.byProject} colors={colors} />}

          <div className="mt-4 text-xs text-ink-400">
            Click a row to view it; click a cell to edit. Away time can be filled in.
          </div>
        </header>

        {/* Table — this region scrolls; the header row sticks to the top of it. */}
        <main className="flex-1 overflow-y-auto px-6 py-4">
          <BlockTable
            rows={rows}
            isEmpty={!!data && data.blocks.length === 0}
            editingId={editingId}
            projects={data?.projects ?? []}
            colors={colors}
            onSelect={(id) => setEditingId(id)}
            onSave={saveEdit}
            onClear={clearEdit}
            onClose={() => setEditingId(null)}
            onOpenShot={(shots, index) => setLightbox({ shots, index })}
          />
          {isToday && <div className="mt-3 text-xs text-ink-400">Live · updates automatically</div>}
        </main>

        {lightbox && (
          <Lightbox
            shots={lightbox.shots}
            index={lightbox.index}
            onClose={() => setLightbox(null)}
            onStep={(d) =>
              setLightbox((lb) => (lb ? { ...lb, index: (lb.index + d + lb.shots.length) % lb.shots.length } : lb))
            }
          />
        )}
      </div>
    </TooltipProvider>
  );
}
