import { ClipboardList, UserRound, type LucideIcon } from "lucide-react";

export type PrimaryNavigationItem = {
  href: "/" | "/settings";
  icon: LucideIcon;
  id: "checklist" | "mine";
  label: "清单" | "我的";
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
