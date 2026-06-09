"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleHelp, MapPinned, Save } from "lucide-react";

import { CustomHospitalForm } from "@/components/CustomHospitalForm";
import { DisclaimerBox } from "@/components/DisclaimerBox";
import { EmptyState } from "@/components/EmptyState";
import { HospitalSelector } from "@/components/HospitalSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getHospitalForProfile } from "@/lib/rules";
import {
  createCustomHospitalProfile,
  useDadKitStore,
} from "@/lib/store";
import type { HospitalProfile, UserHospitalOverride } from "@/lib/types";

function linesToText(lines?: string[]) {
  return lines?.join("\n") ?? "";
}

function textToLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function HospitalPage() {
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const updateProfile = useDadKitStore((state) => state.updateProfile);
  const hospitalOverrides = useDadKitStore((state) => state.hospitalOverrides);
  const updateHospitalOverride = useDadKitStore(
    (state) => state.updateHospitalOverride,
  );
  const [customHospital, setCustomHospital] = useState<HospitalProfile>(() =>
    createCustomHospitalProfile({ name: "自定义医院", city: "北京市" }),
  );
  const [providedOverride, setProvidedOverride] = useState("");
  const [documentsOverride, setDocumentsOverride] = useState("");
  const [notesOverride, setNotesOverride] = useState("");

  const hospital = profile ? getHospitalForProfile(profile) : undefined;
  const hospitalId = profile?.customHospital?.hospitalId ?? profile?.hospitalId;
  const currentOverride = useMemo(
    () =>
      hospitalOverrides.find(
        (override) => override.hospitalId && override.hospitalId === hospitalId,
      ),
    [hospitalId, hospitalOverrides],
  );

  useEffect(() => {
    if (profile?.customHospital) {
      setCustomHospital(profile.customHospital);
    }
  }, [profile?.customHospital]);

  useEffect(() => {
    setProvidedOverride(linesToText(currentOverride?.providedItemsOverride));
    setDocumentsOverride(linesToText(currentOverride?.requiredDocumentsOverride));
    setNotesOverride(currentOverride?.notesOverride ?? "");
  }, [currentOverride]);

  if (!profile) {
    return (
      <div className="page-shell">
        <EmptyState
          title="还没有医院设置"
          description="先创建清单，再补充或修改医院模板和用户覆盖信息。"
          actionHref="/setup"
          actionLabel="开始创建清单"
        />
      </div>
    );
  }

  const priorityQuestions = checklist
    .filter(
      (item) =>
        item.itemKind === "question" &&
        item.category === "hospital_questions" &&
        (item.priority === "must" ||
          item.name.includes("押金") ||
          item.name.includes("医保结算") ||
          item.name.includes("入口") ||
          item.name.includes("路线") ||
          item.name.includes("电话") ||
          item.name.includes("停车")),
    )
    .slice(0, 6);
  const routePaymentItems = checklist
    .filter(
      (item) =>
        (item.itemKind === "task" || item.itemKind === "question") &&
        (item.name.includes("路线") ||
          item.name.includes("入口") ||
          item.name.includes("电话") ||
          item.name.includes("停车") ||
          item.name.includes("支付") ||
          item.name.includes("押金") ||
          item.name.includes("医保结算")),
    )
    .slice(0, 6);

  function toggleProvidedItem(id: string) {
    const current = new Set(profile.hospitalProvidedItemIds);

    if (id === "unknown") {
      updateProfile({
        hospitalProvidedItemIds: current.has("unknown") ? [] : ["unknown"],
      });
      return;
    }

    current.delete("unknown");

    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }

    updateProfile({ hospitalProvidedItemIds: Array.from(current) });
  }

  function saveOverride() {
    if (!hospitalId) {
      return;
    }

    const override: UserHospitalOverride = {
      hospitalId,
      providedItemsOverride: textToLines(providedOverride),
      requiredDocumentsOverride: textToLines(documentsOverride),
      notesOverride: notesOverride.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    updateHospitalOverride(override);
  }

  function saveCustomHospital() {
    updateProfile({
      hospitalMode: "custom",
      hospitalId: customHospital.hospitalId,
      customHospital,
    });
  }

  return (
    <div className="page-shell">
      <div className="mobile-shell grid gap-2 lg:max-w-none">
        <h1 className="text-3xl font-semibold tracking-normal">
          到下次产检时问清楚
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          医院规则变化快，未确认前不要把“可能提供”当成“已提供”。
        </p>
      </div>

      <Card className="mobile-shell rounded-2xl lg:max-w-none">
        <CardContent className="grid gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">当前医院</p>
              <h2 className="mt-1 text-xl font-semibold tracking-normal">
                {hospital?.name ?? "暂未确定医院"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                模板可信度：
                {hospital?.verificationStatus === "unverified"
                  ? "未核验模板"
                  : hospital?.verificationStatus ?? "待填写"}
              </p>
            </div>
            {hospital?.verificationStatus === "unverified" ? (
              <span className="rounded-full bg-amber-soft px-3 py-1 text-xs font-medium text-amber-foreground">
                未核验
              </span>
            ) : null}
          </div>
          <div className="rounded-xl border border-amber/35 bg-amber-soft p-3 text-sm leading-6 text-amber-foreground">
            <AlertTriangle className="mr-2 inline size-4" />
            未核验模板不代表官方要求，请以最近一次产检、入院须知或医院通知为准。
          </div>
        </CardContent>
      </Card>

      <div className="mobile-shell grid gap-4 lg:max-w-none lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleHelp className="size-5 text-primary" />
              高优先级问题
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {priorityQuestions.map((item) => (
              <HospitalTaskLine key={item.id} name={item.name} note={item.note} />
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="size-5 text-primary" />
              入院路线 / 电话 / 停车
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {routePaymentItems.map((item) => (
              <HospitalTaskLine key={item.id} name={item.name} note={item.note} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mobile-shell rounded-2xl border-primary/20 bg-secondary lg:max-w-none">
        <CardHeader>
          <CardTitle>医院明确提供才勾选</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm leading-6 text-muted-foreground">
            拿不准就保持“不确定”。勾选后才会把匹配物品标记为“医院提供”。
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["postpartum-pads", "产褥垫"],
              ["baby-diapers", "宝宝尿不湿"],
              ["baby-clothes", "宝宝衣物"],
              ["unknown", "不确定"],
            ].map(([id, label]) => {
              const checked = profile.hospitalProvidedItemIds.includes(id);

              return (
                <button
                  className={`flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left text-sm font-medium ${
                    checked ? "border-primary text-primary" : "border-border"
                  }`}
                  key={id}
                  type="button"
                  onClick={() => toggleProvidedItem(id)}
                >
                  <span
                    className={`flex size-5 items-center justify-center rounded-md border ${
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary/60"
                    }`}
                  >
                    {checked ? <CheckCircle2 className="size-3.5" /> : null}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>医院模式</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <HospitalSelector
            value={{
              hospitalMode: profile.hospitalMode,
              hospitalId: profile.hospitalId,
            }}
            onChange={(value) =>
              updateProfile({
                hospitalMode: value.hospitalMode,
                hospitalId: value.hospitalId,
              })
            }
          />
          <p className="text-sm leading-6 text-muted-foreground">
            所有医院规则都允许修改。未核验医院模板只用于提醒待确认事项，不代表官方入院要求。
          </p>
        </CardContent>
      </Card>

      {profile.hospitalMode === "custom" ? (
        <Card>
          <CardHeader>
            <CardTitle>自定义医院信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <CustomHospitalForm
              hospital={customHospital}
              onChange={setCustomHospital}
            />
            <Button className="w-full sm:w-fit" onClick={saveCustomHospital}>
              <Save className="size-4" />
              保存自定义医院
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {profile.hospitalMode !== "unknown" ? (
        <Card>
          <CardHeader>
            <CardTitle>用户覆盖信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="入院证件要求覆盖">
              <Textarea
                value={documentsOverride}
                onChange={(event) => setDocumentsOverride(event.target.value)}
                placeholder="每行一项；填写后会替代医院模板里的证件清单"
              />
            </Field>
            <Field label="医院明确提供物品覆盖">
              <Textarea
                value={providedOverride}
                onChange={(event) => setProvidedOverride(event.target.value)}
                placeholder="每行一项；仅填写已经向医院确认提供的物品"
              />
            </Field>
            <Field label="其他医院备注覆盖">
              <Textarea
                value={notesOverride}
                onChange={(event) => setNotesOverride(event.target.value)}
                placeholder="例如：最近一次产检确认的入院入口、停车、陪产提醒"
              />
            </Field>
            <Button className="w-full sm:w-fit" onClick={saveOverride}>
              <Save className="size-4" />
              保存覆盖信息
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 text-sm leading-6 text-muted-foreground">
            暂未确定医院时，DadKit 会保留医院相关待确认事项。确定医院后，可以在这里选择模板或填写自定义医院。
          </CardContent>
        </Card>
      )}

      <DisclaimerBox />
    </div>
  );
}

function HospitalTaskLine({ name, note }: { name: string; note?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <p className="text-sm font-semibold leading-5">{name}</p>
      {note ? (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
      ) : null}
    </div>
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
