"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { CustomHospitalForm } from "@/components/CustomHospitalForm";
import { HospitalSelector } from "@/components/HospitalSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createCustomHospitalProfile,
  createDefaultProfile,
  useDadKitStore,
} from "@/lib/store";
import type {
  BabySex,
  DeliveryMode,
  HospitalProfile,
  UserProfile,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const BABY_SEX_OPTIONS: Array<{ label: string; value: BabySex }> = [
  { label: "先不确定", value: "unknown" },
  { label: "女宝", value: "girl" },
  { label: "男宝", value: "boy" },
];

const DELIVERY_OPTIONS: Array<{ label: string; value: DeliveryMode }> = [
  { label: "先不确定", value: "unknown" },
  { label: "顺产", value: "vaginal" },
  { label: "剖宫产", value: "c_section" },
];

export default function SetupPage() {
  const router = useRouter();
  const profile = useDadKitStore((state) => state.profile);
  const createProfile = useDadKitStore((state) => state.createProfile);
  const saveProfile = useDadKitStore((state) => state.saveProfile);
  const [draft, setDraft] = useState<UserProfile>(() => createDefaultProfile());
  const [customHospital, setCustomHospital] = useState<HospitalProfile>(() =>
    createCustomHospitalProfile({ name: "自定义医院" }),
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!profile) return;
    setDraft(profile);
    if (profile.customHospital) setCustomHospital(profile.customHospital);
  }, [profile]);

  function submit() {
    const nextProfile: UserProfile = {
      ...draft,
      customHospital:
        draft.hospitalMode === "custom" ? customHospital : undefined,
    };

    try {
      if (profile) saveProfile(nextProfile);
      else createProfile(nextProfile);
      router.push("/settings");
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "资料暂时无法保存，请稍后重试。",
      );
    }
  }

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-4 lg:max-w-3xl">
        <header className="flex items-start gap-3">
          <Link
            aria-label="返回我的"
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm"
            href="/settings"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="section-kicker">可选设置</p>
            <h1 className="text-xl font-semibold leading-tight sm:text-2xl">
              我的资料
            </h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              不填也能使用完整清单。这里的信息只用来补充时间线和个性化提醒。
            </p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>基础信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="预产期（可选）" htmlFor="due-date">
              <Input
                id="due-date"
                type="date"
                value={draft.dueDate ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, dueDate: event.target.value || undefined })
                }
              />
            </Field>

            <Field label="所在地区" htmlFor="region">
              <Select
                value={draft.regionId}
                onValueChange={(regionId) => setDraft({ ...draft, regionId })}
              >
                <SelectTrigger id="region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="other">通用清单</SelectItem>
                  <SelectItem value="cn-bj-general">北京市</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <SegmentField
              label="宝宝性别"
              value={draft.babySex ?? "unknown"}
              options={BABY_SEX_OPTIONS}
              onChange={(babySex) => setDraft({ ...draft, babySex })}
            />

            <SegmentField
              label="生产方式"
              value={draft.deliveryMode}
              options={DELIVERY_OPTIONS}
              onChange={(deliveryMode) => setDraft({ ...draft, deliveryMode })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>医院与家庭偏好</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="医院（可选）">
              <HospitalSelector
                value={{
                  hospitalMode: draft.hospitalMode,
                  hospitalId: draft.hospitalId,
                }}
                onChange={(value) =>
                  setDraft({
                    ...draft,
                    hospitalMode: value.hospitalMode,
                    hospitalId: value.hospitalId,
                  })
                }
              />
            </Field>

            {draft.hospitalMode === "custom" ? (
              <CustomHospitalForm
                hospital={customHospital}
                onChange={setCustomHospital}
              />
            ) : null}

            <Field label="预计住院天数" htmlFor="stay-days">
              <Input
                id="stay-days"
                min={1}
                max={14}
                type="number"
                value={draft.expectedStayDays}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    expectedStayDays: Number(event.target.value) || 1,
                  })
                }
              />
            </Field>

            <div className="grid gap-2">
              <SwitchField
                checked={draft.breastfeeding}
                label="计划哺乳"
                onCheckedChange={(breastfeeding) =>
                  setDraft({ ...draft, breastfeeding })
                }
              />
              <SwitchField
                checked={draft.partnerPresent}
                label="有陪产人"
                onCheckedChange={(partnerPresent) =>
                  setDraft({ ...draft, partnerPresent })
                }
              />
              <SwitchField
                checked={draft.coldWeather}
                label="按寒冷季节准备"
                onCheckedChange={(coldWeather) =>
                  setDraft({ ...draft, coldWeather })
                }
              />
            </div>

            <Field label="医院备注（可选）" htmlFor="hospital-notes">
              <Textarea
                id="hospital-notes"
                placeholder="例如入院地点、陪产要求、医院已确认提供的物品"
                value={draft.hospitalNotes ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, hospitalNotes: event.target.value })
                }
              />
            </Field>
          </CardContent>
        </Card>

        {message ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={submit}>
            <Check className="size-4" />
            保存资料
          </Button>
          <Button asChild variant="outline">
            <Link href="/">暂不填写，回到清单</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function SegmentField<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            aria-pressed={value === option.value}
            className={cn(
              "min-h-11 rounded-xl border px-2 text-sm font-semibold transition-colors",
              value === option.value
                ? "border-primary bg-secondary text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted",
            )}
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SwitchField({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
      <Label className="font-semibold">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
