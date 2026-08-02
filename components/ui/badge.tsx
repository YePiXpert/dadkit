import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        muted: "bg-muted text-muted-foreground",
        secondary: "bg-secondary text-primary",
        outline: "border border-border/70 bg-card/95 text-muted-foreground",
        primaryOutline: "border border-primary/20 bg-card/95 text-primary",
        primarySolid:
          "border border-primary bg-primary text-primary-foreground",
        warning: "bg-warning text-warning-foreground",
        destructive: "bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}

export { Badge, badgeVariants };
