import { Baby, ClipboardList, House, LayoutGrid, UserRound, type LucideIcon } from "lucide-react";

export type PrimaryNavigationItem = {
  href: "/" | "/checklist" | "/baby" | "/tools" | "/settings";
  icon: LucideIcon;
  id: "home" | "checklist" | "baby" | "tools" | "mine";
  label: "首页" | "清单" | "宝宝" | "工具" | "我的";
  ownedRoutes: readonly string[];
};

export const PRIMARY_NAVIGATION_ITEMS = [
  {
    id: "home",
    href: "/",
    label: "首页",
    icon: House,
    ownedRoutes: ["/"],
  },
  {
    id: "checklist",
    href: "/checklist",
    label: "清单",
    icon: ClipboardList,
    ownedRoutes: ["/checklist"],
  },
  {
    id: "baby",
    href: "/baby",
    label: "宝宝",
    icon: Baby,
    ownedRoutes: ["/baby"],
  },
  {
    id: "tools",
    href: "/tools",
    label: "工具",
    icon: LayoutGrid,
    ownedRoutes: ["/tools", "/growth", "/departure", "/hospital", "/planning"],
  },
  {
    id: "mine",
    href: "/settings",
    label: "我的",
    icon: UserRound,
    ownedRoutes: ["/settings", "/privacy", "/support"],
  },
] as const satisfies readonly PrimaryNavigationItem[];

export function isPrimaryNavigationItemActive(
  pathname: string,
  item: PrimaryNavigationItem,
) {
  return item.ownedRoutes.some((route) => routeMatches(pathname, route));
}

function routeMatches(pathname: string, route: string) {
  if (route === "/") {
    return pathname === route;
  }

  return pathname === route || pathname.startsWith(`${route}/`);
}

export function showsMobileNavigation(pathname: string) {
  const normalizedPathname =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  return !(
    normalizedPathname === "/onboarding" ||
    normalizedPathname.startsWith("/settings/")
  );
}
