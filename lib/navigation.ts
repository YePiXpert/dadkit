import { Baby, ClipboardList, UserRound, type LucideIcon } from "lucide-react";

export type PrimaryNavigationItem = {
  href: "/" | "/baby" | "/settings";
  icon: LucideIcon;
  id: "checklist" | "baby" | "mine";
  label: "清单" | "宝宝" | "我的";
  ownedRoutes: readonly string[];
};

export const PRIMARY_NAVIGATION_ITEMS = [
  {
    id: "checklist",
    href: "/",
    label: "清单",
    icon: ClipboardList,
    ownedRoutes: ["/", "/checklist", "/departure", "/planning"],
  },
  {
    id: "baby",
    href: "/baby",
    label: "宝宝",
    icon: Baby,
    ownedRoutes: ["/baby"],
  },
  {
    id: "mine",
    href: "/settings",
    label: "我的",
    icon: UserRound,
    ownedRoutes: [
      "/settings",
      "/growth",
      "/hospital",
      "/privacy",
      "/support",
    ],
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
