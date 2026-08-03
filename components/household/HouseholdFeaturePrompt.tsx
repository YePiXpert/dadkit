"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { getActiveHouseholdMembers } from "@/lib/household/selectors";
import { useHouseholdStore } from "@/lib/household/store";

export function HouseholdFeaturePrompt() {
  const household = useHouseholdStore((state) => state.household);
  const hydrated = useHouseholdStore((state) => state.hydrated);
  const hydrate = useHouseholdStore((state) => state.hydrate);

  useEffect(() => { hydrate(); }, [hydrate]);

  if (!hydrated || getActiveHouseholdMembers(household).length > 0) return null;

  return (
    <section className="flex min-w-0 items-start gap-3 rounded-card bg-secondary/35 p-4 shadow-sm">
      <Users className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">添加家庭成员后，可以分配待产任务并标记宝宝记录人。</p>
        <p className="mt-1 text-[13px] leading-5 text-muted-foreground">也可以暂不设置，清单和宝宝记录仍可正常使用。</p>
        <Button asChild className="mt-3" size="sm" variant="outline">
          <Link href="/settings/family">添加家庭成员</Link>
        </Button>
      </div>
    </section>
  );
}
