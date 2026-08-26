"use client";

import { useEffect } from "react";

import { useHouseholdStore } from "@/lib/household/store";

export function HomeHouseholdTitle() {
  const household = useHouseholdStore((state) => state.household);
  const hydrated = useHouseholdStore((state) => state.hydrated);
  const hydrate = useHouseholdStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const householdName = hydrated
    ? household.householdName.value.trim()
    : "";

  return (
    <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-[28px]">
      {householdName || "首页"}
    </h1>
  );
}
