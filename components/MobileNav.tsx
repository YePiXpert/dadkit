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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-nav backdrop-blur-xl sm:hidden"
    >
      <div className="mobile-shell grid grid-cols-5 gap-1 px-2 py-1">
        {PRIMARY_NAVIGATION_ITEMS.map((item) => {
          const active = isPrimaryNavigationItemActive(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-[4rem] min-h-11 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-medium text-muted-foreground transition-colors hover:text-foreground active:bg-secondary/60",
                active && "font-semibold text-primary",
              )}
              href={item.href}
              key={item.href}
              prefetch={false}
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-xl transition-colors",
                  active && "bg-secondary",
                )}
              >
                <Icon aria-hidden="true" className="size-5" strokeWidth={active ? 2.3 : 1.8} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
