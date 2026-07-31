"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type QuantityStepperProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
};

export function normalizeQuantityValue(value: string, suffix = "") {
  const parsed = Number(value.trim());

  if (!Number.isFinite(parsed) || parsed < 1) {
    return `1${suffix}`;
  }

  return `${Math.floor(parsed)}${suffix}`;
}

/**
 * 参考 App 的胶囊数量步进器。
 * 数量是自由文本（如「2 条」），步进器只增减前导数字并保留单位后缀；
 * 没有前导数字时退回普通输入框，避免破坏「按需」这类文本。
 */
export function QuantityStepper({
  disabled = false,
  onChange,
  value,
}: QuantityStepperProps) {
  const match = /^\s*(\d+)([\s\S]*)$/.exec(value);
  const displayedCount = match?.[1] ?? "1";
  const [draftCount, setDraftCount] = useState(displayedCount);

  useEffect(() => {
    setDraftCount(displayedCount);
  }, [displayedCount]);

  if (value !== "" && !match) {
    return (
      <Input
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  const count = match ? Number.parseInt(match[1], 10) : 1;
  const suffix = match?.[2] ?? "";

  function commitDraft() {
    const next = normalizeQuantityValue(draftCount, suffix);
    setDraftCount(/^\d+/.exec(next)?.[0] ?? "1");
    onChange(next);
  }

  function step(delta: number) {
    const current = Number.parseInt(normalizeQuantityValue(draftCount), 10);
    const next = Math.max(1, current + delta);
    setDraftCount(String(next));
    onChange(`${next}${suffix}`);
  }

  return (
    <div
      className={cn(
        "flex h-12 items-center justify-between gap-3 rounded-full border border-input bg-card px-1.5",
        disabled && "opacity-50",
      )}
    >
      <button
        aria-label="减少数量"
        className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none"
        disabled={disabled || count <= 1}
        type="button"
        onClick={() => step(-1)}
      >
        <Minus className="size-4" />
      </button>
      <label className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
        <span className="sr-only">数量</span>
        <Input
          aria-label="数量"
          className="h-10 min-w-0 max-w-14 border-0 bg-transparent px-1 text-center text-sm font-semibold tabular-nums shadow-none focus-visible:ring-1"
          disabled={disabled}
          inputMode="numeric"
          onBlur={commitDraft}
          onChange={(event) => setDraftCount(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          type="text"
          value={draftCount}
        />
        {suffix ? (
          <span className="text-xs font-normal text-muted-foreground">
            {suffix.trim()}
          </span>
        ) : null}
      </label>
      <button
        aria-label="增加数量"
        className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none"
        disabled={disabled}
        type="button"
        onClick={() => step(1)}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
