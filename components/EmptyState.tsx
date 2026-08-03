import type { ReactNode } from "react";
import { PackageOpen, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  illustrationId?: string;
  icon?: LucideIcon | null;
  variant?: "card" | "dashed";
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  illustrationId,
  icon: Icon = PackageOpen,
  variant = "card",
  action,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card text-center",
        variant === "dashed"
          ? "min-h-[160px] border border-dashed border-border bg-transparent p-6"
          : "min-h-[220px] bg-card p-8 shadow-sm",
      )}
    >
      {illustrationId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          aria-hidden="true"
          className="mb-4 size-20 rounded-inset bg-secondary object-cover p-1"
          loading="lazy"
          src={`/item-art/${illustrationId}.webp`}
        />
      ) : Icon ? (
        <span className="mb-4 flex size-16 shrink-0 items-center justify-center rounded-inset bg-secondary text-primary">
          <Icon className="size-7" />
        </span>
      ) : null}
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
