"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { hasExistingDadKitData } from "@/lib/device-identity/onboarding";
import { useDeviceIdentityStore } from "@/lib/device-identity/store";

export function FamilySetupPrompt() {
  const hydrate = useDeviceIdentityStore((state) => state.hydrate);
  const completedAt = useDeviceIdentityStore((state) => state.onboardingCompletedAt);
  const complete = useDeviceIdentityStore((state) => state.completeOnboarding);
  const [existing, setExisting] = useState(false);
  useEffect(() => { hydrate(); void hasExistingDadKitData().then(setExisting); }, [hydrate]);
  if (!existing || completedAt !== null) return null;
  return <section className="relative grid gap-3 rounded-card border border-primary/25 bg-secondary p-4"><button aria-label="关闭家庭成员设置提示" className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-full" onClick={() => complete()} type="button"><X className="size-4" /></button><div className="pr-10"><h2 className="font-semibold">完善家庭成员设置</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">添加自定义成员后，可以为物品分配多人负责人，并在宝宝记录中显示记录人。</p></div><Button asChild className="justify-self-start" size="sm"><Link href="/settings/family">前往设置</Link></Button></section>;
}
