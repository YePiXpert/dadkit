"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Home,
  Hospital,
  PackageCheck,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDadKitStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const desktopNavItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/checklist", label: "清单", icon: ClipboardList },
  { href: "/hospital", label: "医院", icon: Hospital },
  { href: "/timeline", label: "时间线", icon: CalendarClock },
  { href: "/settings", label: "设置", icon: Settings },
];

export function AppHeader() {
  const profile = useDadKitStore((state) => state.profile);
  const pathname = usePathname();

  return (
    <header className="hidden border-b border-border bg-card/95 backdrop-blur sm:sticky sm:top-0 sm:z-40 sm:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link className="flex min-w-0 items-center gap-2" href="/">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <PackageCheck className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold leading-tight">
              DadKit
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              孕期任务档案
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {desktopNavItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-primary",
                  active && "bg-secondary text-primary",
                )}
                href={item.href}
                key={item.href}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          {profile?.dueDate ? (
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              <span>预产期 {profile.dueDate}</span>
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
