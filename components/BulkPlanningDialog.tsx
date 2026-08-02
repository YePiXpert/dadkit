"use client";

import { Users } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showAppToast } from "@/lib/app-toast";
import { useItemPlanningStore } from "@/lib/planning/store";
import {
  PLANNING_ASSIGNEE_LABELS,
  PLANNING_ASSIGNEES,
  type PlanningAssignee,
  type PlanningBulkPatch,
} from "@/lib/planning/types";

type BulkMode = "keep" | "set" | "clear";

export function BulkPlanningDialog({
  itemIds,
  onOpenChange,
  open,
}: {
  itemIds: string[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const bulkUpdate = useItemPlanningStore((state) => state.bulkUpdate);
  const [assigneeMode, setAssigneeMode] = useState<BulkMode>("keep");
  const [assignee, setAssignee] = useState<PlanningAssignee>("dad");
  const [dueDateMode, setDueDateMode] = useState<BulkMode>("keep");
  const [dueDate, setDueDate] = useState("");
  const [locationMode, setLocationMode] = useState<BulkMode>("keep");
  const [storageLocation, setStorageLocation] = useState("");

  useEffect(() => {
    if (!open) return;
    setAssigneeMode("keep");
    setAssignee("dad");
    setDueDateMode("keep");
    setDueDate("");
    setLocationMode("keep");
    setStorageLocation("");
  }, [open]);

  function save() {
    const patch: PlanningBulkPatch = {
      assignee:
        assigneeMode === "keep"
          ? { mode: "keep" }
          : assigneeMode === "clear"
            ? { mode: "clear" }
            : { mode: "set", value: assignee },
      dueDate:
        dueDateMode === "keep"
          ? { mode: "keep" }
          : dueDateMode === "clear"
            ? { mode: "clear" }
            : { mode: "set", value: dueDate },
      storageLocation:
        locationMode === "keep"
          ? { mode: "keep" }
          : locationMode === "clear"
            ? { mode: "clear" }
            : { mode: "set", value: storageLocation },
    };
    const result = bulkUpdate(itemIds, patch);
    if (!result.ok) {
      showAppToast({ message: result.message ?? "批量设置失败。", tone: "warning" });
      return;
    }
    onOpenChange(false);
    showAppToast({
      message: result.changed
        ? `已更新 ${itemIds.length} 项分工与采购信息。`
        : "所选项目没有变化。",
      tone: "success",
    });
  }

  const invalidSetValue =
    (dueDateMode === "set" && !dueDate) ||
    (locationMode === "set" && !storageLocation.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="size-5" />批量设置</DialogTitle>
          <DialogDescription>
            已选择 {itemIds.length} 项。保持不变的字段不会写入；清空会保留同步墓碑。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <BulkField label="负责人" mode={assigneeMode} onModeChange={setAssigneeMode}>
            {assigneeMode === "set" ? (
              <Select value={assignee} onValueChange={(value) => setAssignee(value as PlanningAssignee)}>
                <SelectTrigger aria-label="批量负责人"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLANNING_ASSIGNEES.map((value) => (
                    <SelectItem key={value} value={value}>{PLANNING_ASSIGNEE_LABELS[value]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </BulkField>

          <BulkField label="完成期限" mode={dueDateMode} onModeChange={setDueDateMode}>
            {dueDateMode === "set" ? (
              <Input aria-label="批量完成期限" onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} />
            ) : null}
          </BulkField>

          <BulkField label="存放位置" mode={locationMode} onModeChange={setLocationMode}>
            {locationMode === "set" ? (
              <Input aria-label="批量存放位置" maxLength={80} onChange={(event) => setStorageLocation(event.target.value)} value={storageLocation} />
            ) : null}
          </BulkField>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">取消</Button>
          <Button disabled={invalidSetValue || itemIds.length === 0} onClick={save}>保存批量设置</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkField({
  children,
  label,
  mode,
  onModeChange,
}: {
  children: React.ReactNode;
  label: string;
  mode: BulkMode;
  onModeChange: (mode: BulkMode) => void;
}) {
  return (
    <div className="grid gap-2 rounded-inset border border-border/70 p-3">
      <Label>{label}</Label>
      <Select value={mode} onValueChange={(value) => onModeChange(value as BulkMode)}>
        <SelectTrigger aria-label={`${label}处理方式`}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="keep">保持不变</SelectItem>
          <SelectItem value="set">设置值</SelectItem>
          <SelectItem value="clear">清空</SelectItem>
        </SelectContent>
      </Select>
      {children}
    </div>
  );
}
