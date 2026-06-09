"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";

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
      {hospital?.verificationStatus === "unverified" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          该医院模板尚未核验，请以最近一次产检、入院须知或医院通知为准。
        </div>
      ) : null}

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
