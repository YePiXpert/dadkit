"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useDadKitStore } from "@/lib/store";

export function StoreHydrator() {
  const pathname = usePathname();
  const hydrate = useDadKitStore((state) => state.hydrate);

  useEffect(() => {
    if (pathname === "/demo") {
      return;
    }

    hydrate();
  }, [hydrate, pathname]);

  return null;
}
