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

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/80 bg-card/95 pb-[max(env(safe-area-inset-bottom),0.55rem)] pt-2 shadow-soft backdrop-blur sm:hidden">
      <div className="mx-auto grid max-w-[520px] grid-cols-5 gap-1.5 px-2">
        {navItems.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              className={cn(
                "relative flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-xs font-semibold text-muted-foreground transition-colors",
                active && "bg-secondary text-primary shadow-sm",
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
