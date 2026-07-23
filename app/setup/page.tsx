"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, Home } from "lucide-react";

import { CustomHospitalForm } from "@/components/CustomHospitalForm";
import { HospitalSelector } from "@/components/HospitalSelector";
import { Button } from "@/components/ui/button";
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
import { formatBabyZodiacLine } from "@/lib/baby-profile";
import { getHospitalForProfile } from "@/lib/rules";
import type {
  BabySex,
  DeliveryMode,
  HospitalProfile,
  UserProfile,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const PROVIDED_OPTIONS = [
  { id: "postpartum-pads", label: "产褥垫" },
  { id: "baby-diapers", label: "宝宝尿不湿" },
  { id: "baby-clothes", label: "宝宝衣物" },
  { id: "blanket", label: "包被" },
  { id: "mom-care-kit", label: "妈妈护理包" },
  { id: "other", label: "其他" },
  { id: "unknown", label: "不确定" },
];

const DELIVERY_SEGMENTS: Array<{ label: string; value: DeliveryMode }> = [
  { label: "先不确定", value: "unknown" },
  { label: "顺产", value: "vaginal" },
  { label: "剖宫产", value: "c_section" },
];

const WIZARD_STEPS = [
  {
    eyebrow: "第 1 步",
    title: "预产期",
    description: "先确定时间线，后面的清单和今日优先都会跟着调整。",
  },
  {
    eyebrow: "第 2 步",
    title: "所在地区",
    description: "当前按中国大陆待产场景整理，地区用于选择本地模板。",
  },
  {
    eyebrow: "第 3 步",
    title: "生产方式",
    description: "不确定也可以先跳过，之后会按产检结果随时改。",
  },
  {
    eyebrow: "第 4 步",
    title: "医院情况",
    description: "能确定就选医院；还没确定时，先用待确认模板推进。",
  },
] as const;

const BABY_SEX_SEGMENTS: Array<{ label: string; value: BabySex }> = [
  { label: "女宝", value: "girl" },
  { label: "男宝", value: "boy" },
  { label: "先不确定", value: "unknown" },
];

export default function SetupPage() {
  const router = useRouter();
  const profile = useDadKitStore((state) => state.profile);
  const createProfile = useDadKitStore((state) => state.createProfile);
  const saveProfile = useDadKitStore((state) => state.saveProfile);
  const [draft, setDraft] = useState<UserProfile>(() => createDefaultProfile());
  const [customHospital, setCustomHospital] = useState<HospitalProfile>(() =>
    createCustomHospitalProfile({ name: "自定义医院", city: "北京市" }),
  );
  const [otherProvided, setOtherProvided] = useState("");
  const [message, setMessage] = useState("");
  const [wizardStep, setWizardStep] = useState(0);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDraft(profile);
    if (profile.customHospital) {
      setCustomHospital(profile.customHospital);
    }

    const customProvided = profile.hospitalProvidedItemIds.find(
      (id) => !PROVIDED_OPTIONS.some((option) => option.id === id),
    );
    setOtherProvided(customProvided ?? "");
  }, [profile]);

  const selectedProvided = useMemo(() => {
    const ids = new Set(draft.hospitalProvidedItemIds);

    if (otherProvided) {
      ids.add("other");
    }

    return ids;
  }, [draft.hospitalProvidedItemIds, otherProvided]);
  const selectedHospital = getHospitalForProfile({
    ...draft,
    customHospital: draft.hospitalMode === "custom" ? customHospital : draft.customHospital,
  });

  function toggleProvided(id: string) {
    const ids = new Set(draft.hospitalProvidedItemIds);

    if (id === "unknown") {
      setDraft({
        ...draft,
        hospitalProvidedItemIds: ids.has("unknown") ? [] : ["unknown"],
      });
      return;
    }

    ids.delete("unknown");
    if (ids.has(id)) {
      ids.delete(id);
    } else {
      ids.add(id);
    }

    setDraft({ ...draft, hospitalProvidedItemIds: Array.from(ids) });
  }

  function submit() {
    if (!draft.dueDate) {
      setMessage("请先填写预产期，DadKit 会据此生成准备时间线。");
      return;
    }

    const providedIds = draft.hospitalProvidedItemIds.filter(
      (id) => id !== "other" && !id.startsWith("其他："),
    );

    if (selectedProvided.has("other")) {
      providedIds.push(otherProvided.trim() || "other");
    }

    const nextProfile = {
      ...draft,
      customHospital: draft.hospitalMode === "custom" ? customHospital : undefined,
      hospitalProvidedItemIds: Array.from(new Set(providedIds)),
    };

    try {
      if (profile) {
        saveProfile(nextProfile);
      } else {
        createProfile(nextProfile);
      }
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "无法保存本地恢复快照，资料未被替换。",
      );
      return;
    }

    router.push("/");
  }

  const isFirstRun = !profile;
  const currentWizardStep = WIZARD_STEPS[wizardStep];
  const canContinueWizard = wizardStep !== 0 || Boolean(draft.dueDate);

  function goToNextWizardStep() {
    if (!canContinueWizard) {
      setMessage("请先填写预产期，DadKit 会据此生成准备时间线。");
      return;
    }

    setMessage("");
    setWizardStep((step) => Math.min(step + 1, WIZARD_STEPS.length - 1));
  }

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-4">
        <SetupHeader firstRun={isFirstRun} />

        {isFirstRun ? (
          <section className="card-surface grid gap-3 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary">
                  {currentWizardStep.eyebrow} / 4 步生成可信方案
                </p>
                <h2 className="mt-1 text-base font-semibold leading-6">
                  {currentWizardStep.title}
                </h2>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">
                {wizardStep + 1}/4
              </span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {currentWizardStep.description}
            </p>
            <WizardProgress currentStep={wizardStep} />

            {wizardStep === 0 ? (
              <DueDateField
                draft={draft}
                onChange={(dueDate) => {
                  setMessage("");
                  setDraft({
                    ...draft,
                    dueDate,
                  });
                }}
              />
            ) : null}

            {wizardStep === 1 ? (
              <RegionField
                draft={draft}
                onChange={(regionId) => setDraft({ ...draft, regionId })}
              />
            ) : null}

            {wizardStep === 2 ? (
              <DeliveryModeField
                draft={draft}
                onChange={(deliveryMode) =>
                  setDraft({ ...draft, deliveryMode })
                }
              />
            ) : null}

            {wizardStep === 3 ? (
              <HospitalField
                draft={draft}
                selectedHospital={selectedHospital}
                onChange={(value) =>
                  setDraft({
                    ...draft,
                    hospitalMode: value.hospitalMode,
                    hospitalId: value.hospitalId,
                    hospitalProvidedItemIds:
                      value.hospitalMode !== draft.hospitalMode ||
                      value.hospitalId !== draft.hospitalId
                        ? []
                        : draft.hospitalProvidedItemIds,
                  })
                }
              />
            ) : null}

            {message ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
                {message}
              </p>
            ) : null}

            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
              <Button
                aria-label="上一步"
                className="h-12 px-4"
                disabled={wizardStep === 0}
                variant="secondary"
                onClick={() => {
                  setMessage("");
                  setWizardStep((step) => Math.max(step - 1, 0));
                }}
              >
                <ArrowLeft className="size-4" />
              </Button>
              {wizardStep < WIZARD_STEPS.length - 1 ? (
                <Button
                  className="h-12 w-full text-base"
                  onClick={goToNextWizardStep}
                >
                  继续
                </Button>
              ) : (
                <Button
                  className="h-12 w-full text-base"
                  onClick={submit}
                >
                  生成我的可信方案
                </Button>
              )}
            </div>
            <p className="text-center text-xs font-medium text-muted-foreground">
              保存后可随时修改
            </p>
          </section>
        ) : (
          <>
            <section className="card-surface grid gap-3 p-3">
              <DueDateField
                draft={draft}
                onChange={(dueDate) => {
                  setMessage("");
                  setDraft({
                    ...draft,
                    dueDate,
                  });
                }}
              />

              <SegmentField label="宝宝性别" columns={3}>
                {BABY_SEX_SEGMENTS.map((option) => (
                  <SegmentButton
                    active={(draft.babySex ?? "unknown") === option.value}
                    key={option.value}
                    label={option.label}
                    onClick={() => setDraft({ ...draft, babySex: option.value })}
                  />
                ))}
              </SegmentField>

              <RegionField
                draft={draft}
                onChange={(regionId) => setDraft({ ...draft, regionId })}
              />

              <HospitalField
                draft={draft}
                selectedHospital={selectedHospital}
                onChange={(value) =>
                  setDraft({
                    ...draft,
                    hospitalMode: value.hospitalMode,
                    hospitalId: value.hospitalId,
                    hospitalProvidedItemIds:
                      value.hospitalMode !== draft.hospitalMode ||
                      value.hospitalId !== draft.hospitalId
                        ? []
                        : draft.hospitalProvidedItemIds,
                  })
                }
              />

              <DeliveryModeField
                draft={draft}
                onChange={(deliveryMode) =>
                  setDraft({ ...draft, deliveryMode })
                }
              />

            </section>

            <Button className="h-14 w-full text-base" onClick={submit}>
              保存并回到首页
            </Button>
            <p className="text-center text-xs font-medium text-muted-foreground">
              保存后可随时修改
            </p>

            {message ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
                {message}
              </p>
            ) : null}

            <details className="card-surface p-3">
              <summary className="cursor-pointer text-sm font-semibold text-primary">
                更多医院信息（可选）
              </summary>
              <div className="mt-4 grid gap-4">
                {selectedHospital?.verificationStatus === "unverified" ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
                    该医院模板尚未核验，请以最近一次产检、入院须知或医院通知为准。
                  </p>
                ) : null}
                {draft.hospitalMode === "custom" ? (
                  <CustomHospitalForm
                    hospital={customHospital}
                    onChange={setCustomHospital}
                  />
                ) : null}

                <SetupFieldRow label="预计住院天数" valueHint={`${draft.expectedStayDays} 天`}>
                  <Input
                    className="h-auto border-0 bg-transparent px-0 py-0 text-right text-sm font-semibold shadow-none focus-visible:ring-0"
                    min={1}
                    type="number"
                    value={draft.expectedStayDays}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        expectedStayDays: Number(event.target.value) || 1,
                      })
                    }
                  />
                </SetupFieldRow>

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
                    label="寒冷季节"
                    onCheckedChange={(coldWeather) =>
                      setDraft({ ...draft, coldWeather })
                    }
                  />
                </div>

                <section className="grid gap-3">
                  <div>
                    <p className="text-sm font-semibold">医院明确提供哪些物品？</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      只有已经从医院确认过的物品才勾选。拿不准就选不确定。
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PROVIDED_OPTIONS.map((option) => (
                      <button
                        className={cn(
                          "min-h-10 rounded-lg border border-border bg-card px-3 text-left text-sm font-semibold shadow-sm",
                          selectedProvided.has(option.id) &&
                            "border-primary/40 bg-secondary text-primary",
                        )}
                        key={option.id}
                        type="button"
                        onClick={() => toggleProvided(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {selectedProvided.has("other") ? (
                    <Input
                      value={otherProvided}
                      onChange={(event) => setOtherProvided(event.target.value)}
                      placeholder="补充已确认由医院提供的其他物品"
                    />
                  ) : null}
                </section>

                <Field label="医院备注">
                  <Textarea
                    value={draft.hospitalNotes ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, hospitalNotes: event.target.value })
                    }
                    placeholder="例如：产检时听到的入院入口、护士提醒、需要再次确认的事项"
                  />
                </Field>
              </div>
            </details>
          </>
        )}
      </section>
    </div>
  );
}

function SetupHeader({ firstRun }: { firstRun: boolean }) {
  return (
    <section className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
      <Link
        aria-label="返回首页"
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm"
        href="/"
      >
        <Home className="size-4" />
      </Link>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold leading-tight tracking-normal sm:text-2xl">
          创建资料
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {firstRun ? "填写基础信息，生成可信方案" : "填写基础信息，生成待产清单"}
        </p>
      </div>
    </section>
  );
}

function WizardProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="grid grid-cols-4 gap-1.5" aria-label="设置进度">
      {WIZARD_STEPS.map((step, index) => (
        <span
          aria-label={step.title}
          className={cn(
            "h-2 rounded-full",
            index <= currentStep ? "bg-primary" : "bg-muted",
          )}
          key={step.title}
        />
      ))}
    </div>
  );
}

function DueDateField({
  draft,
  onChange,
}: {
  draft: UserProfile;
  onChange: (dueDate?: string) => void;
}) {
  return (
    <SetupFieldRow
      label="预产期"
      valueHint={draft.dueDate ? formatBabyZodiacLine(draft) : "请选择，生肖会自动计算"}
    >
      <Input
        required
        className="h-auto border-0 bg-transparent px-0 py-0 text-right text-sm font-semibold shadow-none focus-visible:ring-0"
        type="date"
        value={draft.dueDate ?? ""}
        onChange={(event) => onChange(event.target.value || undefined)}
      />
    </SetupFieldRow>
  );
}

function RegionField({
  draft,
  onChange,
}: {
  draft: UserProfile;
  onChange: (regionId: string) => void;
}) {
  return (
    <SetupFieldRow label="所在地" valueHint="北京市">
      <Select value={draft.regionId} onValueChange={onChange}>
        <SelectTrigger className="h-auto border-0 bg-transparent px-0 py-0 text-right text-sm font-semibold shadow-none focus:ring-0 [&>svg]:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cn-bj-general">北京市</SelectItem>
          <SelectItem value="other">其他地区</SelectItem>
        </SelectContent>
      </Select>
    </SetupFieldRow>
  );
}

function HospitalField({
  draft,
  onChange,
  selectedHospital,
}: {
  draft: UserProfile;
  onChange: (value: Pick<UserProfile, "hospitalMode" | "hospitalId">) => void;
  selectedHospital?: HospitalProfile;
}) {
  return (
    <SetupFieldRow
      label="选择医院（可选）"
      valueHint={selectedHospital?.name ?? "我还没确定医院"}
    >
      <HospitalSelector
        triggerClassName="h-auto border-0 bg-transparent px-0 py-0 text-right text-sm font-semibold shadow-none focus:ring-0 [&>svg]:hidden"
        value={{
          hospitalMode: draft.hospitalMode,
          hospitalId: draft.hospitalId,
        }}
        onChange={onChange}
      />
    </SetupFieldRow>
  );
}

function DeliveryModeField({
  draft,
  onChange,
}: {
  draft: UserProfile;
  onChange: (deliveryMode: DeliveryMode) => void;
}) {
  return (
    <SegmentField label="生产方式" columns={3}>
      {DELIVERY_SEGMENTS.map((option) => (
        <SegmentButton
          active={draft.deliveryMode === option.value}
          key={option.value}
          label={option.label}
          onClick={() => onChange(option.value)}
        />
      ))}
    </SegmentField>
  );
}

function SetupFieldRow({
  children,
  label,
  valueHint,
}: {
  children: React.ReactNode;
  label: string;
  valueHint: string;
}) {
  return (
    <div className="grid min-h-[4.1rem] grid-cols-[minmax(0,1fr)_minmax(8.5rem,42%)] items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-5">{label}</p>
        <p className="mt-0.5 break-words text-xs leading-4 text-muted-foreground">
          {valueHint}
        </p>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-1">
        {children}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}

function SegmentField({
  children,
  columns = 2,
  label,
}: {
  children: React.ReactNode;
  columns?: 2 | 3;
  label: string;
}) {
  return (
    <section className="grid gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="text-sm font-semibold leading-5">{label}</p>
      <div className={cn("grid gap-2", columns === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {children}
      </div>
    </section>
  );
}

function SegmentButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex min-h-12 items-center justify-center gap-1 rounded-lg border px-3 text-sm font-semibold shadow-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-secondary",
      )}
      type="button"
      onClick={onClick}
    >
      {active ? <Check className="size-4" /> : null}
      <span className="leading-5">{label}</span>
    </button>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
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
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
      <Label className="font-semibold">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
