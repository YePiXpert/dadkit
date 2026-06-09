"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hospitalTemplates } from "@/lib/templates";
import type { HospitalMode } from "@/lib/types";

type HospitalSelectorValue = {
  hospitalMode: HospitalMode;
  hospitalId?: string;
};

type HospitalSelectorProps = {
  value: HospitalSelectorValue;
  onChange: (value: HospitalSelectorValue) => void;
};

export function HospitalSelector({ value, onChange }: HospitalSelectorProps) {
  const selectValue =
    value.hospitalMode === "preset"
      ? value.hospitalId ?? "cn-bj-general-hospital"
      : value.hospitalMode;

  return (
    <Select
      value={selectValue}
      onValueChange={(nextValue) => {
        if (nextValue === "unknown" || nextValue === "custom") {
          onChange({ hospitalMode: nextValue });
          return;
        }

        onChange({ hospitalMode: "preset", hospitalId: nextValue });
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="选择生产医院" />
      </SelectTrigger>
      <SelectContent>
        {hospitalTemplates.map((hospital) => (
          <SelectItem key={hospital.hospitalId} value={hospital.hospitalId ?? ""}>
            {hospital.name}
          </SelectItem>
        ))}
        <SelectItem value="unknown">我还没确定医院</SelectItem>
        <SelectItem value="custom">自定义医院</SelectItem>
      </SelectContent>
    </Select>
  );
}
