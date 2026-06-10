import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[32px] w-full rounded-md border border-ink-600 bg-ink-900 px-2.5 py-1.5 text-sm text-ink-100 transition-[color,box-shadow] outline-none",
        "placeholder:text-ink-400 selection:bg-brand-600 selection:text-white field-sizing-content",
        "focus-visible:border-brand-500 focus-visible:ring-1 focus-visible:ring-brand-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
