import { PackageOpen, type LucideIcon } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  illustrationId?: string;
  icon?: LucideIcon;
};

export function EmptyState({
  title,
  description,
  illustrationId,
  icon: Icon = PackageOpen,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-card border border-border bg-card p-8 text-center shadow-none">
      {illustrationId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          aria-hidden="true"
          className="mb-4 size-20 rounded-inset bg-secondary object-cover p-1"
          loading="lazy"
          src={`/item-art/${illustrationId}.webp`}
        />
      ) : (
        <span className="mb-4 flex size-16 shrink-0 items-center justify-center rounded-inset bg-secondary text-primary">
          <Icon className="size-7" />
        </span>
      )}
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
