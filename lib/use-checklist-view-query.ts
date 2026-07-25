"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { isChecklistView, type ChecklistView } from "@/lib/checklist-v2";
import { setChecklistViewInQuery } from "@/lib/checklist-display";

export function useChecklistViewQuery() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const candidate = searchParams.get("view");
  const view: ChecklistView = isChecklistView(candidate) ? candidate : "all";

  const setView = useCallback(
    (nextView: ChecklistView) => {
      const nextQuery = setChecklistViewInQuery(query, nextView);

      // 原生 replaceState：Next 会同步 useSearchParams，但不触发 RSC 往返，
      // 切换视图时不会整页重新取数。
      window.history.replaceState(
        null,
        "",
        nextQuery ? `${pathname}?${nextQuery}` : pathname,
      );
    },
    [pathname, query],
  );

  return { query, setView, view };
}
