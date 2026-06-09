"use client";

import Link from "next/link";
import { CalendarDays, PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDadKitStore } from "@/lib/store";

export function AppHeader() {
  const profile = useDadKitStore((state) => state.profile);

  return (
    <header className="hidden border-b border-border bg-background/90 backdrop-blur sm:sticky sm:top-0 sm:z-40 sm:block">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="flex min-w-0 items-center gap-2" href="/">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <PackageCheck className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold leading-tight">
              DadKit 任务控制台
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              本地优先的动态清单
            </span>
          </span>
        </Link>
        <div className="hidden items-center gap-2 sm:flex">
          {profile?.dueDate ? (
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              <span>{profile.dueDate}</span>
            </div>
          ) : null}
          <Button asChild size="sm">
            <Link href="/setup">编辑资料</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
