"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  isPrimaryNavigationItemActive,
  PRIMARY_NAVIGATION_ITEMS,
  showsMobileNavigation,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  if (!showsMobileNavigation(pathname)) {
    return null;
  }

  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-card pb-[max(env(safe-area-inset-bottom),0.65rem)] pt-2 shadow-nav sm:hidden"
    >
      <div className="mobile-shell grid grid-cols-4 gap-2 px-4">
        {PRIMARY_NAVIGATION_ITEMS.map((item) => {
          const active = isPrimaryNavigationItemActive(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-[3.6rem] min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground",
                active && "font-semibold text-primary",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className="size-6" strokeWidth={active ? 2.35 : 1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
