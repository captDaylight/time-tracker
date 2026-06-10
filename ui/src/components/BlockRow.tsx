import { cn } from "@/lib/utils";
import type { UIBlock } from "@/api";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProjectDot } from "@/components/ProjectDot";

/** A single (collapsed, read-only) activity row in the day table. */
export function BlockRow({
  block: b,
  color,
  onClick,
}: {
  block: UIBlock;
  color?: string;
  onClick: () => void;
}) {
  const toneText =
    b.type === "away" ? "text-warn-500 italic" : b.type === "break" ? "text-ink-300" : "text-ink-100";

  let projectCell: React.ReactNode;
  if (b.type === "away") projectCell = <>— away —<Badge variant="warn">fill in</Badge></>;
  else if (b.type === "break") projectCell = b.project || "Break / away";
  else
    projectCell = (
      <>
        {b.project}
        {b.confidence === "low" && !b.edited && <Badge variant="warn">?</Badge>}
      </>
    );

  return (
    <TableRow onClick={onClick} className="cursor-pointer hover:bg-ink-800/50">
      <TableCell className="whitespace-nowrap text-sm tabular-nums text-ink-400">
        {b.startLabel}–{b.endLabel}
      </TableCell>
      <TableCell className={cn("text-sm", toneText)}>
        <span className="inline-flex items-center gap-1.5">
          <ProjectDot
            color={b.type === "away" ? "#3a3f4b" : color}
            striped={b.type === "break"}
          />
          {projectCell}
        </span>
      </TableCell>
      <TableCell className={cn("text-sm", toneText)}>{b.task}</TableCell>
      <TableCell className="max-w-xs truncate text-sm text-ink-400" title={b.notes || b.detail}>
        {b.notes || b.detail}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right text-sm tabular-nums text-ink-300">
        {Math.round(b.durationMin)}
      </TableCell>
    </TableRow>
  );
}
