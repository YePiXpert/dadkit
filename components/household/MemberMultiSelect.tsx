"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getActiveHouseholdMembers, householdMemberLabel } from "@/lib/household/selectors";
import type { HouseholdPortableData } from "@/lib/household/types";
import { cn } from "@/lib/utils";

export function MemberMultiSelect({
  household,
  id,
  selectedIds,
  onChange,
}: {
  household: HouseholdPortableData;
  id: string;
  selectedIds: string[];
  onChange(ids: string[]): void;
}) {
  const active = getActiveHouseholdMembers(household);
  const activeIds = new Set(active.map((member) => member.id));
  const historicalIds = selectedIds.filter((memberId) => !activeIds.has(memberId));

  if (active.length === 0 && historicalIds.length === 0) {
    return (
      <div className="grid gap-3 rounded-xl border border-dashed border-border/60 p-4 text-sm">
        <p className="text-muted-foreground">还没有家庭成员，可以先添加成员，也可以暂不分工。</p>
        <Button asChild className="justify-self-start" size="sm" variant="outline">
          <Link href="/settings/family">添加家庭成员</Link>
        </Button>
      </div>
    );
  }

  function toggle(memberId: string) {
    const next = selectedIds.includes(memberId)
      ? selectedIds.filter((id) => id !== memberId)
      : [...selectedIds, memberId];
    onChange([...new Set(next)].sort((left, right) => left.localeCompare(right)));
  }

  return (
    <div aria-label="负责人多选" className="grid gap-2" id={id} role="group">
      {active.map((member) => (
        <label className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-muted/35 px-3 py-2", selectedIds.includes(member.id) && "ring-1 ring-primary/50 bg-secondary")} key={member.id}>
          <input checked={selectedIds.includes(member.id)} className="size-4 accent-primary" onChange={() => toggle(member.id)} type="checkbox" />
          <span className="min-w-0 flex-1 break-words text-sm font-medium">{member.displayName.value}</span>
          {member.relationshipLabel.value ? <span className="text-[13px] text-muted-foreground">{member.relationshipLabel.value}</span> : null}
        </label>
      ))}
      {historicalIds.map((memberId) => (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border/60 px-3 py-2" key={memberId}>
          <input checked className="size-4 accent-primary" onChange={() => toggle(memberId)} type="checkbox" />
          <span className="min-w-0 flex-1 break-words text-sm">{householdMemberLabel(household, memberId)}</span>
          <span className="text-[13px] text-muted-foreground">历史负责人</span>
        </label>
      ))}
    </div>
  );
}
