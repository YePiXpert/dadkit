"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { isChecklistView, type ChecklistView } from "@/lib/checklist-v2";
import { setChecklistViewInQuery } from "@/lib/checklist-display";

export function useChecklistViewQuery() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const candidate = searchParams.get("view");
  const view: ChecklistView = isChecklistView(candidate) ? candidate : "all";

  const setView = useCallback(
    (nextView: ChecklistView) => {
      const nextQuery = setChecklistViewInQuery(query, nextView);
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, query, router],
  );

  return { query, setView, view };
}
