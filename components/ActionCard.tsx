import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type ActionCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

export function ActionCard({
  description,
  href,
  icon: Icon,
  title,
}: ActionCardProps) {
  return (
    <Link
      className="card-surface grid min-h-[132px] content-start gap-3 p-4 transition-colors hover:border-primary/30 hover:bg-secondary/40"
      href={href}
    >
      <span className="icon-tile size-11">
        <Icon className="size-5" />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </Link>
  );
}
