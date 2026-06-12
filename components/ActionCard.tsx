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
        "grid min-h-[132px] gap-3 rounded-lg border border-white/80 bg-card/95 p-4 shadow-soft transition-all active:scale-[0.99]",
        tone === "primary" && "hover:border-primary/40 hover:bg-secondary/40",
        tone === "amber" && "border-amber/35 bg-amber-soft/65",
        tone === "coral" && "border-coral/30 bg-coral-soft/75",
      )}
      href={href}
    >
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-lg text-primary-foreground shadow-sm",
          tone === "primary" && "bg-primary",
          tone === "amber" && "bg-amber text-amber-foreground",
          tone === "coral" && "bg-coral text-coral-foreground",
        )}
      >
        <Icon className="size-5" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </Link>
  );
}
