import clsx from "clsx";
import type { ReactNode } from "react";

export function StatCard({ value, label, tone = "default" }: { value: string; label: string; tone?: "default" | "warn" | "violet" | "muted" }) {
  const dot = {
    default: "bg-brand-500",
    warn: "bg-warn-500",
    violet: "bg-violet-500",
    muted: "bg-ink-400",
  }[tone];
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-ink-700/70 bg-ink-850 px-3.5 py-2">
      <span className={clsx("size-2 rounded-full", dot)} />
      <div className="leading-tight">
        <div className="text-base font-semibold tabular-nums text-ink-100">{value}</div>
        <div className="text-[11px] uppercase tracking-wide text-ink-400">{label}</div>
      </div>
    </div>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-850 px-3 py-1 text-xs text-ink-100">
      {children}
    </span>
  );
}

export function Badge({ tone, children }: { tone: "warn" | "ok" | "muted"; children: ReactNode }) {
  const cls = {
    warn: "bg-warn-500/15 text-warn-500 ring-warn-500/30",
    ok: "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30",
    muted: "bg-ink-700 text-ink-300 ring-ink-600",
  }[tone];
  return (
    <span className={clsx("ml-1.5 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset", cls)}>
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  className,
  type = "button",
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  type?: "button" | "submit";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: "bg-brand-600 text-white hover:bg-brand-500",
    secondary: "border border-ink-700 bg-ink-800 text-ink-100 hover:bg-ink-700",
    ghost: "text-ink-300 hover:bg-ink-800 hover:text-ink-100",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      className={clsx(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        styles,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
