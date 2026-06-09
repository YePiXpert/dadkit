"use client";

import type { HospitalProfile } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CustomHospitalFormProps = {
  hospital: HospitalProfile;
  onChange: (hospital: HospitalProfile) => void;
};

function linesToText(lines?: string[]) {
  return lines?.join("\n") ?? "";
}

function textToLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function CustomHospitalForm({
  hospital,
  onChange,
}: CustomHospitalFormProps) {
  return (
    <div className="grid gap-4">
      <div className="field-grid">
        <Field label="医院名称">
          <Input
            value={hospital.name ?? ""}
            onChange={(event) =>
              onChange({ ...hospital, name: event.target.value })
            }
            placeholder="例如：某某医院"
          />
        </Field>
        <Field label="城市">
          <Input
            value={hospital.city ?? ""}
            onChange={(event) =>
              onChange({ ...hospital, city: event.target.value })
            }
            placeholder="例如：北京市"
          />
        </Field>
      </div>
      <Field label="入院证件要求">
        <Textarea
          value={linesToText(hospital.requiredDocuments)}
          onChange={(event) =>
            onChange({
              ...hospital,
              requiredDocuments: textToLines(event.target.value),
            })
          }
          placeholder="每行一项"
        />
      </Field>
      <Field label="医院明确提供物品">
        <Textarea
          value={linesToText(hospital.hospitalProvidedItems)}
          onChange={(event) =>
            onChange({
              ...hospital,
              hospitalProvidedItems: textToLines(event.target.value),
            })
          }
          placeholder="每行一项；未确认请写“不确定”或留空"
        />
      </Field>
      <Field label="不建议携带物品">
        <Textarea
          value={linesToText(hospital.notAllowedItems)}
          onChange={(event) =>
            onChange({
              ...hospital,
              notAllowedItems: textToLines(event.target.value),
            })
          }
          placeholder="每行一项，未确认可写“待确认”"
        />
      </Field>
      <div className="field-grid">
        <Field label="陪产/探视备注">
          <Textarea
            value={hospital.partnerPolicyNotes ?? ""}
            onChange={(event) =>
              onChange({ ...hospital, partnerPolicyNotes: event.target.value })
            }
          />
        </Field>
        <Field label="住院押金备注">
          <Textarea
            value={hospital.paymentNotes ?? ""}
            onChange={(event) =>
              onChange({ ...hospital, paymentNotes: event.target.value })
            }
          />
        </Field>
      </div>
      <div className="field-grid">
        <Field label="停车/入院动线备注">
          <Textarea
            value={hospital.parkingNotes ?? ""}
            onChange={(event) =>
              onChange({ ...hospital, parkingNotes: event.target.value })
            }
          />
        </Field>
        <Field label="护士/医生特别提醒">
          <Textarea
            value={hospital.admissionNotes ?? ""}
            onChange={(event) =>
              onChange({ ...hospital, admissionNotes: event.target.value })
            }
          />
        </Field>
      </div>
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
