import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 text-ink-300 hover:text-ink-100 data-[state=on]:bg-ink-700 data-[state=on]:text-ink-100",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-ink-700 bg-transparent",
      },
      size: {
        default: "h-7 px-3",
        sm: "h-6 px-2",
        lg: "h-8 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export { toggleVariants };
export type ToggleVariants = VariantProps<typeof toggleVariants>;
