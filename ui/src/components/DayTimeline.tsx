import { useState } from "react";
import { cn } from "@/lib/utils";
import { fmtH, type UIBlock } from "@/api";
import { blockColor } from "@/colors";
import { STRIPE_BAR } from "@/lib/stripes";

interface Props {
  blocks: UIBlock[];
  colors: Map<string, string>;
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** 12-hour label for an hour-of-day number (e.g. 9 → "9a", 13 → "1p", 0 → "12a"). */
function hourLabel(h: number): string {
  const ampm = h < 12 ? "a" : "p";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${ampm}`;
}

/**
 * A horizontal, color-coded histogram of the day on a real wall-clock axis
 * (left = first activity, right = last), so segment widths reflect actual elapsed
 * time. Discreet hour ticks beneath make it easy to scan when things happened.
 * Hover for details; click a segment to open that row in the table.
 */
export function DayTimeline({ blocks, colors, activeId, onSelect }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  if (!blocks.length) return null;

  // Drop leading "away" blocks (e.g. overnight sleep before the first activity) so
  // the axis starts at the first real work/break and isn't dominated by idle time.
  // Table still shows everything; this only reshapes the histogram.
  const firstActive = blocks.findIndex((b) => b.type !== "away");
  const shown = firstActive > 0 ? blocks.slice(firstActive) : blocks;
  if (!shown.length) return null;

  const dayStart = Math.min(...shown.map((b) => b.start));
  const dayEnd = Math.max(...shown.map((b) => b.end));
  const span = dayEnd - dayStart;
  if (span <= 0) return null;

  const pctOf = (ms: number) => ((ms - dayStart) / span) * 100;
  const labelFor = (b: UIBlock) =>
    b.type === "away" ? "Away" : b.type === "break" ? b.project || "Break" : b.project || "Unknown";

  // Hour tick marks: each whole hour boundary that falls within [dayStart, dayEnd].
  const ticks: { pct: number; hour: number }[] = [];
  const firstHour = new Date(dayStart);
  firstHour.setMinutes(0, 0, 0);
  if (firstHour.getTime() < dayStart) firstHour.setHours(firstHour.getHours() + 1);
  for (let t = firstHour.getTime(); t <= dayEnd; t += 3_600_000) {
    ticks.push({ pct: pctOf(t), hour: new Date(t).getHours() });
  }

  return (
    <div className="mt-3">
      {/* Histogram track (blocks absolutely positioned by their real time) */}
      <div className="relative h-7 w-full overflow-hidden rounded-lg bg-ink-900 ring-1 ring-inset ring-ink-700">
        {shown.map((b) => {
          const left = pctOf(b.start);
          const width = ((b.end - b.start) / span) * 100;
          const isActive = b.id === activeId;
          const isHover = b.id === hover;
          // Break renders as a gray/black diagonal stripe so it reads as "not a task";
          // everything else is a solid project/away color.
          const style: React.CSSProperties =
            b.type === "break"
              ? {
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundImage: STRIPE_BAR,
                }
              : { left: `${left}%`, width: `${width}%`, backgroundColor: blockColor(b, colors) };
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              onMouseEnter={() => setHover(b.id)}
              onMouseLeave={() => setHover((h) => (h === b.id ? null : h))}
              title={`${b.startLabel}–${b.endLabel} · ${labelFor(b)} · ${Math.round(b.durationMin)}m`}
              className={cn(
                "absolute top-0 h-full min-w-[1px] transition-[filter,opacity]",
                isActive ? "z-10 opacity-100 brightness-125" : isHover ? "brightness-110" : "opacity-90 hover:opacity-100"
              )}
              style={style}
              aria-label={`${labelFor(b)} ${Math.round(b.durationMin)} minutes`}
            />
          );
        })}
      </div>

      {/* Hour marks (discreet, beneath the track) */}
      <div className="relative mt-1 h-3">
        {ticks.map((t, i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 text-[10px] tabular-nums text-ink-500"
            style={{ left: `${t.pct}%` }}
          >
            {hourLabel(t.hour)}
          </span>
        ))}
      </div>

      {/* Hover detail line (reserves height so the layout doesn't jump) */}
      <div className="mt-0.5 h-4 text-[11px] text-ink-400">
        {hover &&
          (() => {
            const b = shown.find((x) => x.id === hover);
            return b ? (
              <span>
                <span className="tabular-nums">{b.startLabel}–{b.endLabel}</span> ·{" "}
                <span className="text-ink-200">{labelFor(b)}</span>
                {b.task ? ` · ${b.task}` : ""} · <span className="tabular-nums">{fmtH(Math.round(b.durationMin))}</span>
              </span>
            ) : null;
          })()}
      </div>
    </div>
  );
}
