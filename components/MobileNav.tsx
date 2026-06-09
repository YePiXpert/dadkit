"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, Hospital, Settings, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/checklist", label: "清单", icon: ClipboardList },
  { href: "/hospital", label: "医院", icon: Hospital },
  { href: "/share", label: "导出", icon: Share2 },
  { href: "/settings", label: "设置", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 sm:hidden">
      <div className="mx-auto grid max-w-[430px] grid-cols-5 gap-1 rounded-full border border-border bg-card/95 p-1.5 shadow-soft backdrop-blur">
        {navItems.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              className={cn(
                "flex h-11 flex-col items-center justify-center gap-1 rounded-full text-xs text-muted-foreground transition-colors",
                active && "bg-secondary text-primary",
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
