"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { loadDeviceIdentity } from "@/lib/device-identity/repository";

const BYPASS_PATHS = ["/onboarding", "/join", "/settings/backup", "/settings/sync", "/privacy", "/support"];

export function OnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (
      BYPASS_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`),
      ) ||
      loadDeviceIdentity().onboardingCompletedAt !== null
    ) {
      return;
    }

    let cancelled = false;
    void import("@/lib/device-identity/onboarding")
      .then(({ hasExistingDadKitData }) => hasExistingDadKitData())
      .then((existing) => {
        if (
          !cancelled &&
          !existing &&
          loadDeviceIdentity().onboardingCompletedAt === null
        ) {
          router.replace("/onboarding");
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
