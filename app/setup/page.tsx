"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { CustomHospitalForm } from "@/components/CustomHospitalForm";
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
        title="3 分钟生成清单"
        description="只问必要信息，之后都能改。小马助手会按预产期把待产任务排好。"
      />

      <Card className="mobile-shell lg:max-w-none">
        <CardHeader>
          <CardTitle>创建精简清单</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <SetupSection number="01" title="基本信息">
            <div className="field-grid">
              <Field label="预产期">
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
              </Field>
              <Field label="所在地区">
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
              </Field>
            </div>
          </SetupSection>

          <SetupSection number="02" title="医院">
            <Field label="生产医院">
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
            {selectedHospital?.verificationStatus === "unverified" ? (
              <p className="rounded-lg bg-amber-soft px-3 py-2 text-sm leading-6 text-amber-foreground">
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
            <div className="field-grid">
              <Field label="生产方式">
                <Select
                  value={draft.deliveryMode}
                  onValueChange={(value) =>
                    setDraft({ ...draft, deliveryMode: value as DeliveryMode })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DELIVERY_MODE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="预计住院天数">
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
              </Field>
            </div>

            <div className="grid gap-3 rounded-lg bg-secondary/60 p-4">
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
            <div className="grid gap-2 rounded-lg bg-background/60 p-3 sm:grid-cols-2">
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
            <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-primary">
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
    <section className="grid gap-4 rounded-lg border border-border bg-background/45 p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-amber-soft text-xs font-semibold text-amber-foreground">
          {number}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
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
    <div className="flex items-center justify-between gap-3">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
