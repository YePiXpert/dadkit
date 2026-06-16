"use client";

import type { ReactNode } from "react";
import { ClipboardList, Save } from "lucide-react";

import { ExportTextArea } from "@/components/ExportTextArea";
import { PageIntro } from "@/components/PageIntro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BIRTH_PLAN_ADMISSION_FIELDS,
  BIRTH_PLAN_LONG_FIELDS,
  BIRTH_PLAN_SHORT_FIELDS,
  PARTNER_SUPPORT_ACTIONS,
} from "@/lib/labor-guide";
import { generateBirthPlanShareText, type BirthPlan } from "@/lib/rc";
import { useDadKitStore } from "@/lib/store";

export default function BirthPlanPage() {
  const birthPlan = useDadKitStore((state) => state.birthPlan);
  const saveBirthPlan = useDadKitStore((state) => state.saveBirthPlan);
  const exportText = generateBirthPlanShareText(birthPlan);

  function updateField(key: keyof BirthPlan, value: string) {
    saveBirthPlan({ [key]: value });
  }

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="沟通小抄"
        title="分娩偏好卡"
        description="这不是医疗建议，只是一张方便爸爸、护士和医生快速沟通的信息卡。"
      />

      <section className="mobile-shell grid gap-3 lg:max-w-none lg:grid-cols-[1fr_0.9fr]">
        <Card className="macaron-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4 text-primary" />
              入院沟通信息
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {BIRTH_PLAN_SHORT_FIELDS.map((field) => (
                <Field
                  htmlFor={`birth-plan-${field.key}`}
                  key={field.key}
                  label={field.label}
                >
                  <Input
                    id={`birth-plan-${field.key}`}
                    placeholder={field.placeholder}
                    value={birthPlan[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                  />
                </Field>
              ))}
            </div>

            <div className="grid gap-3">
              {BIRTH_PLAN_ADMISSION_FIELDS.map((field) => (
                <Field
                  htmlFor={`birth-plan-${field.key}`}
                  key={field.key}
                  label={field.label}
                >
                  {field.multiline ? (
                    <Textarea
                      id={`birth-plan-${field.key}`}
                      placeholder={field.placeholder}
                      value={birthPlan[field.key]}
                      onChange={(event) => updateField(field.key, event.target.value)}
                    />
                  ) : (
                    <Input
                      id={`birth-plan-${field.key}`}
                      placeholder={field.placeholder}
                      value={birthPlan[field.key]}
                      onChange={(event) => updateField(field.key, event.target.value)}
                    />
                  )}
                </Field>
              ))}
            </div>

            {BIRTH_PLAN_LONG_FIELDS.map((field) => (
              <Field
                htmlFor={`birth-plan-${field.key}`}
                key={field.key}
                label={field.label}
              >
                <Textarea
                  id={`birth-plan-${field.key}`}
                  placeholder={field.placeholder}
                  value={birthPlan[field.key]}
                  onChange={(event) => updateField(field.key, event.target.value)}
                />
              </Field>
            ))}

            <p className="macaron-note inline-flex items-center gap-2">
              <Save className="size-4" />
              已自动保存到当前浏览器。
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-3">
          <Card className="macaron-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-4 text-primary" />
                陪产协助小抄
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {PARTNER_SUPPORT_ACTIONS.map((action) => (
                <div className="soft-detail" key={action.title}>
                  <p className="text-sm font-bold">{action.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="macaron-panel">
            <CardHeader>
              <CardTitle>复制 / 导出沟通卡</CardTitle>
            </CardHeader>
            <CardContent>
              <ExportTextArea value={exportText} />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
