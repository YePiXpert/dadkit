"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Home,
  Hospital,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getBabyMascot } from "@/lib/baby-profile";
import { useDadKitStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const desktopNavItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/checklist", label: "清单", icon: ClipboardList },
  { href: "/hospital", label: "医院", icon: Hospital },
  { href: "/timeline", label: "时间线", icon: CalendarClock },
  { href: "/settings", label: "我的", icon: Settings },
];

const secondaryRouteOwners: Record<string, string[]> = {
  "/checklist": ["/go", "/share"],
  "/hospital": ["/birth-plan"],
  "/timeline": ["/contractions"],
  "/settings": ["/postpartum"],
};

export function AppHeader() {
  const profile = useDadKitStore((state) => state.profile);
  const pathname = usePathname();
  const mascot = getBabyMascot(profile);

  return (
    <header className="hidden border-b border-white/80 bg-card/90 backdrop-blur sm:sticky sm:top-0 sm:z-40 sm:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link className="flex min-w-0 items-center gap-2" href="/">
          <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-secondary shadow-soft">
            <Image
              alt={mascot.alt}
              className="object-contain p-0.5"
              fill
              sizes="40px"
              src={mascot.src}
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-black leading-tight text-primary">
              DadKit
            </span>
            <span className="hidden text-xs font-medium text-muted-foreground sm:block">
              安心待产清单
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {desktopNavItems.map((item) => {
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
                  "inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-primary",
                  active && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
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
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm">
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
