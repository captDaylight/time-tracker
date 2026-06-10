import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { api, type Project, type Shot, type UIBlock } from "@/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectDot } from "@/components/ProjectDot";

interface Props {
  block: UIBlock;
  projects: Project[];
  onSave: (payload: { category: "work" | "break"; project: string; task: string; detail: string }) => void;
  onClear: () => void;
  onClose: () => void;
  onOpenShot: (shots: Shot[], index: number) => void;
}

type Field = "task" | "detail";

/**
 * Expanded (accordion) row. Opening a row is read-only — it reveals the current
 * values and screenshots. Clicking a cell turns that one cell into an input.
 * Changes auto-save on blur (text fields) or on change (project / type), so there
 * is no Save/Cancel step. Clicking outside simply closes the row.
 */
export function RowEditor({ block, projects, onSave, onClear, onClose, onOpenShot }: Props) {
  const untracked = block.type === "away";
  const orig = useMemo(
    () => ({
      cat: (block.type === "break" ? "break" : "work") as "work" | "break",
      project: untracked ? "" : block.project || "",
      task: block.task || "",
      detail: block.notes || "",
    }),
    [block, untracked]
  );

  const [cat, setCat] = useState<"work" | "break">(orig.cat);
  const [project, setProject] = useState(orig.project);
  const [task, setTask] = useState(orig.task);
  const [detail, setDetail] = useState(orig.detail);
  const [active, setActive] = useState<Partial<Record<Field, boolean>>>({});
  const [shots, setShots] = useState<Shot[] | null>(null);

  useEffect(() => {
    let live = true;
    api
      .shots(block.start, block.end)
      .then((r) => live && setShots(r.shots))
      .catch(() => live && setShots([]));
    return () => {
      live = false;
    };
  }, [block.start, block.end]);

  // Persist the current values, with optional overrides for the field just changed
  // (state updates are async, so the changed value is passed in explicitly). Only
  // writes when something actually differs from the original, to avoid no-op saves.
  const commit = (override?: Partial<{ cat: "work" | "break"; project: string; task: string; detail: string }>) => {
    const next = { cat, project, task, detail, ...override };
    const changed =
      next.cat !== orig.cat ||
      next.project.trim() !== orig.project.trim() ||
      next.task.trim() !== orig.task.trim() ||
      next.detail.trim() !== orig.detail.trim();
    if (!changed) return;
    onSave({
      category: next.cat,
      project: next.cat === "break" ? "" : next.project.trim(),
      task: next.task.trim(),
      detail: next.detail.trim(),
    });
  };

  // Click outside the row closes it. Changes have already auto-saved on blur.
  // Ignore clicks inside any open popup/dialog (lightbox, Radix popper content).
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(`[data-row-group="${block.id}"]`)) return;
      if (t.closest('[role="dialog"]') || t.closest("[data-radix-popper-content-wrapper]")) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [block.id, onClose]);

  const setCategory = (c: "work" | "break") => {
    setCat(c);
    commit({ cat: c });
  };

  // Enter commits the field (blur saves); Escape closes the row.
  const onKey = (e: React.KeyboardEvent, allowNewline = false) => {
    if (e.key === "Enter" && !(allowNewline && e.shiftKey)) {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
    if (e.key === "Escape") onClose();
  };

  const colorOf = (name: string) => projects.find((p) => p.name === name)?.color || "#6b7280";

  // Project cell: a select of configured projects (with color dots). Saves on select.
  const projectCell = () => {
    if (cat === "break") return <span className="text-sm italic text-ink-500">Break / away</span>;
    return (
      <Select
        value={project || undefined}
        onValueChange={(v) => {
          setProject(v);
          commit({ project: v });
        }}
      >
        <SelectTrigger className="h-auto border-ink-600 bg-ink-900 px-2 py-1">
          <SelectValue placeholder="Choose project">
            {project && <ProjectDot color={colorOf(project)} />}
            <span className="truncate">{project || "Choose project"}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="min-w-44">
          {projects.length === 0 && (
            <div className="px-3 py-2 text-xs text-ink-400">No projects yet — add some in Projects.</div>
          )}
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.name}>
              <ProjectDot color={p.color || "#6b7280"} className="size-2.5" />
              <span className="truncate">{p.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  // Task/detail cells: plain text until clicked, then an input that saves on blur.
  const editableText = (field: Field, value: string, placeholder: string) => {
    if (active[field]) {
      const set = field === "task" ? setTask : setDetail;
      const onBlur = () => {
        setActive((a) => ({ ...a, [field]: false }));
        commit({ [field]: value } as Partial<{ task: string; detail: string }>);
      };
      return field === "detail" ? (
        <Textarea
          autoFocus
          rows={1}
          value={value}
          placeholder={placeholder}
          onChange={(e) => set(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => onKey(e, true)}
          className="resize-y px-2 py-1"
        />
      ) : (
        <Input
          autoFocus
          value={value}
          placeholder={placeholder}
          onChange={(e) => set(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => onKey(e)}
          className="px-2 py-1"
        />
      );
    }
    const empty = !value;
    return (
      <button
        type="button"
        onClick={() => setActive((a) => ({ ...a, [field]: true }))}
        className={cn(
          "group/cell -mx-1 flex w-full items-center gap-1 rounded-md px-1 py-1 text-left text-sm hover:bg-ink-700/60",
          empty ? "text-ink-500 italic" : "text-ink-100"
        )}
        title="Click to edit"
      >
        <span className="truncate">{value || placeholder}</span>
        <Pencil className="size-3 shrink-0 text-ink-500 opacity-0 transition group-hover/cell:opacity-100" />
      </button>
    );
  };

  return (
    <>
      <tr data-row-group={block.id} className="bg-ink-800/70">
        <td className="px-3 py-2 align-top text-sm tabular-nums text-ink-400">
          {block.startLabel}–{block.endLabel}
        </td>
        <td className="px-2 py-2 align-top">{projectCell()}</td>
        <td className="px-2 py-2 align-top">{editableText("task", task, "Add task")}</td>
        <td className="px-2 py-2 align-top">{editableText("detail", detail, "Add details")}</td>
        <td className="px-3 py-2 text-right align-top text-sm tabular-nums text-ink-300">
          {Math.round(block.durationMin)}
        </td>
      </tr>

      <tr data-row-group={block.id} className="bg-ink-800/70">
        <td colSpan={5} className="border-b border-ink-700 px-3 pt-1 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] uppercase tracking-wide text-ink-400">Type</span>
            <ToggleGroup
              type="single"
              value={cat}
              onValueChange={(v) => v && setCategory(v as "work" | "break")}
            >
              <ToggleGroupItem
                value="work"
                className="data-[state=on]:bg-brand-600 data-[state=on]:text-white"
              >
                Worked time
              </ToggleGroupItem>
              <ToggleGroupItem
                value="break"
                className="data-[state=on]:bg-violet-500 data-[state=on]:text-white"
              >
                Break / away
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="flex-1" />
            {block.edited && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                Clear edit
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>

          <div className="mt-3 text-[11px] uppercase tracking-wide text-ink-400">Screenshots from this time</div>
          <div className="mt-2 flex gap-2.5 overflow-x-auto pb-1">
            {shots === null && <div className="text-sm text-ink-400">Loading…</div>}
            {shots !== null && shots.length === 0 && (
              <div className="text-sm text-ink-400">No screenshots captured during this block.</div>
            )}
            {shots?.map((s, idx) => (
              <button key={s.file} onClick={() => onOpenShot(shots, idx)} className="group shrink-0 outline-none">
                <img
                  src={api.shotUrl(s.file)}
                  loading="lazy"
                  alt={`Screenshot at ${s.label}`}
                  className="h-24 w-auto rounded-lg border border-ink-700 transition group-hover:border-brand-500 group-focus-visible:border-brand-500"
                />
                <div className="mt-1 text-center text-[10px] text-ink-400">
                  {s.label}
                  {s.display ? ` · #${s.display + 1}` : ""}
                </div>
              </button>
            ))}
          </div>
        </td>
      </tr>
    </>
  );
}
