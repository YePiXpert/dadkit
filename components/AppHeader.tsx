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
    <header className="hidden border-b border-border/60 bg-background/80 backdrop-blur-xl sm:sticky sm:top-0 sm:z-40 sm:block sm:pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl" href="/">
          <span className="min-w-0">
            <span className="block truncate text-base font-bold leading-tight tracking-tight">
              DadKit
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              从待产到育儿
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
                  "inline-flex h-11 items-center gap-2 rounded-full px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground active:bg-secondary/70",
                  active && "bg-primary text-primary-foreground shadow-glow hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/85",
                )}
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden="true" className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
