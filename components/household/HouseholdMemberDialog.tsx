"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { DraftConflictNotice } from "@/components/DraftConflictNotice";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showAppToast } from "@/lib/app-toast";
import { useHouseholdStore } from "@/lib/household/store";
import { HOUSEHOLD_RELATIONSHIP_SUGGESTIONS, type HouseholdMemberPortable, type HouseholdValidationErrors } from "@/lib/household/types";
import { useDraftConflict } from "@/lib/use-draft-conflict";

type HouseholdMemberForm = {
  displayName: string;
  relationshipLabel: string;
};

export function HouseholdMemberDialog({ member, open, onOpenChange }: { member?: HouseholdMemberPortable; open: boolean; onOpenChange(open: boolean): void }) {
  const addMember = useHouseholdStore((state) => state.addMember);
  const updateMember = useHouseholdStore((state) => state.updateMember);
  const conflict = useDraftConflict<HouseholdMemberForm>({
    displayName: member?.displayName.value ?? "",
    relationshipLabel: member?.relationshipLabel.value ?? "",
  }, open);
  const { displayName, relationshipLabel } = conflict.draft;
  const [errors, setErrors] = useState<HouseholdValidationErrors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
  }, [member, open]);

  function save() {
    const result = member
      ? updateMember(member.id, { displayName, relationshipLabel })
      : addMember({ displayName, relationshipLabel });
    if (!result.ok) {
      if (result.errors) setErrors(result.errors);
      if (result.message) {
        showAppToast({ message: result.message, tone: "warning" });
      }
      return;
    }
    onOpenChange(false);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{member ? "编辑家庭成员" : "添加家庭成员"}</DialogTitle><DialogDescription>名称和关系都由你定义，不要求使用固定家庭角色。</DialogDescription></DialogHeader><DraftConflictNotice fields={conflict.conflictFields.map((key) => key === "displayName" ? "成员名称" : "关系说明")} onAcceptExternal={conflict.acceptExternal} onKeepLocal={conflict.keepLocal} /><div className="grid gap-4"><div className="grid gap-2"><Label htmlFor="household-member-name">成员名称</Label><Input aria-describedby={errors.displayName ? "household-member-name-error" : undefined} aria-invalid={Boolean(errors.displayName)} id="household-member-name" maxLength={40} onChange={(event) => conflict.setField("displayName", event.target.value)} value={displayName} />{errors.displayName ? <p className="text-[13px] text-destructive" id="household-member-name-error" role="alert">{errors.displayName}</p> : null}</div><div className="grid gap-2"><Label htmlFor="household-member-relationship">关系说明（可选）</Label><Input aria-describedby={errors.relationshipLabel ? "household-member-relationship-error" : undefined} aria-invalid={Boolean(errors.relationshipLabel)} id="household-member-relationship" list="household-relationship-suggestions" maxLength={30} onChange={(event) => conflict.setField("relationshipLabel", event.target.value)} value={relationshipLabel} /><datalist id="household-relationship-suggestions">{HOUSEHOLD_RELATIONSHIP_SUGGESTIONS.map((value) => <option key={value} value={value} />)}</datalist>{errors.relationshipLabel ? <p className="text-[13px] text-destructive" id="household-member-relationship-error" role="alert">{errors.relationshipLabel}</p> : null}</div></div><DialogFooter><Button onClick={() => onOpenChange(false)} variant="outline">取消</Button><Button disabled={conflict.hasConflict} onClick={save}>保存成员</Button></DialogFooter></DialogContent></Dialog>;
}
