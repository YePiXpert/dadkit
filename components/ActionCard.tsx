import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ActionCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: "primary" | "amber" | "coral";
};

export function ActionCard({
  description,
  href,
  icon: Icon,
  title,
  tone = "primary",
}: ActionCardProps) {
  return (
    <Link
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-soft transition-transform active:scale-[0.99]",
        tone === "primary" && "hover:border-primary",
        tone === "amber" && "bg-amber-soft/70",
        tone === "coral" && "bg-coral-soft/80",
      )}
      href={href}
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Icon className="size-5" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </Link>
  );
}
