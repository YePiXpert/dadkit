"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ITEM_TILE_TONE_STYLES,
  type ItemTileTone,
} from "@/lib/presentation/item-icons";
import {
  DAD_ACTION_TASKS,
  getDadActionProgress,
  getHospitalQuestionProgress,
  HOSPITAL_CONFIRMATION_GROUP_LABELS,
  HOSPITAL_CONFIRMATION_QUESTIONS,
  type HospitalConfirmationGroupId,
} from "@/lib/hospital/confirmation-plan";
import {
  getHospitalAnswerScopeId,
  getHospitalForProfile,
  getHospitalIdForProfile,
} from "@/lib/rules";
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

function groupConfirmationStats(
  groupId: HospitalConfirmationGroupId,
  answersByItemId: Map<string, HospitalAnswer>,
) {
  const questions = HOSPITAL_CONFIRMATION_QUESTIONS.filter(
    (question) => question.groupId === groupId,
  );
  const completed = questions.filter((question) =>
    isAnswerDone(answersByItemId.get(question.id)),
  ).length;

  return {
    completed,
    total: questions.length,
  };
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
  const hospitalId = profile ? getHospitalIdForProfile(profile) : undefined;
  const hospitalAnswerScopeId = getHospitalAnswerScopeId(profile);
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
  const hospitalProgress = getHospitalQuestionProgress(hospitalAnswers);
  const dadProgress = getDadActionProgress(hospitalAnswers);
  const groupIds = Object.keys(
    HOSPITAL_CONFIRMATION_GROUP_LABELS,
  ) as HospitalConfirmationGroupId[];
  const quickConfirmRows: HospitalQuickRowInput[] = groupIds.map((groupId, index) => {
    const stats = groupConfirmationStats(groupId, answersByItemId);
    const icons = [ClipboardList, Hospital, CheckCircle2] as const;

    return {
      caption: `${stats.completed}/${stats.total} 项已确认`,
      done: stats.total > 0 && stats.completed === stats.total,
      groupId,
      icon: icons[index % icons.length],
      title: HOSPITAL_CONFIRMATION_GROUP_LABELS[groupId],
    };
  });
  const primaryPendingQuestion =
    HOSPITAL_CONFIRMATION_QUESTIONS.find(
      (question) =>
        question.homeCore && !isAnswerDone(answersByItemId.get(question.id)),
    ) ??
    HOSPITAL_CONFIRMATION_QUESTIONS.find(
      (question) => !isAnswerDone(answersByItemId.get(question.id)),
    );

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
      <section className="mobile-shell lg:max-w-none">
        <h1 className="text-xl font-semibold sm:text-2xl">医院规则</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          入院流程、医院提供物品、陪产和缴费信息提前确认
        </p>
      </section>

      <Card className="mobile-shell overflow-hidden lg:max-w-none">
        <CardContent className="p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="icon-tile size-11">
              <Hospital className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold">
                {hospital?.name ?? "暂未确定医院"}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                趁早确认，入院更从容
              </p>
            </div>
            <Badge
              className="shrink-0"
              variant={hospital ? "success" : "warning"}
            >
              {hospital ? "已确认" : "待确认"}
            </Badge>
          </div>
          <div className="mt-3 grid gap-3 rounded-lg border border-border bg-background p-3">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  医院规则 {hospitalProgress.completed}/{hospitalProgress.total}
                </p>
                <span className="text-sm font-semibold text-primary">
                  {hospitalProgress.percent}%
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${hospitalProgress.percent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  家人确认 {dadProgress.completed}/{dadProgress.total}
                </p>
                <span className="text-sm font-semibold text-primary">
                  {dadProgress.percent}%
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${dadProgress.percent}%` }}
                />
              </div>
            </div>
          </div>
          {primaryPendingQuestion ? (
            <div className="mt-3 rounded-lg border border-border bg-secondary p-3">
              <p className="text-xs font-semibold text-primary">下一项先确认</p>
              <p className="mt-1 break-words text-sm font-semibold leading-5">
                {primaryPendingQuestion.title}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <HospitalQuickGrid items={quickConfirmRows} />

      <section className="mobile-shell grid gap-3 lg:max-w-none lg:grid-cols-[1.15fr_0.85fr]">
        <QuestionSection
          description="点开每一项记录医院答复，确认后会同步影响清单状态。"
          icon={ClipboardList}
          items={nextCheckupItems}
          grouped
          title="医院规则确认表"
          answersByItemId={answersByItemId}
          onChange={(answer) =>
            updateHospitalAnswer({
              ...answer,
              hospitalId: hospitalAnswerScopeId,
            })
          }
        />
        <QuestionSection
          description="证件包、支付方式和临产异常联系流程，是家人临近入院前要落实的行动。"
          icon={Hospital}
          items={dadConfirmItems}
          title="家人要确认"
          answersByItemId={answersByItemId}
          onChange={(answer) =>
            updateHospitalAnswer({
              ...answer,
              hospitalId: hospitalAnswerScopeId,
            })
          }
        />
      </section>

      <details className="mobile-shell card-surface p-4 lg:max-w-none">
        <summary className="cursor-pointer text-sm font-semibold">
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <p className="text-sm text-muted-foreground">{description}</p>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            暂时没有匹配的待确认事项。
          </p>
        ) : (
          groupedItems.map((group) => (
            <div
              className="grid scroll-mt-24 gap-2"
              id={`hospital-confirmation-${group.groupId}`}
              key={group.groupId}
            >
              {group.label ? (
                <p className="section-kicker mt-2">
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
  caption: string;
  done: boolean;
  groupId: HospitalConfirmationGroupId;
  icon: LucideIcon;
  title: string;
};

const QUICK_GRID_TONES: ItemTileTone[] = [
  "mom",
  "docs",
  "baby",
  "dad",
  "car",
  "lastminute",
];

function HospitalQuickGrid({ items }: { items: HospitalQuickRowInput[] }) {
  return (
    <section className="mobile-shell grid grid-cols-2 gap-2 lg:max-w-none">
      {items.map((item, index) => (
        <HospitalQuickGridItem
          item={item}
          key={item.title}
          tone={QUICK_GRID_TONES[index % QUICK_GRID_TONES.length]}
        />
      ))}
    </section>
  );
}

function HospitalQuickGridItem({
  item,
  tone,
}: {
  item: HospitalQuickRowInput;
  tone: ItemTileTone;
}) {
  const Icon = item.icon;
  const toneStyle = ITEM_TILE_TONE_STYLES[tone];

  return (
    <a
      className="grid min-h-[4.5rem] min-w-0 gap-1.5 rounded-xl p-2.5 shadow-sm transition-transform active:scale-[0.98]"
      href={`#hospital-confirmation-${item.groupId}`}
      style={{ backgroundColor: toneStyle.backgroundColor }}
    >
      <span className="flex items-start justify-between gap-2">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/85"
          style={{ color: toneStyle.color }}
        >
          <Icon className="size-4" />
        </span>
        <span
          className="shrink-0 text-xs font-semibold"
          style={{ color: toneStyle.color }}
        >
          {item.done ? "已确认" : "待确认"}
        </span>
      </span>
      <span className="block break-words text-sm font-semibold leading-5">
        {item.title}
      </span>
      <span className="block break-words text-xs leading-4 text-muted-foreground">
        {item.caption}
      </span>
    </a>
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
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
              checked
                ? "border-primary bg-secondary text-primary"
                : "border-border bg-card"
            }`}
            key={id}
            type="button"
            onClick={() => onToggle(id)}
          >
            <span
              className={`flex size-5 items-center justify-center rounded-md border ${
                checked
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input"
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
        <Card>
          <CardHeader>
            <CardTitle>自定义医院信息</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>用户覆盖信息</CardTitle>
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
                placeholder="例如：最近一次产检确认的医院提供物品、陪产提醒"
              />
            </Field>
            <Button className="w-full sm:w-fit" onClick={onSaveOverride}>
              <Save className="size-4" />
              保存覆盖信息
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 text-sm leading-6 text-muted-foreground">
            暂未确定医院时，DadKit 会保留医院相关待确认事项。确定医院后，可以在这里选择模板或填写自定义医院。
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" />
            手动医院提供标记
          </CardTitle>
        </CardHeader>
        <CardContent>
          <details>
            <summary className="cursor-pointer text-sm font-semibold">
              高级：手动标记医院已确认提供的物品
            </summary>
            <div className="mt-3 grid gap-3">
              <p className="text-sm leading-6 text-muted-foreground">
                通常不需要手动勾选，建议直接在“医院规则确认表”里记录医院答复。
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
