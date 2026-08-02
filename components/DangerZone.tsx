import type { ReactNode } from "react";

type DangerZoneProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function DangerZone({ title, description, children }: DangerZoneProps) {
  return (
    <section className="grid gap-3 rounded-card border border-destructive/25 bg-destructive/[0.02] p-4 sm:p-5">
      <div className="grid gap-1">
        <h2 className="text-sm font-semibold text-destructive">{title}</h2>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
