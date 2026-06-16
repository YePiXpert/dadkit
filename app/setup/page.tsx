"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Home } from "lucide-react";

import { CustomHospitalForm } from "@/components/CustomHospitalForm";
import { CuteIllustration } from "@/components/CuteIllustration";
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
  { label: "顺产", value: "vaginal" },
  { label: "剖宫产", value: "c_section" },
];

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
  const [firstBaby, setFirstBaby] = useState(true);
  const [message, setMessage] = useState("");

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

    if (profile) {
      saveProfile(nextProfile);
    } else {
      createProfile(nextProfile);
    }

    router.push("/checklist");
  }

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-4">
        <SetupHeader />

        <section className="grid gap-3 rounded-lg border border-white/90 bg-card/95 p-3 shadow-soft">
          <SetupFieldRow
            label="预产期"
            valueHint={
              draft.dueDate ? formatBabyZodiacLine(draft) : "请选择，生肖会自动计算"
            }
          >
            <Input
              required
              className="h-auto border-0 bg-transparent px-0 py-0 text-right text-sm font-bold shadow-none focus-visible:ring-0"
              type="date"
              value={draft.dueDate ?? ""}
              onChange={(event) => {
                setMessage("");
                setDraft({
                  ...draft,
                  dueDate: event.target.value || undefined,
                });
              }}
            />
          </SetupFieldRow>

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

          <SetupFieldRow label="所在地" valueHint="北京市">
            <Select
              value={draft.regionId}
              onValueChange={(regionId) => setDraft({ ...draft, regionId })}
            >
              <SelectTrigger className="h-auto border-0 bg-transparent px-0 py-0 text-right text-sm font-bold shadow-none focus:ring-0 [&>svg]:hidden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cn-bj-general">北京市</SelectItem>
                <SelectItem value="other">其他地区</SelectItem>
              </SelectContent>
            </Select>
          </SetupFieldRow>

          <SetupFieldRow
            label="选择医院（可选）"
            valueHint={selectedHospital?.name ?? "我还没确定医院"}
          >
            <HospitalSelector
              triggerClassName="h-auto border-0 bg-transparent px-0 py-0 text-right text-sm font-bold shadow-none focus:ring-0 [&>svg]:hidden"
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
          </SetupFieldRow>

          <SegmentField label="生产方式">
            {DELIVERY_SEGMENTS.map((option) => (
              <SegmentButton
                active={draft.deliveryMode === option.value}
                key={option.value}
                label={option.label}
                onClick={() =>
                  setDraft({ ...draft, deliveryMode: option.value })
                }
              />
            ))}
          </SegmentField>

          <SegmentField label="首次生产？">
            <SegmentButton
              active={firstBaby}
              label="是"
              onClick={() => setFirstBaby(true)}
            />
            <SegmentButton
              active={!firstBaby}
              label="否"
              onClick={() => setFirstBaby(false)}
            />
          </SegmentField>
        </section>

        <Button className="h-14 w-full bg-primary text-base shadow-soft" onClick={submit}>
          生成待产清单
        </Button>
        <p className="text-center text-xs font-medium text-muted-foreground">
          保存后可随时修改
        </p>

        {message ? <p className="macaron-note">{message}</p> : null}

        <details className="rounded-lg border border-white/90 bg-card/90 p-3 shadow-sm">
          <summary className="cursor-pointer text-sm font-bold text-primary">
            更多医院信息（可选）
          </summary>
          <div className="mt-4 grid gap-4">
            {selectedHospital?.verificationStatus === "unverified" ? (
              <p className="rounded-lg border border-amber/35 bg-amber-soft px-3 py-2 text-sm leading-6 text-amber-foreground">
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
                className="h-auto border-0 bg-transparent px-0 py-0 text-right text-sm font-bold shadow-none focus-visible:ring-0"
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
                <p className="text-sm font-bold">医院明确提供哪些物品？</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  只有已经从医院确认过的物品才勾选。拿不准就选不确定。
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDED_OPTIONS.map((option) => (
                  <button
                    className={cn(
                      "min-h-10 rounded-lg border border-white/90 bg-background/75 px-3 text-left text-sm font-semibold shadow-sm",
                      selectedProvided.has(option.id) &&
                        "border-primary/40 bg-mint text-primary",
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
      </section>
    </div>
  );
}

function SetupHeader() {
  return (
    <section className="relative grid min-h-24 grid-cols-[auto_minmax(0,1fr)_5.5rem] items-center gap-3">
      <Link
        aria-label="返回首页"
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/90 bg-card text-primary shadow-sm"
        href="/"
      >
        <Home className="size-4" />
      </Link>
      <div className="min-w-0">
        <h1 className="text-2xl font-black leading-tight tracking-normal">
          创建资料
        </h1>
        <p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">
          填写基础信息，生成待产清单
        </p>
      </div>
      <div className="relative h-24">
        <span className="absolute left-0 top-2 rounded-full border border-peach/40 bg-card px-3 py-1 text-lg text-coral shadow-sm">
          ☁
        </span>
        <CuteIllustration
          className="absolute bottom-0 right-0 size-24 border-transparent bg-transparent shadow-none"
          imageClassName="object-contain"
          priority
        />
      </div>
    </section>
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
    <div className="grid min-h-[4.1rem] grid-cols-[minmax(0,1fr)_minmax(8.5rem,42%)] items-center gap-3 rounded-lg border border-white/90 bg-background/70 px-3 py-2 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-bold leading-5">{label}</p>
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
    <section className="grid gap-2 rounded-lg border border-white/90 bg-background/70 p-3 shadow-sm">
      <p className="text-sm font-bold leading-5">{label}</p>
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
        "flex min-h-12 items-center justify-center gap-1 rounded-lg border px-3 text-sm font-bold shadow-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-white/90 bg-card text-muted-foreground hover:bg-mint/70",
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
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-white/90 bg-background/75 px-3 py-2 shadow-sm">
      <Label className="font-semibold">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
