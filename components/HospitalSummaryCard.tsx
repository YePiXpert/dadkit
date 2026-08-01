"use client";

import Link from "next/link";
import { Building2, Copy, MapPin, Phone } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { HOSPITAL_PATH } from "@/lib/app-routes";
import { showAppToast } from "@/lib/app-toast";
import {
  getHospitalDepartureSummary,
  isHospitalProfileConfigured,
} from "@/lib/hospital/selectors";
import { useHospitalProfileStore } from "@/lib/hospital/store";
import { hospitalTelHref } from "@/lib/hospital/validation";

export function HospitalSummaryCard() {
  const hydrated = useHospitalProfileStore((state) => state.hydrated);
  const hydrate = useHospitalProfileStore((state) => state.hydrate);
  const profile = useHospitalProfileStore((state) => state.profile);
  const [copyFallback, setCopyFallback] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <div className="h-36 animate-pulse rounded-card bg-muted" />;
  }

  const configured = isHospitalProfileConfigured(profile);
  const fields = profile.fields;
  const hospitalTitle = [fields.hospitalName.value, fields.campusName.value]
    .filter(Boolean)
    .join(" · ");
  const summary = getHospitalDepartureSummary(profile);

  async function copyAddress() {
    const address = fields.address.value;

    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopyFallback("");
      showAppToast({ message: "医院地址已复制。", tone: "success" });
    } catch {
      setCopyFallback(address);
      window.requestAnimationFrame(() => {
        (
          document.getElementById(
            "hospital-summary-copy-fallback",
          ) as HTMLTextAreaElement | null
        )?.select();
      });
    }
  }

  return (
    <section className="grid gap-3 rounded-card border border-primary/20 bg-card p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="icon-tile size-11">
          <Building2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="section-kicker">生产医院</p>
          <h2 className="mt-1 break-words text-base font-semibold">
            {configured ? hospitalTitle : "还没有填写医院档案"}
          </h2>
          {!configured ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              补充医院地址、电话和入院位置，出发时更方便。
            </p>
          ) : null}
        </div>
      </div>

      {configured ? (
        <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
          {fields.address.value ? (
            <p className="flex min-w-0 items-start gap-2">
              <MapPin className="mt-1 size-4 shrink-0" />
              <span className="min-w-0 break-words">{fields.address.value}</span>
            </p>
          ) : null}
          {fields.maternityPhone.value ? (
            <p className="break-words">产科/住院：{fields.maternityPhone.value}</p>
          ) : null}
          {fields.emergencyPhone.value ? (
            <p className="break-words">急诊：{fields.emergencyPhone.value}</p>
          ) : null}
          {summary ? <p className="break-words">出发提示：{summary}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`${HOSPITAL_PATH}?from=departure`}>
            {configured ? "查看医院档案" : "填写医院档案"}
          </Link>
        </Button>
        {configured && fields.address.value ? (
          <Button
            aria-label="复制医院地址"
            onClick={copyAddress}
            size="sm"
            variant="ghost"
          >
            <Copy />
            复制地址
          </Button>
        ) : null}
        {configured && fields.maternityPhone.value ? (
          <Button asChild size="sm" variant="ghost">
            <a
              aria-label="拨打产科或住院电话"
              href={hospitalTelHref(fields.maternityPhone.value)}
            >
              <Phone />
              拨打电话
            </a>
          </Button>
        ) : null}
      </div>

      {copyFallback ? (
        <div className="grid gap-1">
          <label
            className="text-xs text-muted-foreground"
            htmlFor="hospital-summary-copy-fallback"
          >
            浏览器未授权复制，请手动复制：
          </label>
          <textarea
            className="min-h-20 w-full rounded-xl border border-border bg-background p-3 text-base"
            id="hospital-summary-copy-fallback"
            readOnly
            value={copyFallback}
          />
        </div>
      ) : null}
    </section>
  );
}
