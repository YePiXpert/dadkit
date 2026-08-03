"use client";

import { useSearchParams } from "next/navigation";
import { Building2, Copy, MapPin, Pencil, Phone, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { showAppToast } from "@/lib/app-toast";
import { hospitalValuesFromPortable } from "@/lib/hospital/portable";
import { isHospitalProfileConfigured } from "@/lib/hospital/selectors";
import { useHospitalProfileStore } from "@/lib/hospital/store";
import {
  HOSPITAL_FIELD_KEYS,
  HOSPITAL_FIELD_LABELS,
  HOSPITAL_FIELD_LIMITS,
  type HospitalFieldKey,
  type HospitalProfileValues,
  type HospitalValidationErrors,
} from "@/lib/hospital/types";
import { hospitalTelHref } from "@/lib/hospital/validation";

const SINGLE_LINE_FIELDS = [
  "hospitalName",
  "campusName",
  "maternityPhone",
  "emergencyPhone",
] as const satisfies readonly HospitalFieldKey[];

const VIEW_FIELD_ORDER = HOSPITAL_FIELD_KEYS.filter(
  (key) => key !== "hospitalName" && key !== "campusName",
);

export function HospitalProfileWorkspace() {
  const searchParams = useSearchParams();
  const hydrated = useHospitalProfileStore((state) => state.hydrated);
  const hydrate = useHospitalProfileStore((state) => state.hydrate);
  const profile = useHospitalProfileStore((state) => state.profile);
  const saveDraft = useHospitalProfileStore((state) => state.saveDraft);
  const clearProfile = useHospitalProfileStore((state) => state.clearProfile);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<HospitalProfileValues>(() =>
    hospitalValuesFromPortable(profile),
  );
  const [errors, setErrors] = useState<HospitalValidationErrors>({});
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [copyFallback, setCopyFallback] = useState("");
  const hospitalNameRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const configured = isHospitalProfileConfigured(profile);
  const values = hospitalValuesFromPortable(profile);
  const backHref =
    searchParams.get("from") === "departure" ? "/departure" : "/settings";

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  function beginEditing() {
    setDraft(hospitalValuesFromPortable(profile));
    setErrors({});
    setEditing(true);
    window.requestAnimationFrame(() => hospitalNameRef.current?.focus());
  }

  function cancelEditing() {
    setDraft(hospitalValuesFromPortable(profile));
    setErrors({});
    setEditing(false);
    window.requestAnimationFrame(() => editButtonRef.current?.focus());
  }

  function saveProfile() {
    const result = saveDraft(draft);

    if (!result.ok) {
      const nextErrors = result.errors ?? {};
      setErrors(nextErrors);
      const firstInvalid = HOSPITAL_FIELD_KEYS.find(
        (key) => nextErrors[key],
      );
      document.getElementById(`hospital-${firstInvalid}`)?.focus();
      return;
    }

    setErrors({});
    setEditing(false);
    showAppToast({
      message: result.changed ? "医院档案已保存。" : "医院档案没有变化。",
      tone: "success",
    });
    window.requestAnimationFrame(() => editButtonRef.current?.focus());
  }

  function clearSavedProfile() {
    clearProfile();
    setEditing(false);
    setErrors({});
    setCopyFallback("");
    showAppToast({ message: "医院档案已清空。", tone: "success" });
  }

  async function copyAddress() {
    if (!values.address) return;

    try {
      await navigator.clipboard.writeText(values.address);
      setCopyFallback("");
      showAppToast({ message: "医院地址已复制。", tone: "success" });
    } catch {
      setCopyFallback(values.address);
      window.requestAnimationFrame(() => {
        (
          document.getElementById(
            "hospital-copy-fallback",
          ) as HTMLTextAreaElement | null
        )?.select();
      });
    }
  }

  if (!hydrated) {
    return <HospitalProfileSkeleton />;
  }

  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-4">
        <PageHeader
          backHref={backHref}
          backLabel={
            backHref === "/departure" ? "返回准备出发" : "返回我的"
          }
          kicker="本地档案"
          subtitle="把医院地址、电话和入院要求集中放在这里。"
          title="医院档案"
        />

        {editing ? (
          <section className="card-surface grid gap-5 p-4 sm:p-5">
            <div>
              <h2 className="text-[15px] font-semibold">编辑医院档案</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                医院名称必填，其余信息可以按当前掌握的内容补充。
              </p>
            </div>

            <div className="grid gap-4">
              {HOSPITAL_FIELD_KEYS.map((key) => (
                <HospitalDraftField
                  draft={draft}
                  error={errors[key]}
                  fieldKey={key}
                  inputRef={key === "hospitalName" ? hospitalNameRef : undefined}
                  key={key}
                  onChange={(value) => {
                    setDraft((current) => ({ ...current, [key]: value }));
                    if (errors[key]) {
                      setErrors((current) => ({ ...current, [key]: undefined }));
                    }
                  }}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button onClick={saveProfile}>保存档案</Button>
              <Button onClick={cancelEditing} variant="outline">
                取消
              </Button>
            </div>
          </section>
        ) : configured ? (
          <section className="card-surface grid gap-4 p-4 sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="icon-tile size-12">
                <Building2 className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-[15px] font-semibold">
                  {values.hospitalName}
                </h2>
                {values.campusName ? (
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {values.campusName}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3">
              {VIEW_FIELD_ORDER.map((key) =>
                values[key] ? (
                  <div
                    className="rounded-inset bg-background/60 p-3 shadow-sm"
                    key={key}
                  >
                    <h3 className="text-xs text-muted-foreground">
                      {HOSPITAL_FIELD_LABELS[key]}
                    </h3>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium leading-6">
                      {values[key]}
                    </p>
                  </div>
                ) : null,
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button ref={editButtonRef} onClick={beginEditing}>
                <Pencil />
                编辑档案
              </Button>
              {values.address ? (
                <Button
                  aria-label="复制医院地址"
                  onClick={copyAddress}
                  variant="outline"
                >
                  <Copy />
                  复制地址
                </Button>
              ) : null}
              {values.maternityPhone ? (
                <Button asChild variant="outline">
                  <a
                    aria-label="拨打产科或住院电话"
                    href={hospitalTelHref(values.maternityPhone)}
                  >
                    <Phone />
                    产科/住院
                  </a>
                </Button>
              ) : null}
              {values.emergencyPhone ? (
                <Button asChild variant="outline">
                  <a
                    aria-label="拨打急诊电话"
                    href={hospitalTelHref(values.emergencyPhone)}
                  >
                    <Phone />
                    急诊电话
                  </a>
                </Button>
              ) : null}
            </div>

            {copyFallback ? (
              <div className="grid gap-1">
                <Label htmlFor="hospital-copy-fallback">
                  浏览器未授权复制，请手动复制
                </Label>
                <Textarea
                  id="hospital-copy-fallback"
                  readOnly
                  value={copyFallback}
                />
              </div>
            ) : null}

            <div className="mt-1 border-t border-border/60 pt-3">
              <Button
                className="text-destructive hover:text-destructive"
                onClick={() => setClearConfirmOpen(true)}
                variant="ghost"
              >
                <Trash2 />
                清空档案
              </Button>
            </div>
          </section>
        ) : (
          <section className="card-surface grid justify-items-center p-8 text-center">
            <span className="icon-tile size-16">
              <MapPin className="size-8" />
            </span>
            <h2 className="mt-4 text-[15px] font-semibold">还没有填写医院档案</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              先记下医院名称，再逐步补充电话、地址和入院要求。
            </p>
            <Button className="mt-5" ref={editButtonRef} onClick={beginEditing}>
              填写医院档案
            </Button>
          </section>
        )}

        <p className="px-3 text-center text-xs leading-5 text-muted-foreground">
          本页面仅用于保存用户自行填写的信息。医院要求可能发生变化，出发前请以医院和医生的最新通知为准。
        </p>
      </section>

      <ConfirmDialog
        confirmLabel="清空医院档案"
        description="所有医院地址、电话和入院要求都会清空；家庭同步后其他设备也会收到这次清空。"
        onConfirm={clearSavedProfile}
        onOpenChange={setClearConfirmOpen}
        open={clearConfirmOpen}
        title="确认清空医院档案？"
        variant="destructive"
      />
    </div>
  );
}

function HospitalDraftField({
  draft,
  error,
  fieldKey,
  inputRef,
  onChange,
}: {
  draft: HospitalProfileValues;
  error?: string;
  fieldKey: HospitalFieldKey;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange: (value: string) => void;
}) {
  const id = `hospital-${fieldKey}`;
  const errorId = `${id}-error`;
  const singleLine = SINGLE_LINE_FIELDS.includes(
    fieldKey as (typeof SINGLE_LINE_FIELDS)[number],
  );
  const shared = {
    "aria-describedby": error ? errorId : undefined,
    "aria-invalid": Boolean(error),
    id,
    maxLength: HOSPITAL_FIELD_LIMITS[fieldKey],
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(event.target.value),
    value: draft[fieldKey],
  };

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {HOSPITAL_FIELD_LABELS[fieldKey]}
        {fieldKey === "hospitalName" ? " *" : ""}
      </Label>
      {singleLine ? (
        <Input
          {...shared}
          ref={inputRef}
          type={fieldKey.includes("Phone") ? "tel" : "text"}
        />
      ) : (
        <Textarea {...shared} />
      )}
      <p className="text-xs text-muted-foreground">
        最多 {HOSPITAL_FIELD_LIMITS[fieldKey]} 个字符
      </p>
      {error ? (
        <p className="text-xs text-destructive" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function HospitalProfileSkeleton() {
  return (
    <div className="page-shell page-shell-with-nav" aria-label="正在读取医院档案">
      <section className="mobile-shell grid gap-4">
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </section>
    </div>
  );
}
