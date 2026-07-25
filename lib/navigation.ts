import { ClipboardList, Database, type LucideIcon } from "lucide-react";

export type PrimaryNavigationItem = {
  href: "/" | "/settings";
  icon: LucideIcon;
  id: "checklist" | "data";
  label: "清单" | "数据";
  ownedRoutes: readonly string[];
};

export const PRIMARY_NAVIGATION_ITEMS = [
  {
    id: "checklist",
    href: "/",
    label: "清单",
    icon: ClipboardList,
    ownedRoutes: ["/"],
  },
  {
    id: "data",
    href: "/settings",
    label: "数据",
    icon: Database,
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
