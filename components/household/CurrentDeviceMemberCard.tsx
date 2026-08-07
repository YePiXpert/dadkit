"use client";

import { useEffect } from "react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeviceIdentityStore } from "@/lib/device-identity/store";
import { showAppToast } from "@/lib/app-toast";
import { getActiveHouseholdMembers } from "@/lib/household/selectors";
import type { HouseholdPortableData } from "@/lib/household/types";

export function CurrentDeviceMemberCard({ household, compact = false }: { household: HouseholdPortableData; compact?: boolean }) {
  const hydrate = useDeviceIdentityStore((state) => state.hydrate);
  const currentMemberId = useDeviceIdentityStore((state) => state.currentMemberId);
  const setCurrentMemberId = useDeviceIdentityStore((state) => state.setCurrentMemberId);
  const members = getActiveHouseholdMembers(household);
  useEffect(() => { hydrate(); }, [hydrate]);
  return <section className={compact ? "grid gap-2" : "grid gap-3 rounded-card bg-card p-4 shadow-sm"}><div><Label htmlFor={compact ? "baby-current-device-member" : "current-device-member"}>这台设备是谁在使用</Label><p className="mt-1 text-[13px] leading-5 text-muted-foreground">只保存在当前设备，不进入备份、WebDAV 或家庭同步。</p></div><Select value={currentMemberId ?? "none"} onValueChange={(value) => { const result = setCurrentMemberId(value === "none" ? null : value); if (!result.ok) showAppToast({ message: result.message ?? "设备设置保存失败。", tone: "warning" }); }}><SelectTrigger id={compact ? "baby-current-device-member" : "current-device-member"}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">暂不设置</SelectItem>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.displayName.value}{member.relationshipLabel.value ? ` · ${member.relationshipLabel.value}` : ""}</SelectItem>)}</SelectContent></Select></section>;
}
