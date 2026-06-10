import type { Project, Shot, UIBlock } from "@/api";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BlockRow } from "@/components/BlockRow";
import { RowEditor } from "@/components/RowEditor";

interface Props {
  rows: UIBlock[];
  isEmpty: boolean;
  editingId: string | null;
  projects: Project[];
  colors: Map<string, string>;
  onSelect: (id: string) => void;
  onSave: (id: string, p: { category: "work" | "break"; project: string; task: string; detail: string }) => void;
  onClear: (id: string) => void;
  onClose: () => void;
  onOpenShot: (shots: Shot[], index: number) => void;
}

/** The scrollable day table — collapsed rows that expand into an inline editor. */
export function BlockTable({
  rows,
  isEmpty,
  editingId,
  projects,
  colors,
  onSelect,
  onSave,
  onClear,
  onClose,
  onOpenShot,
}: Props) {
  return (
    <div className="rounded-2xl border border-ink-800">
      <Table>
        <TableHeader>
          <TableRow className="border-t-0 bg-ink-900 shadow-[0_1px_0_0_var(--color-ink-800)] hover:bg-ink-900">
            <TableHead className="rounded-tl-2xl">Time</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Detail</TableHead>
            <TableHead className="rounded-tr-2xl text-right">Min</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((b) =>
            b.id === editingId ? (
              <RowEditor
                key={b.id}
                block={b}
                projects={projects}
                onSave={(p) => onSave(b.id, p)}
                onClear={() => onClear(b.id)}
                onClose={onClose}
                onOpenShot={onOpenShot}
              />
            ) : (
              <BlockRow key={b.id} block={b} color={colors.get(b.project)} onClick={() => onSelect(b.id)} />
            )
          )}
        </TableBody>
      </Table>
      {isEmpty && (
        <div className="py-14 text-center text-sm text-ink-400">No activity recorded for this day.</div>
      )}
    </div>
  );
}
