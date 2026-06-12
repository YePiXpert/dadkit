"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ClipboardList, Hospital, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getHospitalAnswerOptions } from "@/lib/hospital/answers";
import { cn } from "@/lib/utils";
import {
  HOSPITAL_ANSWER_LABELS,
  type ChecklistItem,
  type HospitalAnswer,
  type HospitalAnswerStatus,
  type PackStatus,
} from "@/lib/types";

export type HospitalQuestionCardInput = {
  id: string;
  name: string;
  note?: string;
  kind: "question" | "task";
  answerType?: "provided_item" | "confirmation";
};

type HospitalQuestionCardProps = {
  item: HospitalQuestionCardInput | ChecklistItem;
  answer?: HospitalAnswer;
  onChange: (answer: HospitalAnswer) => void;
};

const STATUS_BADGE_CLASSES: Record<HospitalAnswerStatus, string> = {
  todo: "border-white/80 bg-cream text-muted-foreground",
  confirmed: "border-primary/20 bg-mint text-primary",
  provided: "border-primary/20 bg-mint text-primary",
  not_provided: "border-amber/40 bg-amber-soft text-amber-foreground",
  partial: "border-amber/40 bg-amber-soft text-amber-foreground",
  not_needed: "border-white/80 bg-lavender text-lavender-foreground",
};

function statusFromPackStatus(status: PackStatus): HospitalAnswerStatus {
  if (status === "hospital_provided") {
    return "provided";
  }

  if (status === "packed") {
    return "confirmed";
  }

  if (status === "not_needed") {
    return "not_needed";
  }

  return "todo";
}

function normalizeInput(
  item: HospitalQuestionCardInput | ChecklistItem,
): HospitalQuestionCardInput & { status?: PackStatus } {
  if ("kind" in item) {
    return item;
  }

  return {
    id: item.id,
    name: item.name,
    note: item.note,
    kind: item.itemKind === "task" ? "task" : "question",
    status: item.status,
  };
}

function getStatusLabel(status: HospitalAnswerStatus, kind: "question" | "task") {
  if (kind === "task") {
    if (status === "todo") {
      return "待确认";
    }

    if (status === "not_needed") {
      return "不适用";
    }

    return "已确认";
  }

  return HOSPITAL_ANSWER_LABELS[status];
}

export function HospitalQuestionCard({
  answer,
  item,
  onChange,
}: HospitalQuestionCardProps) {
  const normalizedItem = useMemo(() => normalizeInput(item), [item]);
  const initialStatus =
    answer?.status ?? statusFromPackStatus(normalizedItem.status ?? "todo");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<HospitalAnswerStatus>(initialStatus);
  const [note, setNote] = useState(answer?.note ?? "");
  const options = useMemo(
    () => getHospitalAnswerOptions(normalizedItem),
    [normalizedItem],
  );
  const savedStatus =
    answer?.status ?? statusFromPackStatus(normalizedItem.status ?? "todo");
  const previewNote = answer?.note?.trim();

  useEffect(() => {
    setStatus(answer?.status ?? statusFromPackStatus(normalizedItem.status ?? "todo"));
    setNote(answer?.note ?? "");
  }, [answer, normalizedItem.status]);

  function saveAnswer(nextStatus = status, nextNote = note) {
    onChange({
      itemId: normalizedItem.id,
      name: normalizedItem.name,
      status: nextStatus,
      note: nextNote.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
    setOpen(false);
  }

  function chooseStatus(nextStatus: HospitalAnswerStatus) {
    setStatus(nextStatus);
    saveAnswer(nextStatus, note);
  }

  return (
    <section className="rounded-lg border border-white/90 bg-card/95 shadow-sm">
      <div className="flex w-full items-start justify-between gap-3 px-3 py-3">
        <span className="flex min-w-0 gap-3">
          <span className="app-icon-tile size-9 rounded-md">
            {normalizedItem.kind === "task" ? (
              <Hospital className="size-4" />
            ) : (
              <ClipboardList className="size-4" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-5">
              {normalizedItem.name}
            </span>
            {previewNote ? (
              <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                {previewNote}
              </span>
            ) : normalizedItem.note ? (
              <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                {normalizedItem.note}
              </span>
            ) : null}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold",
            STATUS_BADGE_CLASSES[savedStatus],
          )}
        >
          {getStatusLabel(savedStatus, normalizedItem.kind)}
        </span>
      </div>

      <div className="grid gap-3 px-3 pb-3">
        <div
          aria-label={`${normalizedItem.name}状态`}
          className="flex flex-wrap gap-2"
        >
          {options.map((option) => (
            <button
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors",
                status === option
                  ? STATUS_BADGE_CLASSES[option]
                  : "border-white/80 bg-cream/70 text-muted-foreground",
              )}
              key={option}
              type="button"
              onClick={() => chooseStatus(option)}
            >
              {status === option ? <Check className="size-3.5" /> : null}
              {getStatusLabel(option, normalizedItem.kind)}
            </button>
          ))}
        </div>

        <button
          className="flex items-center justify-between rounded-lg border border-white/80 bg-peach/55 px-3 py-2 text-sm font-semibold text-primary"
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          <span>{previewNote ? "修改记录" : "补充记录"}</span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>

        {open ? (
          <div className="grid gap-3 border-t border-white/80 pt-3">
            <Textarea
              className="min-h-24 resize-y"
              placeholder="记录医院答复、电话、入口、时间或需要下次再问的细节"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <div className="flex justify-end">
              <Button className="shrink-0" size="sm" onClick={() => saveAnswer()}>
                <Save className="size-4" />
                保存
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
