"use client";

import { useEffect } from "react";

import { useDadKitStore } from "@/lib/store";
import { startAutoSync } from "@/lib/sync/auto-sync";

export function StoreHydrator() {
  const hydrate = useDadKitStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
    startAutoSync();
  }, [hydrate]);

  return null;
}
