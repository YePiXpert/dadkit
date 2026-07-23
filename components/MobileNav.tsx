"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, ClipboardList, Home, Hospital, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/checklist", label: "清单", icon: ClipboardList },
  { href: "/hospital", label: "医院", icon: Hospital },
  { href: "/timeline", label: "时间线", icon: CalendarClock },
  { href: "/settings", label: "设置", icon: Settings },
];

const hiddenRoutes = ["/setup"];

const secondaryRouteOwners: Record<string, string[]> = {
  "/checklist": ["/go", "/share"],
  "/hospital": ["/birth-plan"],
  "/timeline": ["/contractions"],
};

export function MobileNav() {
  const pathname = usePathname();

  if (hiddenRoutes.some((route) => pathname.startsWith(route))) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 pb-[max(env(safe-area-inset-bottom),0.55rem)] pt-1.5 backdrop-blur sm:hidden">
      <div className="mobile-shell grid grid-cols-5 gap-1 px-2">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href) ||
                secondaryRouteOwners[item.href]?.some((route) =>
                  pathname.startsWith(route),
                );
          const Icon = item.icon;

          return (
            <Link
              className={cn(
                "flex h-[3.25rem] min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary/70",
                active && "bg-secondary font-semibold text-primary",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
