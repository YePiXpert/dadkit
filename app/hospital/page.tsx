"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Hospital,
  Save,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { CustomHospitalForm } from "@/components/CustomHospitalForm";
import { DisclaimerBox } from "@/components/DisclaimerBox";
import { EmptyState } from "@/components/EmptyState";
import {
  HospitalQuestionCard,
  type HospitalQuestionCardInput,
} from "@/components/HospitalQuestionCard";
import { HospitalSelector } from "@/components/HospitalSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DAD_ACTION_TASKS,
  HOSPITAL_CONFIRMATION_GROUP_LABELS,
  HOSPITAL_CONFIRMATION_QUESTIONS,
  type HospitalConfirmationGroupId,
} from "@/lib/hospital/confirmation-plan";
import { getHospitalForProfile } from "@/lib/rules";
import {
  createCustomHospitalProfile,
  useDadKitStore,
} from "@/lib/store";
import type {
  HospitalAnswer,
  HospitalProfile,
  UserHospitalOverride,
} from "@/lib/types";

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

function isAnswerDone(answer?: HospitalAnswer) {
  return Boolean(answer && answer.status !== "todo");
}

function questionToCardInput(
  question: (typeof HOSPITAL_CONFIRMATION_QUESTIONS)[number],
): HospitalQuestionCardInput {
  return {
    id: question.id,
    name: question.title,
    note: question.description,
    kind: "question",
    answerType: question.answerType,
  };
}

function taskToCardInput(
  task: (typeof DAD_ACTION_TASKS)[number],
): HospitalQuestionCardInput {
  return {
    id: task.id,
    name: task.title,
    note: task.description,
    kind: "task",
    answerType: "confirmation",
  };
}

export default function HospitalPage() {
  const profile = useDadKitStore((state) => state.profile);
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

  const activeProfile = profile;
  const nextCheckupItems = HOSPITAL_CONFIRMATION_QUESTIONS.map(questionToCardInput);
  const dadConfirmItems = DAD_ACTION_TASKS.map(taskToCardInput);
  const allConfirmationItems = [...nextCheckupItems, ...dadConfirmItems];
  const completedConfirmations = allConfirmationItems.filter((item) =>
    isAnswerDone(answersByItemId.get(item.id)),
  ).length;
  const confirmationPercent =
    allConfirmationItems.length === 0
      ? 0
      : Math.round((completedConfirmations / allConfirmationItems.length) * 100);
  const quickConfirmRows: HospitalQuickRowInput[] = [
    {
      done: Boolean(hospital),
      icon: Hospital,
      tone: "lavender",
      title: "待产医院与病区",
    },
    {
      done: completedConfirmations > 0,
      icon: ClipboardList,
      tone: "mint",
      title: "入院流程与所需材料",
    },
    {
      done: Boolean(
        answersByItemId.get("hospital-bag-location") &&
          isAnswerDone(answersByItemId.get("hospital-bag-location")),
      ),
      icon: ClipboardList,
      tone: "coral",
      title: "待产包存放位置",
    },
    {
      done: Boolean(
        answersByItemId.get("partner-policy") &&
          isAnswerDone(answersByItemId.get("partner-policy")),
      ),
      icon: CheckCircle2,
      tone: "amber",
      title: "陪产与探视规定",
    },
    {
      done: Boolean(
        answersByItemId.get("postpartum-care") &&
          isAnswerDone(answersByItemId.get("postpartum-care")),
      ),
      icon: CheckCircle2,
      tone: "coral",
      title: "产后病房与护理",
    },
    {
      done: Boolean(
        answersByItemId.get("discharge-documents") &&
          isAnswerDone(answersByItemId.get("discharge-documents")),
      ),
      icon: ClipboardList,
      tone: "peach",
      title: "出院结算与证件",
    },
  ];

  function toggleProvidedItem(id: string) {
    const current = new Set(activeProfile.hospitalProvidedItemIds);

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
      <section className="mobile-shell grid gap-0 lg:max-w-none">
        <h1 className="text-2xl font-black tracking-normal">医院</h1>
        <p className="text-sm font-medium leading-6 text-muted-foreground">
          入院前的关键信息先问清楚
        </p>
      </section>

      <Card className="mobile-shell pony-soft-card overflow-hidden lg:max-w-none">
        <CardContent className="p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <Hospital className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black">
                {hospital?.name ?? "暂未确定医院"}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                趁早确认，入院更从容
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-mint px-3 py-1 text-xs font-bold text-mint-foreground">
              {hospital ? "已确认" : "待确认"}
            </span>
          </div>
          <div className="mt-3 rounded-lg border border-white/90 bg-background/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black">入院相关确认</p>
              <span className="text-sm font-black text-primary">
                {completedConfirmations}/{allConfirmationItems.length}
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-primary/12">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${confirmationPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="mobile-shell grid gap-2 lg:max-w-none">
        {quickConfirmRows.map((item) => (
          <HospitalQuickRow item={item} key={item.title} />
        ))}
      </section>

      <section className="mobile-shell grid gap-3 lg:max-w-none lg:grid-cols-[1.15fr_0.85fr]">
        <QuestionSection
          description="点开每一项记录医院答复，确认后会同步影响清单状态。"
          icon={ClipboardList}
          items={nextCheckupItems}
          grouped
          title="下次产检要问"
          answersByItemId={answersByItemId}
          onChange={updateHospitalAnswer}
        />
        <QuestionSection
          description="路线、电话、停车和证件包，是爸爸临近入院前要落实的行动。"
          icon={Hospital}
          items={dadConfirmItems}
          title="爸爸要确认"
          answersByItemId={answersByItemId}
          onChange={updateHospitalAnswer}
        />
      </section>

      <details className="mobile-shell macaron-panel p-4 lg:max-w-none">
        <summary className="cursor-pointer text-base font-bold">
          高级设置
        </summary>
        <div className="mt-3">
          <AdvancedSettings
            customHospital={customHospital}
            documentsOverride={documentsOverride}
            manualProvidedIds={activeProfile.hospitalProvidedItemIds}
            notesOverride={notesOverride}
            profileHospitalMode={activeProfile.hospitalMode}
            providedOverride={providedOverride}
            onCustomHospitalChange={setCustomHospital}
            onDocumentsOverrideChange={setDocumentsOverride}
            onHospitalModeChange={(value) =>
              updateProfile({
                hospitalMode: value.hospitalMode,
                hospitalId: value.hospitalId,
              })
            }
            onManualProvidedToggle={toggleProvidedItem}
            onNotesOverrideChange={setNotesOverride}
            onProvidedOverrideChange={setProvidedOverride}
            onSaveCustomHospital={saveCustomHospital}
            onSaveOverride={saveOverride}
            hospitalSelectorValue={{
              hospitalMode: activeProfile.hospitalMode,
              hospitalId: activeProfile.hospitalId,
            }}
          />
        </div>
      </details>

      <DisclaimerBox />
    </div>
  );
}

function QuestionSection({
  answersByItemId,
  description,
  grouped = false,
  icon: Icon,
  items,
  onChange,
  title,
}: {
  answersByItemId: Map<string, HospitalAnswer>;
  description: string;
  grouped?: boolean;
  icon: LucideIcon;
  items: HospitalQuestionCardInput[];
  onChange: (answer: HospitalAnswer) => void;
  title: string;
}) {
  const groupedItems = grouped
    ? (Object.keys(HOSPITAL_CONFIRMATION_GROUP_LABELS) as HospitalConfirmationGroupId[])
        .map((groupId) => ({
          groupId,
          label: HOSPITAL_CONFIRMATION_GROUP_LABELS[groupId],
          items: items.filter((item) =>
            HOSPITAL_CONFIRMATION_QUESTIONS.some(
              (question) =>
                question.id === item.id && question.groupId === groupId,
            ),
          ),
        }))
        .filter((group) => group.items.length > 0)
    : [{ groupId: "admission_flow" as const, label: "", items }];

  return (
    <Card className="macaron-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="size-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <p className="macaron-note">{description}</p>
        {items.length === 0 ? (
          <p className="soft-detail text-sm text-muted-foreground">
            暂时没有匹配的待确认事项。
          </p>
        ) : (
          groupedItems.map((group) => (
            <div className="grid gap-2" key={group.groupId}>
              {group.label ? (
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  {group.label}
                </p>
              ) : null}
              {group.items.map((item) => (
                <HospitalQuestionCard
                  answer={answersByItemId.get(item.id)}
                  item={item}
                  key={item.id}
                  onChange={onChange}
                />
              ))}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

type HospitalQuickRowInput = {
  done: boolean;
  icon: LucideIcon;
  title: string;
  tone: "mint" | "lavender" | "coral" | "amber" | "peach";
};

function HospitalQuickRow({ item }: { item: HospitalQuickRowInput }) {
  const Icon = item.icon;
  const toneClass = {
    amber: "bg-amber-soft text-amber-foreground",
    coral: "bg-coral-soft text-coral-foreground",
    lavender: "bg-lavender text-lavender-foreground",
    mint: "bg-mint text-primary",
    peach: "bg-peach text-peach-foreground",
  }[item.tone];

  return (
    <article className="app-list-row min-h-[3.25rem] bg-card/95 p-2.5">
      <span className={`app-icon-tile size-8 rounded-md ${toneClass}`}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{item.title}</span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-muted-foreground">
        {item.done ? "已确认" : "待确认"}
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </article>
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
            className={`flex items-center gap-2 rounded-lg border bg-cream/85 px-3 py-2 text-left text-sm font-semibold ${
              checked ? "border-primary bg-mint text-primary" : "border-white/80"
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
  manualProvidedIds,
  notesOverride,
  onCustomHospitalChange,
  onDocumentsOverrideChange,
  onHospitalModeChange,
  onManualProvidedToggle,
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
  manualProvidedIds: string[];
  notesOverride: string;
  onCustomHospitalChange: (hospital: HospitalProfile) => void;
  onDocumentsOverrideChange: (value: string) => void;
  onHospitalModeChange: (value: {
    hospitalMode: HospitalProfile["mode"];
    hospitalId?: string;
  }) => void;
  onManualProvidedToggle: (id: string) => void;
  onNotesOverrideChange: (value: string) => void;
  onProvidedOverrideChange: (value: string) => void;
  onSaveCustomHospital: () => void;
  onSaveOverride: () => void;
  profileHospitalMode: HospitalProfile["mode"];
  providedOverride: string;
}) {
  return (
    <div className="grid gap-3">
      <Card className="macaron-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="size-5 text-primary" />
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
        <Card className="macaron-panel">
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
        <Card className="macaron-panel">
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
        <Card className="macaron-panel">
          <CardContent className="p-4 text-sm leading-6 text-muted-foreground">
            暂未确定医院时，DadKit 会保留医院相关待确认事项。确定医院后，可以在这里选择模板或填写自定义医院。
          </CardContent>
        </Card>
      )}

      <Card className="macaron-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="size-5 text-primary" />
            手动医院提供标记
          </CardTitle>
        </CardHeader>
        <CardContent>
          <details className="soft-detail">
            <summary className="cursor-pointer text-sm font-semibold">
              高级：手动标记医院已确认提供的物品
            </summary>
            <div className="mt-3 grid gap-3">
              <p className="text-sm leading-6 text-muted-foreground">
                通常不需要手动勾选，建议直接在“下次产检要问”里记录医院答复。
              </p>
              <ManualProvidedPicker
                selectedIds={manualProvidedIds}
                onToggle={onManualProvidedToggle}
              />
            </div>
          </details>
        </CardContent>
      </Card>
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
