"use client";

import { Switch } from "@/components/ui/switch";

type SettingToggleRowProps = {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
};

export function SettingToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  id,
}: SettingToggleRowProps) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 rounded-inset bg-card px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-[13px] leading-4 text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        aria-label={title}
        checked={checked}
        id={id}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
