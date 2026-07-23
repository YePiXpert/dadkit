"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarClock,
  ClipboardList,
  Hospital,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BIRTH_PLAN_ADMISSION_FIELDS } from "@/lib/labor-guide";
import type { BirthPlan } from "@/lib/rc";

type GoAdmissionInfoCardProps = {
  birthPlan: BirthPlan;
  hasAnyAdmissionInfo: boolean;
  onUpdate: (patch: Partial<BirthPlan>) => void;
};

export function GoAdmissionInfoCard({
  birthPlan,
  hasAnyAdmissionInfo,
  onUpdate,
}: GoAdmissionInfoCardProps) {
  const phoneHref = buildPhoneHref(birthPlan.hospitalPhone);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Hospital className="size-4 text-primary" />
          联系医院和入院路线
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-2 rounded-lg bg-secondary/50 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary">先确认，再出发</p>
              <p className="mt-1 break-words text-sm leading-5 text-muted-foreground">
                打电话时说明孕周、临产信号、破水/见红/胎动情况和当前位置。
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {phoneHref ? (
                <Button asChild className="h-10 px-4">
                  <a href={phoneHref}>
                    <Hospital className="size-4" />
                    拨打
                  </a>
                </Button>
              ) : (
                <Button className="h-10 px-4" disabled>
                  <Hospital className="size-4" />
                  拨打
                </Button>
              )}
              <Button asChild className="h-10 px-4" variant="outline">
                <Link href="/contractions#labor-alerts">
                  <CalendarClock className="size-4" />
                  信号记录
                </Link>
              </Button>
            </div>
          </div>

          {!hasAnyAdmissionInfo ? (
            <p className="rounded-md border border-border bg-card px-2 py-1.5 text-xs leading-5 text-muted-foreground">
              补充电话、入口和停车备注，出发时可直接查看。
            </p>
          ) : null}
        </div>

        <div className="grid gap-3">
          <Field label="医院电话" htmlFor="go-hospital-phone">
            <Input
              id="go-hospital-phone"
              inputMode="tel"
              placeholder="产科 / 住院部 / 急诊电话"
              value={birthPlan.hospitalPhone}
              onChange={(event) => onUpdate({ hospitalPhone: event.target.value })}
            />
          </Field>

          {BIRTH_PLAN_ADMISSION_FIELDS.map((field) => (
            <Field htmlFor={`go-${field.key}`} key={field.key} label={field.label}>
              {field.multiline ? (
                <Textarea
                  id={`go-${field.key}`}
                  placeholder={field.placeholder}
                  value={birthPlan[field.key]}
                  onChange={(event) => onUpdate({ [field.key]: event.target.value })}
                />
              ) : (
                <Input
                  id={`go-${field.key}`}
                  placeholder={field.placeholder}
                  value={birthPlan[field.key]}
                  onChange={(event) => onUpdate({ [field.key]: event.target.value })}
                />
              )}
            </Field>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <AdmissionHint icon={Hospital} label="地址" value={birthPlan.hospitalAddress} />
          <AdmissionHint
            icon={CalendarClock}
            label="夜间"
            value={birthPlan.nightEntranceNotes}
          />
          <AdmissionHint
            icon={ClipboardList}
            label="停车"
            value={birthPlan.parkingNotes}
          />
        </div>
      </CardContent>
    </Card>
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

function AdmissionHint({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="size-3.5 text-primary" />
        {label}
      </div>
      <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
        {value.trim() || "待填写"}
      </p>
    </div>
  );
}

function buildPhoneHref(value: string) {
  const phone = value.replace(/[^\d+]/g, "");

  return phone ? `tel:${phone}` : "";
}
