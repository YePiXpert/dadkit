"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { HomeHeroIllustration } from "@/components/HomeHeroIllustration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showAppToast } from "@/lib/app-toast";
import { useBabyStore } from "@/lib/baby/store";
import type { BabySex } from "@/lib/baby/types";
import { useDeviceIdentityStore } from "@/lib/device-identity/store";
import { loadDeviceIdentity, saveDeviceIdentity } from "@/lib/device-identity/repository";
import { useGrowthStore } from "@/lib/growth-store";
import { applyImportDataAsync, buildLatestPortableData } from "@/lib/storage";

type UsageMode = "checklist" | "baby" | "both" | "unsure";

export function OnboardingWorkspace() {
  const router = useRouter();
  const setPreferredEntry = useDeviceIdentityStore((state) => state.setPreferredEntry);
  const completeOnboarding = useDeviceIdentityStore((state) => state.completeOnboarding);
  const hydrateIdentity = useDeviceIdentityStore((state) => state.hydrate);
  const saveBabyProfile = useBabyStore((state) => state.saveProfile);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<UsageMode>("unsure");
  const [nickname, setNickname] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [sex, setSex] = useState<BabySex>("unspecified");
  const [saving, setSaving] = useState(false);
  const totalSteps = 4;
  const needsBaby = mode === "baby" || mode === "both";
  const needsChecklist = mode === "checklist" || mode === "both";
  const canContinue = step !== 2 || !needsBaby || Boolean(birthDate);

  useEffect(() => {
    hydrateIdentity();
  }, [hydrateIdentity]);

  function skipOnboarding() {
    const result = completeOnboarding();
    if (!result.ok) {
      showAppToast({
        message: result.message ?? "暂时无法保存设置，请重试。",
        tone: "warning",
      });
      return;
    }
    router.replace("/");
  }

  async function finish() {
    setSaving(true);
    const previousIdentity = loadDeviceIdentity();
    let previousData: Awaited<ReturnType<typeof buildLatestPortableData>> | undefined;
    try {
      previousData = await buildLatestPortableData();
      if (needsChecklist) {
        useGrowthStore.getState().hydrate();
        useGrowthStore.getState().setNickname(nickname);
        useGrowthStore.getState().setDueDate(dueDate);
      }
      if (needsBaby) {
        const result = await saveBabyProfile({ nickname, birthDate, birthTime, sex });
        if (!result.ok) throw new Error(result.message ?? "宝宝资料保存失败。");
      }
      const entryResult = setPreferredEntry(mode === "baby" ? "baby" : mode === "checklist" ? "checklist" : "auto");
      if (!entryResult.ok) throw new Error(entryResult.message);
      const completionResult = completeOnboarding();
      if (!completionResult.ok) throw new Error(completionResult.message);
      router.replace(mode === "baby" ? "/baby" : "/");
    } catch (error) {
      let rolledBack = true;
      if (previousData) {
        const rollback = await applyImportDataAsync(previousData);
        rolledBack = rollback.ok;
      }
      try {
        saveDeviceIdentity(previousIdentity);
        useDeviceIdentityStore.setState({ ...previousIdentity, hydrated: true });
      } catch {
        rolledBack = false;
      }
      const reason = error instanceof Error ? error.message : "设置保存失败。";
      showAppToast({
        message: rolledBack
          ? `${reason} 已恢复保存前数据，草稿仍保留。`
          : `${reason} 本地数据无法完整回滚，请先导出备份再重试。`,
        tone: "warning",
      });
      setSaving(false);
    }
  }

  const title = ["欢迎使用 DadKit", "你现在更需要什么？", "阶段资料", "准备完成"][step];
  return <div className="page-shell"><section className="mobile-shell grid min-h-[calc(100dvh-5rem)] content-center gap-5 sm:max-w-[42rem]"><header className="grid gap-2 text-center"><p className="text-sm font-semibold text-primary">首次设置 · {step + 1}/{totalSteps}</p><div aria-hidden className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} /></div><h1 className="text-2xl font-bold sm:text-[28px]">{title}</h1></header><section className="grid gap-4 rounded-card bg-card p-5 shadow-sm">{step === 0 ? <><HomeHeroIllustration className="mx-auto w-28 sm:w-32" /><p className="text-sm leading-7 text-muted-foreground">从待产准备到宝宝出生后的家庭记录，数据优先保存在你的设备中。</p><Button onClick={() => setStep(1)}>开始设置</Button><div className="grid gap-2 sm:grid-cols-3"><Button asChild variant="outline"><Link href="/settings/backup">导入备份</Link></Button><Button asChild variant="outline"><Link href="/join">加入家庭</Link></Button><Button asChild variant="outline"><Link href="/settings/sync">创建同步</Link></Button></div><Button onClick={skipOnboarding} variant="ghost">暂时跳过</Button></> : null}{step === 1 ? <div className="grid gap-2">{([['checklist','正在准备待产'],['baby','宝宝已经出生'],['both','两个阶段都需要'],['unsure','暂时不确定']] as const).map(([value,label]) => <button aria-pressed={mode === value} className={`min-h-12 rounded-inset px-4 text-left text-sm font-semibold transition-colors ${mode === value ? "bg-secondary text-primary shadow-sm ring-1 ring-primary/40" : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`} key={value} onClick={() => setMode(value)} type="button">{label}</button>)}</div> : null}{step === 2 ? <><div className="grid gap-2"><Label htmlFor="onboarding-nickname">宝宝昵称（可选）</Label><Input id="onboarding-nickname" maxLength={40} onChange={(event) => setNickname(event.target.value)} value={nickname} /></div>{needsChecklist ? <div className="grid gap-2"><Label htmlFor="onboarding-due-date">预产期（可选）</Label><Input id="onboarding-due-date" onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} /></div> : null}{needsBaby ? <><div className="grid gap-2"><Label htmlFor="onboarding-birth-date">出生日期 *</Label><Input aria-invalid={!birthDate} id="onboarding-birth-date" onChange={(event) => setBirthDate(event.target.value)} type="date" value={birthDate} /></div><div className="grid gap-2"><Label htmlFor="onboarding-birth-time">出生时间（可选）</Label><Input id="onboarding-birth-time" onChange={(event) => setBirthTime(event.target.value)} type="time" value={birthTime} /></div><div className="grid gap-2"><Label htmlFor="onboarding-sex">性别（可选）</Label><Select value={sex} onValueChange={(value) => setSex(value as BabySex)}><SelectTrigger id="onboarding-sex"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unspecified">暂不填写</SelectItem><SelectItem value="boy">男宝宝</SelectItem><SelectItem value="girl">女宝宝</SelectItem></SelectContent></Select></div></> : null}</> : null}{step === 3 ? <div className="grid gap-3 text-sm"><p>使用目的：{mode === "checklist" ? "准备待产" : mode === "baby" ? "宝宝记录" : mode === "both" ? "两个阶段" : "暂不确定"}</p><Button disabled={saving} onClick={() => void finish()}>{saving ? "正在保存…" : "完成设置"}</Button></div> : null}</section>{step > 0 && step < 3 ? <div className="grid grid-cols-2 gap-3"><Button onClick={() => setStep(step - 1)} variant="outline">返回</Button><Button disabled={!canContinue} onClick={() => setStep(step + 1)}>继续</Button></div> : null}{step === 3 ? <Button onClick={() => setStep(2)} variant="ghost">返回修改</Button> : null}</section></div>;
}
