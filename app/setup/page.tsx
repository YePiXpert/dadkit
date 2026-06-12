"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Save } from "lucide-react";

import { CustomHospitalForm } from "@/components/CustomHospitalForm";
import { CuteIllustration } from "@/components/CuteIllustration";
import { DisclaimerBox } from "@/components/DisclaimerBox";
import { HospitalSelector } from "@/components/HospitalSelector";
import { PageIntro } from "@/components/PageIntro";
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
import { getHospitalForProfile } from "@/lib/rules";
import {
  DELIVERY_MODE_LABELS,
  type DeliveryMode,
  type HospitalProfile,
  type UserProfile,
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

export default function SetupPage() {
  const router = useRouter();
  const profile = useDadKitStore((state) => state.profile);
  const saveProfile = useDadKitStore((state) => state.saveProfile);
  const [draft, setDraft] = useState<UserProfile>(() => createDefaultProfile());
  const [customHospital, setCustomHospital] = useState<HospitalProfile>(() =>
    createCustomHospitalProfile({ name: "自定义医院", city: "北京市" }),
  );
  const [otherProvided, setOtherProvided] = useState("");
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
      setDraft({ ...draft, hospitalProvidedItemIds: ids.has("unknown") ? [] : ["unknown"] });
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

    saveProfile({
      ...draft,
      customHospital: draft.hospitalMode === "custom" ? customHospital : undefined,
      hospitalProvidedItemIds: Array.from(new Set(providedIds)),
    });
    router.push("/checklist");
  }

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="小马助手建档"
        title="创建资料"
        description="只问必要信息，之后都能改。小马助手会按预产期把待产任务排好。"
      />

      <Card className="mobile-shell overflow-hidden border-white/90 bg-card/95 shadow-soft lg:max-w-none">
        <CardHeader className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-3">
          <div className="min-w-0">
            <p className="section-kicker">只需 2 分钟</p>
            <CardTitle className="mt-1 text-2xl">生成我的待产清单</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              填完信息后，DadKit 会自动生成按阶段整理的准备清单。
            </p>
          </div>
          <CuteIllustration
            className="size-[4.5rem] border-peach/40 bg-peach"
            imageClassName="object-contain p-1.5"
            variant="horse"
          />
        </CardHeader>
        <CardContent className="grid gap-5">
          <SetupSection number="01" title="基本信息">
            <div className="grid gap-2">
              <SetupFieldRow
                caption="用于计算孕周、倒计时和准备时间线"
                label="预产期"
              >
                <Input
                  required
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
              <SetupFieldRow
                caption="当前先提供北京通用规则，其他地区可保留通用模板"
                label="所在地区"
              >
                <Select
                  value={draft.regionId}
                  onValueChange={(regionId) => setDraft({ ...draft, regionId })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cn-bj-general">北京市</SelectItem>
                    <SelectItem value="other">其他地区</SelectItem>
                  </SelectContent>
                </Select>
              </SetupFieldRow>
            </div>
          </SetupSection>

          <SetupSection number="02" title="医院">
            <SetupFieldRow
              caption="可选择已收录医院、暂不确定或填写自定义医院"
              label="生产医院"
            >
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
            </SetupFieldRow>
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
          </SetupSection>

          <SetupSection number="03" title="生产条件">
            <div className="grid gap-2">
              <SetupFieldRow
                caption="不确定也没关系，之后可以随时修改"
                label="生产方式"
              >
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(DELIVERY_MODE_LABELS).map(([value, label]) => (
                    <SegmentButton
                      active={draft.deliveryMode === value}
                      key={value}
                      label={label}
                      onClick={() =>
                        setDraft({ ...draft, deliveryMode: value as DeliveryMode })
                      }
                    />
                  ))}
                </div>
              </SetupFieldRow>
              <SetupFieldRow
                caption="影响消耗品和换洗物品数量建议"
                label="预计住院天数"
              >
                <Input
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
            </div>

            <div className="macaron-strip grid gap-3">
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
          </SetupSection>

          <SetupSection number="04" title="医院明确提供哪些物品？">
            <p className="text-sm leading-6 text-muted-foreground">
              只有已经从医院确认过的物品才勾选。拿不准就选不确定。
            </p>
            <div className="grid gap-2 rounded-lg border border-white/80 bg-cream/70 p-3 shadow-sm sm:grid-cols-2">
              {PROVIDED_OPTIONS.map((option) => (
                <label
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm"
                  key={option.id}
                >
                  <input
                    checked={selectedProvided.has(option.id)}
                    className="size-4 accent-primary"
                    type="checkbox"
                    onChange={() => toggleProvided(option.id)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {selectedProvided.has("other") ? (
              <Input
                className="mt-2"
                value={otherProvided}
                onChange={(event) => setOtherProvided(event.target.value)}
                placeholder="补充已确认由医院提供的其他物品"
              />
            ) : null}
          </SetupSection>

          <Field label="医院备注">
            <Textarea
              value={draft.hospitalNotes ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, hospitalNotes: event.target.value })
              }
              placeholder="例如：产检时听到的入院入口、护士提醒、需要再次确认的事项"
            />
          </Field>

          <Button className="w-full sm:w-fit" onClick={submit}>
            <Save className="size-4" />
            生成清单
          </Button>
          {message ? (
            <p className="macaron-note">
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>
      <DisclaimerBox />
    </div>
  );
}

function SetupSection({
  children,
  number,
  title,
}: {
  children: React.ReactNode;
  number: string;
  title: string;
}) {
  return (
    <section className="grid gap-4 rounded-lg border border-white/90 bg-cream/55 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-peach text-xs font-semibold text-peach-foreground">
          {number}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SetupFieldRow({
  caption,
  children,
  label,
}: {
  caption: string;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="app-list-row flex-col items-stretch bg-card/90 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-5">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{caption}</p>
      </div>
      <div className="w-full min-w-0 sm:max-w-xs">{children}</div>
    </div>
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
        "flex min-h-12 items-center justify-center gap-1 rounded-lg border px-2 text-sm font-bold shadow-sm transition-colors",
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
    <div className="app-list-row min-h-12 bg-card/80 px-3 py-2">
      <Label className="font-semibold">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
