"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { loadDeviceIdentity } from "@/lib/device-identity/repository";
import { hasExistingDadKitData } from "@/lib/device-identity/onboarding";

const BYPASS_PATHS = ["/onboarding", "/settings/backup", "/privacy", "/support"];

export function OnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (BYPASS_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return;
    let cancelled = false;
    void hasExistingDadKitData().then((existing) => {
      if (!cancelled && !existing && loadDeviceIdentity().onboardingCompletedAt === null) router.replace("/onboarding");
    });
    return () => { cancelled = true; };
  }, [pathname, router]);
  return null;
}
