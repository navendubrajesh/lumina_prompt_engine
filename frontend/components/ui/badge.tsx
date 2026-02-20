import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50",
        context:
          "border-transparent bg-blue-500/20 text-blue-400 dark:bg-blue-500/20",
        clarity:
          "border-transparent bg-violet-500/20 text-violet-400 dark:bg-violet-500/20",
        adherence:
          "border-transparent bg-amber-500/20 text-amber-400 dark:bg-amber-500/20",
        robustness:
          "border-transparent bg-emerald-500/20 text-emerald-400 dark:bg-emerald-500/20",
        efficiency:
          "border-transparent bg-cyan-500/20 text-cyan-400 dark:bg-cyan-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
