"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Save } from "lucide-react";

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

type HospitalQuestionCardProps = {
  item: ChecklistItem;
  answer?: HospitalAnswer;
  onChange: (answer: HospitalAnswer) => void;
};

const STATUS_BADGE_CLASSES: Record<HospitalAnswerStatus, string> = {
  todo: "border-border bg-muted text-muted-foreground",
  confirmed: "border-primary/20 bg-secondary text-primary",
  provided: "border-primary/20 bg-secondary text-primary",
  not_provided: "border-amber/40 bg-amber-soft text-amber-foreground",
  partial: "border-amber/40 bg-amber-soft text-amber-foreground",
  not_needed: "border-border bg-muted text-muted-foreground",
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

export function HospitalQuestionCard({
  answer,
  item,
  onChange,
}: HospitalQuestionCardProps) {
  const initialStatus = answer?.status ?? statusFromPackStatus(item.status);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<HospitalAnswerStatus>(initialStatus);
  const [note, setNote] = useState(answer?.note ?? "");
  const options = useMemo(() => getHospitalAnswerOptions(item), [item]);
  const savedStatus = answer?.status ?? statusFromPackStatus(item.status);
  const previewNote = answer?.note?.trim();

  useEffect(() => {
    setStatus(answer?.status ?? statusFromPackStatus(item.status));
    setNote(answer?.note ?? "");
  }, [answer, item.status]);

  function saveAnswer() {
    onChange({
      itemId: item.id,
      name: item.name,
      status,
      note: note.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
    setOpen(false);
  }

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <button
        className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-5">{item.name}</span>
          {previewNote ? (
            <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
              {previewNote}
            </span>
          ) : item.note ? (
            <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
              {item.note}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded-md border px-2 py-1 text-xs font-medium",
              STATUS_BADGE_CLASSES[savedStatus],
            )}
          >
            {HOSPITAL_ANSWER_LABELS[savedStatus]}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      {open ? (
        <div className="grid gap-3 border-t border-border px-3 pb-3 pt-3">
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
                  status === option
                    ? STATUS_BADGE_CLASSES[option]
                    : "border-border bg-background text-muted-foreground",
                )}
                key={option}
                type="button"
                onClick={() => setStatus(option)}
              >
                {status === option ? <Check className="size-3.5" /> : null}
                {HOSPITAL_ANSWER_LABELS[option]}
              </button>
            ))}
          </div>
          <Textarea
            className="min-h-24 resize-y"
            placeholder="记录医院答复、电话、入口、时间或需要下次再问的细节"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex justify-end">
            <Button className="shrink-0" size="sm" onClick={saveAnswer}>
              <Save className="size-4" />
              保存
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
