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
      className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-50 rounded-3xl bg-card/90 shadow-lg backdrop-blur-xl sm:hidden"
    >
      <div className="mobile-shell grid grid-cols-5 gap-1 px-2 py-1.5">
        {PRIMARY_NAVIGATION_ITEMS.map((item) => {
          const active = isPrimaryNavigationItemActive(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-[3.4rem] min-h-11 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground",
                active && "bg-secondary font-semibold text-primary",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className="size-6" strokeWidth={active ? 2.2 : 1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
