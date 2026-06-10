"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Hospital,
  Save,
  Settings2,
  type LucideIcon,
} from "lucide-react";

import { CustomHospitalForm } from "@/components/CustomHospitalForm";
import { DisclaimerBox } from "@/components/DisclaimerBox";
import { EmptyState } from "@/components/EmptyState";
import { HospitalQuestionCard } from "@/components/HospitalQuestionCard";
import { HospitalSelector } from "@/components/HospitalSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getHospitalForProfile } from "@/lib/rules";
import {
  createCustomHospitalProfile,
  useDadKitStore,
} from "@/lib/store";
import type {
  ChecklistItem,
  HospitalAnswer,
  HospitalProfile,
  UserHospitalOverride,
} from "@/lib/types";

const NEXT_CHECKUP_KEYWORD_GROUPS = [
  ["医院是否提供产褥垫"],
  ["医院是否提供宝宝尿不湿"],
  ["医院是否提供宝宝衣物"],
  ["医院是否允许陪产"],
  ["住院押金", "医保结算"],
  ["夜间入院入口", "急诊入院路线"],
  ["吸奶器"],
  ["出生医学证明"],
];

const DAD_CONFIRM_KEYWORD_GROUPS = [
  ["产科"],
  ["入院入口"],
  ["夜间"],
  ["停车"],
  ["支付"],
  ["押金"],
  ["医保结算"],
  ["陪产人"],
];

const MANUAL_PROVIDED_OPTIONS = [
  ["postpartum-pads", "产褥垫"],
  ["baby-diapers", "宝宝尿不湿"],
  ["baby-clothes", "宝宝衣物"],
  ["unknown", "不确定"],
] as const;

function linesToText(lines?: string[]) {
  return lines?.join("\n") ?? "";
}

function textToLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function pickItemsByKeywordGroups(
  items: ChecklistItem[],
  groups: string[][],
) {
  const used = new Set<string>();
  const picked: ChecklistItem[] = [];

  for (const keywords of groups) {
    const item = items.find(
      (candidate) =>
        !used.has(candidate.id) &&
        keywords.every((keyword) => candidate.name.includes(keyword)),
    );

    if (item) {
      used.add(item.id);
      picked.push(item);
    }
  }

  return picked;
}

function isAnswerDone(item: ChecklistItem, answer?: HospitalAnswer) {
  if (answer) {
    return answer.status !== "todo";
  }

  return ["packed", "hospital_provided", "not_needed"].includes(item.status);
}

export default function HospitalPage() {
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const updateProfile = useDadKitStore((state) => state.updateProfile);
  const hospitalOverrides = useDadKitStore((state) => state.hospitalOverrides);
  const updateHospitalOverride = useDadKitStore(
    (state) => state.updateHospitalOverride,
  );
  const hospitalAnswers = useDadKitStore((state) => state.hospitalAnswers);
  const updateHospitalAnswer = useDadKitStore(
    (state) => state.updateHospitalAnswer,
  );
  const [customHospital, setCustomHospital] = useState<HospitalProfile>(() =>
    createCustomHospitalProfile({ name: "自定义医院", city: "北京市" }),
  );
  const [providedOverride, setProvidedOverride] = useState("");
  const [documentsOverride, setDocumentsOverride] = useState("");
  const [notesOverride, setNotesOverride] = useState("");

  const hospital = profile ? getHospitalForProfile(profile) : undefined;
  const hospitalId = profile?.customHospital?.hospitalId ?? profile?.hospitalId;
  const answersByItemId = useMemo(
    () =>
      new Map(
        hospitalAnswers.map((answer) => [answer.itemId, answer] as const),
      ),
    [hospitalAnswers],
  );
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

  const questionCandidates = checklist.filter(
    (item) =>
      item.itemKind === "question" || item.category === "hospital_questions",
  );
  const nextCheckupItems = pickItemsByKeywordGroups(
    questionCandidates,
    NEXT_CHECKUP_KEYWORD_GROUPS,
  );
  const dadConfirmItems = pickItemsByKeywordGroups(
    checklist.filter(
      (item) =>
        item.itemKind === "task" ||
        item.itemKind === "question" ||
        item.category === "partner",
    ),
    DAD_CONFIRM_KEYWORD_GROUPS,
  );
  const allConfirmationItems = Array.from(
    new Map(
      [...nextCheckupItems, ...dadConfirmItems].map((item) => [item.id, item]),
    ).values(),
  );
  const completedConfirmations = allConfirmationItems.filter((item) =>
    isAnswerDone(item, answersByItemId.get(item.id)),
  ).length;
  const confirmationPercent =
    allConfirmationItems.length === 0
      ? 0
      : Math.round((completedConfirmations / allConfirmationItems.length) * 100);

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
        <h1 className="text-3xl font-semibold tracking-normal">医院确认</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          记录下次产检要问的问题，确认后会同步影响清单。
        </p>
      </div>

      <Card className="mobile-shell rounded-lg lg:max-w-none">
        <CardContent className="grid gap-3 p-4">
          <div>
            <p className="text-sm text-muted-foreground">当前医院</p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal">
              {hospital?.name ?? "暂未确定医院"}
            </h2>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            非官方模板，仅用于整理待确认事项。请以最近一次产检、入院须知或医院通知为准。
          </p>
        </CardContent>
      </Card>

      <Card className="mobile-shell rounded-lg lg:max-w-none">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-muted-foreground">确认进度</p>
            <p className="mt-1 text-2xl font-semibold tracking-normal">
              {completedConfirmations}/{allConfirmationItems.length}
            </p>
          </div>
          <div className="flex size-16 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-primary">
            {confirmationPercent}%
          </div>
        </CardContent>
      </Card>

      <Tabs className="mobile-shell lg:max-w-none" defaultValue="next-checkup">
        <TabsList className="grid h-auto w-full grid-cols-4 rounded-lg p-1">
          <TabsTrigger className="px-2 text-xs" value="next-checkup">
            下次产检要问
          </TabsTrigger>
          <TabsTrigger className="px-2 text-xs" value="dad">
            爸爸要确认
          </TabsTrigger>
          <TabsTrigger className="px-2 text-xs" value="provided">
            医院提供
          </TabsTrigger>
          <TabsTrigger className="px-2 text-xs" value="advanced">
            高级设置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="next-checkup">
          <QuestionSection
            description="点开每一项记录医院答复，确认后会同步影响清单状态。"
            icon={ClipboardList}
            items={nextCheckupItems}
            title="下次产检要问"
            answersByItemId={answersByItemId}
            onChange={updateHospitalAnswer}
          />
        </TabsContent>

        <TabsContent value="dad">
          <QuestionSection
            description="路线、电话、停车和支付信息都放在这里，方便临近入院前逐项确认。"
            icon={Hospital}
            items={dadConfirmItems}
            title="爸爸要确认"
            answersByItemId={answersByItemId}
            onChange={updateHospitalAnswer}
          />
        </TabsContent>

        <TabsContent value="provided">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="size-5 text-primary" />
                医院提供
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-sm leading-6 text-muted-foreground">
                建议优先在“下次产检要问”里记录医院答复；下面保留手动标记入口。
              </p>
              <details className="rounded-lg border border-border bg-background p-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  高级：手动标记医院已确认提供的物品
                </summary>
                <div className="mt-3 grid gap-3">
                  <p className="text-sm leading-6 text-muted-foreground">
                    通常不需要手动勾选，建议直接在上方问题里记录医院答复。
                  </p>
                  <ManualProvidedPicker
                    selectedIds={profile.hospitalProvidedItemIds}
                    onToggle={toggleProvidedItem}
                  />
                </div>
              </details>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <AdvancedSettings
            customHospital={customHospital}
            documentsOverride={documentsOverride}
            notesOverride={notesOverride}
            profileHospitalMode={profile.hospitalMode}
            providedOverride={providedOverride}
            onCustomHospitalChange={setCustomHospital}
            onDocumentsOverrideChange={setDocumentsOverride}
            onHospitalModeChange={(value) =>
              updateProfile({
                hospitalMode: value.hospitalMode,
                hospitalId: value.hospitalId,
              })
            }
            onNotesOverrideChange={setNotesOverride}
            onProvidedOverrideChange={setProvidedOverride}
            onSaveCustomHospital={saveCustomHospital}
            onSaveOverride={saveOverride}
            hospitalSelectorValue={{
              hospitalMode: profile.hospitalMode,
              hospitalId: profile.hospitalId,
            }}
          />
        </TabsContent>
      </Tabs>

      <DisclaimerBox />
    </div>
  );
}

function QuestionSection({
  answersByItemId,
  description,
  icon: Icon,
  items,
  onChange,
  title,
}: {
  answersByItemId: Map<string, HospitalAnswer>;
  description: string;
  icon: LucideIcon;
  items: ChecklistItem[];
  onChange: (answer: HospitalAnswer) => void;
  title: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="size-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        {items.length === 0 ? (
          <p className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
            暂时没有匹配的待确认事项。
          </p>
        ) : (
          items.map((item) => (
            <HospitalQuestionCard
              answer={answersByItemId.get(item.id)}
              item={item}
              key={item.id}
              onChange={onChange}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ManualProvidedPicker({
  onToggle,
  selectedIds,
}: {
  onToggle: (id: string) => void;
  selectedIds: string[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {MANUAL_PROVIDED_OPTIONS.map(([id, label]) => {
        const checked = selectedIds.includes(id);

        return (
          <button
            className={`flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left text-sm font-medium ${
              checked ? "border-primary text-primary" : "border-border"
            }`}
            key={id}
            type="button"
            onClick={() => onToggle(id)}
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
  );
}

function AdvancedSettings({
  customHospital,
  documentsOverride,
  hospitalSelectorValue,
  notesOverride,
  onCustomHospitalChange,
  onDocumentsOverrideChange,
  onHospitalModeChange,
  onNotesOverrideChange,
  onProvidedOverrideChange,
  onSaveCustomHospital,
  onSaveOverride,
  profileHospitalMode,
  providedOverride,
}: {
  customHospital: HospitalProfile;
  documentsOverride: string;
  hospitalSelectorValue: {
    hospitalMode: HospitalProfile["mode"];
    hospitalId?: string;
  };
  notesOverride: string;
  onCustomHospitalChange: (hospital: HospitalProfile) => void;
  onDocumentsOverrideChange: (value: string) => void;
  onHospitalModeChange: (value: {
    hospitalMode: HospitalProfile["mode"];
    hospitalId?: string;
  }) => void;
  onNotesOverrideChange: (value: string) => void;
  onProvidedOverrideChange: (value: string) => void;
  onSaveCustomHospital: () => void;
  onSaveOverride: () => void;
  profileHospitalMode: HospitalProfile["mode"];
  providedOverride: string;
}) {
  return (
    <div className="grid gap-3">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="size-5 text-primary" />
            医院模式
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <HospitalSelector
            value={hospitalSelectorValue}
            onChange={onHospitalModeChange}
          />
          <p className="text-sm leading-6 text-muted-foreground">
            所有医院规则都允许修改。未核验医院模板只用于提醒待确认事项，不代表官方入院要求。
          </p>
        </CardContent>
      </Card>

      {profileHospitalMode === "custom" ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg">自定义医院信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <CustomHospitalForm
              hospital={customHospital}
              onChange={onCustomHospitalChange}
            />
            <Button className="w-full sm:w-fit" onClick={onSaveCustomHospital}>
              <Save className="size-4" />
              保存自定义医院
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {profileHospitalMode !== "unknown" ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg">用户覆盖信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="入院证件要求覆盖">
              <Textarea
                value={documentsOverride}
                onChange={(event) =>
                  onDocumentsOverrideChange(event.target.value)
                }
                placeholder="每行一项；填写后会替代医院模板里的证件清单"
              />
            </Field>
            <Field label="医院明确提供物品覆盖">
              <Textarea
                value={providedOverride}
                onChange={(event) => onProvidedOverrideChange(event.target.value)}
                placeholder="每行一项；仅填写已经向医院确认提供的物品"
              />
            </Field>
            <Field label="其他医院备注覆盖">
              <Textarea
                value={notesOverride}
                onChange={(event) => onNotesOverrideChange(event.target.value)}
                placeholder="例如：最近一次产检确认的入院入口、停车、陪产提醒"
              />
            </Field>
            <Button className="w-full sm:w-fit" onClick={onSaveOverride}>
              <Save className="size-4" />
              保存覆盖信息
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-lg">
          <CardContent className="p-4 text-sm leading-6 text-muted-foreground">
            暂未确定医院时，DadKit 会保留医院相关待确认事项。确定医院后，可以在这里选择模板或填写自定义医院。
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
