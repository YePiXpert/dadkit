"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  isPrimaryNavigationItemActive,
  PRIMARY_NAVIGATION_ITEMS,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card pb-[max(env(safe-area-inset-bottom),0.55rem)] pt-1.5 sm:hidden"
    >
      <div className="mobile-shell grid grid-cols-2 gap-1 px-2">
        {PRIMARY_NAVIGATION_ITEMS.map((item) => {
          const active = isPrimaryNavigationItemActive(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-[3.25rem] min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium text-muted-foreground transition-colors",
                active && "font-semibold text-foreground",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
