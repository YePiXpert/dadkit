"use client";

import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { HouseholdMemberPortable } from "@/lib/household/types";

export function HouseholdMemberRow({ member, removed = false, onEdit, onRemove }: { member: HouseholdMemberPortable; removed?: boolean; onEdit?(): void; onRemove?(): void }) {
  return <article className="flex min-w-0 items-center gap-3 rounded-xl border border-border p-3"><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{member.displayName.value}{removed ? "（已移除）" : ""}</p><p className="mt-1 break-words text-xs text-muted-foreground">{member.relationshipLabel.value || "未填写关系"}</p></div>{onEdit ? <Button aria-label={`编辑${member.displayName.value}`} onClick={onEdit} size="icon" variant="ghost"><Pencil className="size-4" /></Button> : null}{onRemove ? <Button aria-label={`移除${member.displayName.value}`} onClick={onRemove} size="icon" variant="ghost"><Trash2 className="size-4 text-destructive" /></Button> : null}</article>;
}
