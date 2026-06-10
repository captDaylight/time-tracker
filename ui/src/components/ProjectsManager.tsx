import { useEffect, useState } from "react";
import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, PALETTE, type Project } from "@/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  onBack: () => void;
  onSaved: (projects: Project[]) => void;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const blankProject = (): Project => ({
  id: "",
  name: "",
  externalId: "",
  folders: [],
  titleKeywords: [],
  color: PALETTE[0],
});

/**
 * Full-page projects editor (toggled from the day view). Create / edit / delete
 * projects: each has a name, internal id, external id, an array of root folders
 * (auto-tag source), and a color from a fixed palette.
 */
export function ProjectsManager({ onBack, onSaved }: Props) {
  const [items, setItems] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .projects()
      .then((r) => setItems(r.projects.length ? r.projects : [blankProject()]))
      .catch(() => setItems([blankProject()]));
  }, []);

  const update = (i: number, patch: Partial<Project>) =>
    setItems((list) => list.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const remove = (i: number) => setItems((list) => list.filter((_, idx) => idx !== i));
  const add = () => setItems((list) => [...list, blankProject()]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const normalized = items
        .filter((p) => p.name.trim())
        .map((p) => ({ ...p, id: p.id.trim() || slugify(p.name) }));
      const r = await api.saveProjects(normalized);
      setItems(r.projects.length ? r.projects : [blankProject()]);
      onSaved(r.projects);
      setSavedAt(Date.now());
    } catch {
      setError("Couldn't save projects. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      {/* Page header */}
      <header className="z-20 shrink-0 border-b border-ink-800 bg-ink-950/90 px-6 pt-5 pb-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft /> Back
            </Button>
            <h1 className="text-[17px] font-semibold tracking-tight">Projects</h1>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && !saving && <span className="text-xs text-emerald-500">Saved</span>}
            {error && <span className="text-xs text-rose-400">{error}</span>}
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save projects"}
            </Button>
          </div>
        </div>
      </header>

      {/* Scrollable list */}
      <main className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {items.map((p, i) => (
          <Card key={i} className="gap-0 bg-ink-850 p-4">
            <div className="flex items-start gap-3">
              <span
                className="mt-7 size-4 shrink-0 rounded-full ring-2 ring-ink-900"
                style={{ backgroundColor: p.color || "#6b7280" }}
              />
              <div className="grid flex-1 grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1">Project name</Label>
                  <Input
                    value={p.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    placeholder="e.g. Strong Residence"
                  />
                </div>
                <div>
                  <Label className="mb-1">External ID (Monograph)</Label>
                  <Input
                    value={p.externalId ?? ""}
                    onChange={(e) => update(i, { externalId: e.target.value })}
                    placeholder="optional"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="mb-1">
                    Root folders — work in these folders is auto-tagged to this project
                  </Label>
                  <Textarea
                    value={(p.folders ?? []).join("\n")}
                    onChange={(e) => update(i, { folders: e.target.value.split("\n") })}
                    placeholder={"Clients/Strong Residence\nProjects\\Strong Residence\nStrong Residence"}
                    rows={3}
                    className="resize-y font-mono text-xs"
                  />
                  <p className="mt-1 text-[11px] text-ink-400">
                    One folder per line. Matches Windows and Mac paths.
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="mb-1">Color</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => update(i, { color: c })}
                        className={cn(
                          "flex size-6 items-center justify-center rounded-md ring-1 ring-inset ring-black/20 transition hover:scale-110",
                          p.color === c && "ring-2 ring-white"
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      >
                        {p.color === c && <Check className="size-3.5 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
                className="mt-6 size-8 text-ink-400 hover:bg-rose-500/15 hover:text-rose-400"
                aria-label="Delete project"
                title="Delete project"
              >
                <Trash2 />
              </Button>
            </div>
          </Card>
        ))}

        <button
          onClick={add}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink-600 py-2.5 text-sm text-ink-300 transition hover:border-brand-500 hover:text-ink-100"
        >
          <Plus className="size-4" /> Add project
        </button>
      </main>
    </div>
  );
}
