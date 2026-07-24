"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  isPrimaryNavigationItemActive,
  PRIMARY_NAVIGATION_ITEMS,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="hidden border-b border-border bg-card/90 backdrop-blur sm:sticky sm:top-0 sm:z-40 sm:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link className="flex min-w-0 items-center gap-2" href="/">
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold leading-tight">
              DadKit
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              待产准备
            </span>
          </span>
        </Link>
        <nav aria-label="主导航" className="flex items-center gap-1">
          {PRIMARY_NAVIGATION_ITEMS.map((item) => {
            const active = isPrimaryNavigationItemActive(pathname, item);
            const Icon = item.icon;

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground",
                  active && "bg-secondary text-primary hover:bg-secondary hover:text-primary",
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
      </div>
    </header>
  );
}
