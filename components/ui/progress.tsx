import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value: number;
};

export function Progress({ className, value, ...props }: ProgressProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-secondary/80", className)}
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(348_100%_76%))] transition-all"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
