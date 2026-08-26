import { Skeleton } from "@/components/ui/skeleton";

export function HomeStageSkeleton() {
  return (
    <div
      aria-label="正在读取家庭阶段"
      className="rounded-card bg-muted p-5"
      role="status"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-3">
          <Skeleton className="h-4 w-20 rounded-lg bg-background/70" />
          <Skeleton className="h-9 w-32 rounded-xl bg-background/70" />
          <Skeleton className="h-4 w-28 rounded-lg bg-background/70" />
        </div>
        <Skeleton className="h-[4.5rem] w-24 rounded-inset bg-background/70" />
      </div>
    </div>
  );
}

export function HomeProgressSkeleton() {
  return (
    <div
      aria-label="正在读取清单进度"
      className="grid gap-3 rounded-card bg-muted p-5"
      role="status"
    >
      <Skeleton className="h-8 w-24 rounded-lg bg-background/70" />
      <Skeleton className="h-2 rounded-full bg-background/70" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-10 rounded-xl bg-background/70" />
        <Skeleton className="h-10 rounded-xl bg-background/70" />
        <Skeleton className="h-10 rounded-xl bg-background/70" />
      </div>
    </div>
  );
}
