import { cn } from "@/lib/utils";
import { STRIPE_DOT } from "@/lib/stripes";

interface Props {
  color?: string;
  /** Render the diagonal stripe fill (break / away) instead of a solid color. */
  striped?: boolean;
  className?: string;
}

/** Small round legend dot used across the table, chips, timeline and stat cards. */
export function ProjectDot({ color, striped, className }: Props) {
  return (
    <span
      className={cn("size-2 shrink-0 rounded-full", className)}
      style={striped ? { backgroundImage: STRIPE_DOT } : { backgroundColor: color ?? "#6b7280" }}
    />
  );
}
