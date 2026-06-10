import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-8 w-full min-w-0 rounded-md border border-ink-600 bg-ink-900 px-2.5 py-1 text-sm text-ink-100 transition-[color,box-shadow] outline-none",
        "placeholder:text-ink-400 selection:bg-brand-600 selection:text-white",
        "focus-visible:border-brand-500 focus-visible:ring-1 focus-visible:ring-brand-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
