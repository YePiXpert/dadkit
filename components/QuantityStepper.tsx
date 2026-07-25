"use client";

import { Minus, Plus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type QuantityStepperProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
};

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

  function step(delta: number) {
    const next = Math.max(1, count + delta);
    onChange(`${next}${suffix}`);
  }

  return (
    <div
      className={cn(
        "flex h-11 items-center justify-between gap-3 rounded-full border border-input bg-card px-2",
        disabled && "opacity-50",
      )}
    >
      <button
        aria-label="减少数量"
        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none"
        disabled={disabled || count <= 1}
        type="button"
        onClick={() => step(-1)}
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
        {count}
        {suffix ? <span className="ml-0.5 text-xs font-normal text-muted-foreground">{suffix.trim()}</span> : null}
      </span>
      <button
        aria-label="增加数量"
        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none"
        disabled={disabled}
        type="button"
        onClick={() => step(1)}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
