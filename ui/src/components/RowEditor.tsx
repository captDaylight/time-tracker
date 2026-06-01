import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { PencilIcon } from "@heroicons/react/16/solid";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { api, type Project, type Shot, type UIBlock } from "../api";
import { Button } from "./bits";

interface Props {
  block: UIBlock;
  projects: Project[];
  onSave: (payload: { category: "work" | "break"; project: string; task: string; detail: string }) => void;
  onClear: () => void;
  onCancel: () => void;
  onOpenShot: (shots: Shot[], index: number) => void;
}

type Field = "task" | "detail";

/**
 * Expanded (accordion) row. Opening a row is read-only — it just reveals the
 * current values and the screenshots. Clicking a cell turns that one cell into an
 * input (project is a dropdown of configured projects). A Save bar appears only
 * once something actually changes; clicking outside closes the row when clean.
 */
export function RowEditor({ block, projects, onSave, onClear, onCancel, onOpenShot }: Props) {
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
  const [editingProject, setEditingProject] = useState(false);
  const [shots, setShots] = useState<Shot[] | null>(null);

  const dirty =
    cat !== orig.cat ||
    project.trim() !== orig.project.trim() ||
    task.trim() !== orig.task.trim() ||
    detail.trim() !== orig.detail.trim();
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

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

  // Click outside closes the row, but only when there are no unsaved changes.
  // Ignore clicks inside any open popup/dialog (lightbox, listbox options).
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(`[data-row-group="${block.id}"]`)) return;
      if (t.closest('[role="dialog"]') || t.closest('[role="listbox"]')) return;
      if (dirtyRef.current) return;
      onCancel();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [block.id, onCancel]);

  const save = () =>
    onSave({ category: cat, project: cat === "break" ? "" : project.trim(), task: task.trim(), detail: detail.trim() });

  const onKey = (e: React.KeyboardEvent, allowNewline = false) => {
    if (e.key === "Enter" && !(allowNewline && e.shiftKey)) {
      e.preventDefault();
      if (dirty) save();
    }
    if (e.key === "Escape") onCancel();
  };

  const colorOf = (name: string) => projects.find((p) => p.name === name)?.color || "#6b7280";

  const inputCls =
    "w-full rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-sm text-ink-100 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  // Project cell: a dropdown of configured projects (with color dots).
  const projectCell = () => {
    if (cat === "break") return <span className="text-sm text-ink-500 italic">Break / away</span>;
    if (!editingProject) {
      const empty = !project;
      return (
        <button
          type="button"
          onClick={() => setEditingProject(true)}
          className={clsx(
            "group/cell -mx-1 flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-sm hover:bg-ink-700/60",
            empty ? "text-ink-500 italic" : "text-ink-100"
          )}
          title="Click to choose project"
        >
          {!empty && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colorOf(project) }} />}
          <span className="truncate">{project || "Choose project"}</span>
          <PencilIcon className="size-3 shrink-0 text-ink-500 opacity-0 transition group-hover/cell:opacity-100" />
        </button>
      );
    }
    return (
      <Listbox
        value={project}
        onChange={(v) => {
          setProject(v);
          setEditingProject(false);
        }}
      >
        <div className="relative">
          <ListboxButton className="flex w-full items-center justify-between gap-1 rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-sm text-ink-100 focus:border-brand-500 focus:outline-none">
            <span className="flex items-center gap-1.5 truncate">
              {project && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colorOf(project) }} />}
              <span className="truncate">{project || "Choose project"}</span>
            </span>
            <ChevronUpDownIcon className="size-4 shrink-0 text-ink-400" />
          </ListboxButton>
          <ListboxOptions
            anchor="bottom start"
            className="z-50 mt-1 max-h-60 w-[var(--button-width)] min-w-44 overflow-auto rounded-xl border border-ink-700 bg-ink-850 p-1 shadow-2xl focus:outline-none [--anchor-gap:4px]"
          >
            {projects.length === 0 && <div className="px-3 py-2 text-xs text-ink-400">No projects yet — add some in Projects.</div>}
            {projects.map((p) => (
              <ListboxOption
                key={p.id}
                value={p.name}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink-200 data-[focus]:bg-ink-700 data-[focus]:text-ink-100"
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color || "#6b7280" }} />
                <span className="flex-1 truncate">{p.name}</span>
                {p.name === project && <CheckIcon className="size-4 text-brand-500" />}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
    );
  };

  // Task/detail cells: plain text until clicked, then an input.
  const editableText = (field: Field, value: string, placeholder: string) => {
    if (active[field]) {
      const set = field === "task" ? setTask : setDetail;
      return field === "detail" ? (
        <textarea
          autoFocus
          rows={1}
          value={value}
          placeholder={placeholder}
          onChange={(e) => set(e.target.value)}
          onKeyDown={(e) => onKey(e, true)}
          className={clsx(inputCls, "min-h-[32px] resize-y")}
        />
      ) : (
        <input
          autoFocus
          value={value}
          placeholder={placeholder}
          onChange={(e) => set(e.target.value)}
          onKeyDown={(e) => onKey(e)}
          className={inputCls}
        />
      );
    }
    const empty = !value;
    return (
      <button
        type="button"
        onClick={() => setActive((a) => ({ ...a, [field]: true }))}
        className={clsx(
          "group/cell -mx-1 flex w-full items-center gap-1 rounded-md px-1 py-1 text-left text-sm hover:bg-ink-700/60",
          empty ? "text-ink-500 italic" : "text-ink-100"
        )}
        title="Click to edit"
      >
        <span className="truncate">{value || placeholder}</span>
        <PencilIcon className="size-3 shrink-0 text-ink-500 opacity-0 transition group-hover/cell:opacity-100" />
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
        <td className="px-3 py-2 text-right align-top text-sm tabular-nums text-ink-300">{Math.round(block.durationMin)}</td>
      </tr>

      <tr data-row-group={block.id} className="bg-ink-800/70">
        <td colSpan={5} className="border-b border-ink-700 px-3 pb-4 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] uppercase tracking-wide text-ink-400">Type</span>
            <div className="inline-flex rounded-lg border border-ink-700 p-0.5">
              <button
                onClick={() => setCat("work")}
                className={clsx("rounded-md px-3 py-1 text-xs font-medium transition", cat === "work" ? "bg-brand-600 text-white" : "text-ink-300 hover:text-ink-100")}
              >
                Worked time
              </button>
              <button
                onClick={() => setCat("break")}
                className={clsx("rounded-md px-3 py-1 text-xs font-medium transition", cat === "break" ? "bg-violet-500 text-white" : "text-ink-300 hover:text-ink-100")}
              >
                Break / away
              </button>
            </div>
            <div className="flex-1" />
            {block.edited && !dirty && (
              <Button variant="ghost" onClick={onClear}>
                Clear edit
              </Button>
            )}
            <Button variant="ghost" onClick={onCancel}>
              Close
            </Button>
          </div>

          <div className="mt-3 text-[11px] uppercase tracking-wide text-ink-400">Screenshots from this time</div>
          <div className="mt-2 flex gap-2.5 overflow-x-auto pb-1">
            {shots === null && <div className="text-sm text-ink-400">Loading…</div>}
            {shots !== null && shots.length === 0 && <div className="text-sm text-ink-400">No screenshots captured during this block.</div>}
            {shots?.map((s, idx) => (
              <button key={s.file} onClick={() => onOpenShot(shots, idx)} className="group shrink-0 focus:outline-none">
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

          {dirty && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-brand-600/40 bg-brand-600/10 px-3 py-2">
              <span className="text-sm text-ink-100">You have unsaved changes.</span>
              <div className="flex-1" />
              <Button variant="secondary" onClick={onCancel}>
                Discard
              </Button>
              <Button variant="primary" onClick={save}>
                Save
              </Button>
            </div>
          )}
        </td>
      </tr>
    </>
  );
}
