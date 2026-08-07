"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { DraftConflictNotice } from "@/components/DraftConflictNotice";
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
import { babyProfileValues } from "@/lib/baby/defaults";
import { useBabyStore } from "@/lib/baby/store";
import type { BabyProfileDraft, BabyProfilePortableData, BabyProfileValidationErrors } from "@/lib/baby/types";
import { validateBabyProfileDraft } from "@/lib/baby/validation";
import { useDraftConflict } from "@/lib/use-draft-conflict";

type Props = {
  open: boolean;
  onOpenChange(open: boolean): void;
  profile: BabyProfilePortableData;
};

export function BabyProfileDialog({ open, onOpenChange, profile }: Props) {
  const saveProfile = useBabyStore((state) => state.saveProfile);
  const conflict = useDraftConflict<BabyProfileDraft>(babyProfileValues(profile), open);
  const draft = conflict.draft;
  const [errors, setErrors] = useState<BabyProfileValidationErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
    }
  }, [open, profile]);

  async function save() {
    const validation = validateBabyProfileDraft(draft, { requireBirthDate: true });
    if (!validation.ok) {
      setErrors(validation.errors);
      document.getElementById(`baby-profile-${Object.keys(validation.errors)[0]}`)?.focus();
      return;
    }
    setSaving(true);
    const result = await saveProfile(validation.values);
    setSaving(false);
    if (!result.ok) {
      showAppToast({ message: result.message ?? "宝宝资料保存失败。", tone: "warning" });
      return;
    }
    showAppToast({ message: "宝宝资料已保存。", tone: "success" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>宝宝资料</DialogTitle>
          <DialogDescription>出生日期用于开启宝宝模式；出生时间和性别可以稍后补充。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <DraftConflictNotice
            fields={conflict.conflictFields.map((key) => BABY_PROFILE_FIELD_LABELS[key])}
            onAcceptExternal={conflict.acceptExternal}
            onKeepLocal={conflict.keepLocal}
          />
          <Field id="nickname" label="宝宝昵称" error={errors.nickname}>
            <Input
              aria-describedby={errors.nickname ? "baby-profile-nickname-error" : undefined}
              aria-invalid={Boolean(errors.nickname)}
              id="baby-profile-nickname"
              maxLength={40}
              onChange={(event) => conflict.setField("nickname", event.target.value)}
              placeholder="为空时显示“宝宝”"
              value={draft.nickname}
            />
          </Field>
          <Field id="birthDate" label="出生日期 *" error={errors.birthDate}>
            <Input
              aria-describedby={errors.birthDate ? "baby-profile-birthDate-error" : undefined}
              aria-invalid={Boolean(errors.birthDate)}
              id="baby-profile-birthDate"
              onChange={(event) => conflict.setField("birthDate", event.target.value)}
              type="date"
              value={draft.birthDate}
            />
          </Field>
          <Field id="birthTime" label="出生时间" error={errors.birthTime}>
            <Input
              aria-describedby={errors.birthTime ? "baby-profile-birthTime-error" : undefined}
              aria-invalid={Boolean(errors.birthTime)}
              id="baby-profile-birthTime"
              onChange={(event) => conflict.setField("birthTime", event.target.value)}
              type="time"
              value={draft.birthTime}
            />
          </Field>
          <div className="grid gap-2">
            <Label htmlFor="baby-profile-sex">性别</Label>
            <Select value={draft.sex} onValueChange={(sex) => conflict.setField("sex", sex as BabyProfileDraft["sex"])}>
              <SelectTrigger id="baby-profile-sex"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">暂不填写</SelectItem>
                <SelectItem value="boy">男宝宝</SelectItem>
                <SelectItem value="girl">女宝宝</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={saving} onClick={() => onOpenChange(false)} variant="outline">取消</Button>
          <Button disabled={saving || conflict.hasConflict} onClick={() => void save()}>{saving ? "正在保存…" : "保存资料"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const BABY_PROFILE_FIELD_LABELS: Record<keyof BabyProfileDraft, string> = {
  nickname: "宝宝昵称",
  birthDate: "出生日期",
  birthTime: "出生时间",
  sex: "性别",
};

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`baby-profile-${id}`}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive" id={`baby-profile-${id}-error`}>{error}</p> : null}
    </div>
  );
}
