"use client";

import type { ReactNode } from "react";
import { ClipboardList, Save } from "lucide-react";

import { ExportTextArea } from "@/components/ExportTextArea";
import { PageIntro } from "@/components/PageIntro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateBirthPlanShareText, type BirthPlan } from "@/lib/rc";
import { useDadKitStore } from "@/lib/store";

const shortFields: Array<{
  key: keyof Pick<
    BirthPlan,
    "emergencyContact" | "supportPerson" | "hospitalPhone"
  >;
  label: string;
  placeholder: string;
}> = [
  {
    key: "emergencyContact",
    label: "紧急联系人",
    placeholder: "姓名 / 电话 / 关系",
  },
  {
    key: "supportPerson",
    label: "陪产人",
    placeholder: "陪产人姓名和联系方式",
  },
  {
    key: "hospitalPhone",
    label: "医院电话",
    placeholder: "产科 / 住院处 / 急诊电话",
  },
];

const longFields: Array<{
  key: keyof Omit<
    BirthPlan,
    "emergencyContact" | "supportPerson" | "hospitalPhone"
  >;
  label: string;
  placeholder: string;
}> = [
  {
    key: "medicationNotes",
    label: "过敏 / 长期用药备注",
    placeholder: "只写需要医护快速知道的信息。",
  },
  {
    key: "birthPreferences",
    label: "生产偏好",
    placeholder: "例如沟通节奏、爸爸协助事项等。",
  },
  {
    key: "painManagement",
    label: "疼痛管理沟通项",
    placeholder: "记录希望向医生了解的问题，不做医学判断。",
  },
  {
    key: "feedingPreference",
    label: "喂养偏好",
    placeholder: "记录希望了解或尝试的喂养支持方式。",
  },
  {
    key: "newbornCareQuestions",
    label: "新生儿护理待确认",
    placeholder: "记录疫苗、筛查、护理、陪护等待确认事项。",
  },
  {
    key: "photoVisitPreference",
    label: "拍照 / 探视偏好",
    placeholder: "记录家人探视和拍照边界。",
  },
];

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
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4 text-primary" />
              入院沟通信息
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {shortFields.map((field) => (
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

            {longFields.map((field) => (
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

            <p className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-primary">
              <Save className="size-4" />
              已自动保存到当前浏览器。
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>复制 / 导出沟通卡</CardTitle>
          </CardHeader>
          <CardContent>
            <ExportTextArea value={exportText} />
          </CardContent>
        </Card>
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
