import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowDownTrayIcon, ClockIcon, FolderIcon } from "@heroicons/react/20/solid";
import { api, fmtH, type DayPayload, type Shot, type UIBlock } from "./api";
import { DayPicker } from "./components/DayPicker";
import { DayTimeline } from "./components/DayTimeline";
import { RowEditor } from "./components/RowEditor";
import { Lightbox } from "./components/Lightbox";
import { PermissionBanner } from "./components/PermissionBanner";
import { ProjectsManager } from "./components/ProjectsManager";
import { StatCard, Chip, Badge, Button, STRIPE_BG } from "./components/bits";
import { buildColorMap } from "./colors";

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
    return (
      <ProjectsManager
        onBack={() => setView("day")}
        onSaved={() => load(current)}
      />
    );
  }

  const summary = data?.summary;
  const isToday = current === today;
  const colors = buildColorMap(data?.projects ?? []);
  // Table shows most-recent first; the timeline stays chronological (left→right = morning→evening).
  const chronological = data?.blocks ?? [];
  const rows = [...chronological].reverse();

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col">
      {/* Header (fixed; only the table area below scrolls) */}
      <header className="z-20 shrink-0 border-b border-ink-800 bg-ink-950/90 px-6 pb-4 pt-5 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-brand-600/15 text-brand-500 ring-1 ring-inset ring-brand-600/30">
              <ClockIcon className="size-5" />
            </span>
            <h1 className="text-[17px] font-semibold tracking-tight">TimeTracker</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => (window.location.href = api.exportUrl(current))}
              className="group relative flex items-center justify-center rounded-lg border border-ink-700 bg-ink-800 p-2 text-ink-200 transition hover:bg-ink-700"
              aria-label="Download CSV"
            >
              <ArrowDownTrayIcon className="size-4" />
              <span className="pointer-events-none absolute top-full right-0 mt-1.5 whitespace-nowrap rounded-md bg-ink-700 px-2 py-1 text-xs text-ink-100 opacity-0 shadow-lg transition group-hover:opacity-100">
                Download CSV for this day
              </span>
            </button>
            <button
              onClick={() => setView("projects")}
              className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-800 px-3 py-1.5 text-sm text-ink-200 transition hover:bg-ink-700"
            >
              <FolderIcon className="size-4" /> Projects
            </button>
            <DayPicker days={days} current={current} today={today} onSelect={select} />
          </div>
        </div>

        {needsPerm && !permDismissed && <PermissionBanner onDismiss={() => setPermDismissed(true)} />}

        {/* Color-coded day histogram (chronological left→right) */}
        <DayTimeline blocks={chronological} colors={colors} activeId={editingId} onSelect={(id) => setEditingId(id)} />

        {/* Stats */}
        {summary && (
          <div className="mt-3 flex flex-wrap gap-2.5">
            <StatCard value={fmtH(summary.workMin)} label="Worked" tone="default" />
            <StatCard value={fmtH(summary.awayMin)} label="Away" tone="warn" />
            <StatCard value={fmtH(summary.breakMin)} label="Break" tone="striped" />
          </div>
        )}

        {/* Project chips */}
        {summary && summary.byProject.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.byProject.map((p) => (
              <Chip key={p.project}>
                <span className="size-2 rounded-full" style={{ backgroundColor: colors.get(p.project) ?? "#6b7280" }} />
                <span className="font-semibold">{p.project}</span>
                <span className="text-ink-400">{fmtH(p.min)}</span>
              </Chip>
            ))}
          </div>
        )}

        <div className="mt-4 text-xs text-ink-400">Click a row to view it; click a cell to edit. Away time can be filled in.</div>
      </header>

      {/* Table — this region scrolls; the header row sticks to the top of it. */}
      <main className="flex-1 overflow-y-auto px-6 py-4">
        <div className="rounded-2xl border border-ink-800">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-ink-900 text-left text-[11px] uppercase tracking-wide text-ink-400 shadow-[0_1px_0_0_var(--color-ink-800)]">
                <th className="rounded-tl-2xl px-3 py-2.5 font-medium">Time</th>
                <th className="px-3 py-2.5 font-medium">Project</th>
                <th className="px-3 py-2.5 font-medium">Task</th>
                <th className="px-3 py-2.5 font-medium">Detail</th>
                <th className="rounded-tr-2xl px-3 py-2.5 text-right font-medium">Min</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) =>
                b.id === editingId ? (
                  <RowEditor
                    key={b.id}
                    block={b}
                    projects={data!.projects}
                    onSave={(p) => saveEdit(b.id, p)}
                    onClear={() => clearEdit(b.id)}
                    onClose={() => setEditingId(null)}
                    onOpenShot={(shots, index) => setLightbox({ shots, index })}
                  />
                ) : (
                  <BlockRow key={b.id} block={b} color={colors.get(b.project)} onClick={() => setEditingId(b.id)} />
                )
              )}
            </tbody>
          </table>
          {data && data.blocks.length === 0 && (
            <div className="py-14 text-center text-sm text-ink-400">No activity recorded for this day.</div>
          )}
        </div>
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
  );
}

function BlockRow({ block: b, color, onClick }: { block: UIBlock; color?: string; onClick: () => void }) {
  const toneText =
    b.type === "away" ? "text-warn-500 italic" : b.type === "break" ? "text-ink-300" : "text-ink-100";

  const isBreak = b.type === "break";
  const dotColor = b.type === "away" ? "#3a3f4b" : color ?? "#6b7280";
  const dotStyle: React.CSSProperties = isBreak ? { backgroundImage: STRIPE_BG } : { backgroundColor: dotColor };

  let projectCell: React.ReactNode;
  if (b.type === "away") projectCell = <>— away —<Badge tone="warn">fill in</Badge></>;
  else if (b.type === "break") projectCell = b.project || "Break / away";
  else
    projectCell = (
      <>
        {b.project}
        {b.confidence === "low" && !b.edited && <Badge tone="warn">?</Badge>}
      </>
    );

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-t border-ink-800 transition hover:bg-ink-800/50"
    >
      <td className="whitespace-nowrap px-3 py-2.5 text-sm tabular-nums text-ink-400">
        {b.startLabel}–{b.endLabel}
      </td>
      <td className={clsx("px-3 py-2.5 text-sm", toneText)}>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full" style={dotStyle} />
          {projectCell}
        </span>
      </td>
      <td className={clsx("px-3 py-2.5 text-sm", toneText)}>{b.task}</td>
      <td className="max-w-xs truncate px-3 py-2.5 text-sm text-ink-400" title={b.notes || b.detail}>
        {b.notes || b.detail}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right text-sm tabular-nums text-ink-300">{Math.round(b.durationMin)}</td>
    </tr>
  );
}
