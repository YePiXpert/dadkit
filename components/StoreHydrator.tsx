"use client";

import { useEffect } from "react";

import { useDadKitStore } from "@/lib/store";

export function StoreHydrator() {
  const hydrate = useDadKitStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}
