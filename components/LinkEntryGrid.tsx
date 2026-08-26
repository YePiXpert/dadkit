import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export type LinkEntry = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

export function LinkEntryGrid({ entries }: { entries: readonly LinkEntry[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map((entry) => {
        const Icon = entry.icon;

        return (
          <Link
            className="group flex items-center gap-3.5 rounded-card bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-col sm:items-start sm:gap-3 sm:p-5"
            href={entry.href}
            key={entry.href}
          >
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-inset ${entry.accent}`}
            >
              <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-foreground">
                {entry.title}
              </span>
              <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">
                {entry.description}
              </span>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none sm:hidden"
            />
          </Link>
        );
      })}
    </div>
  );
}