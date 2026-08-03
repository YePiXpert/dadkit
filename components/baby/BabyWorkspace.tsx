"use client";

import { Baby } from "lucide-react";
import { useEffect, useState } from "react";

import { BabyDashboard } from "@/components/baby/BabyDashboard";
import { BabyProfileDialog } from "@/components/baby/BabyProfileDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { showAppToast } from "@/lib/app-toast";
import { hasBabyMode } from "@/lib/baby/portable";
import { useBabyStore } from "@/lib/baby/store";
import { useHouseholdStore } from "@/lib/household/store";

export function BabyWorkspace() {
  const hydrate = useBabyStore((state) => state.hydrate);
  const hydrated = useBabyStore((state) => state.hydrated);
  const loading = useBabyStore((state) => state.loading);
  const profile = useBabyStore((state) => state.profile);
  const repositoryError = useBabyStore((state) => state.repositoryError);
  const clearAllBabyData = useBabyStore((state) => state.clearAllBabyData);
  const [profileOpen, setProfileOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const hydrateHousehold = useHouseholdStore((state) => state.hydrate);

  useEffect(() => { void hydrate(); hydrateHousehold(); }, [hydrate, hydrateHousehold]);

  if (!hydrated || loading) return <BabyWorkspaceSkeleton />;

  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-4">
        {repositoryError && !hasBabyMode(profile) ? (
          <div className="grid gap-3 rounded-card bg-card p-5 shadow-sm"><h1 className="text-lg font-bold">宝宝记录暂不可用</h1><p className="text-sm text-muted-foreground">{repositoryError}</p><p className="text-sm">DadKit 不会静默退回 localStorage，以免让你误以为记录已经保存。</p><Button onClick={() => window.location.reload()} variant="outline">重新尝试</Button></div>
        ) : hasBabyMode(profile) ? (
          <BabyDashboard onEditProfile={() => setProfileOpen(true)} />
        ) : (
          <>
            <PageHeader kicker="出生后启用" subtitle="宝宝出生后，可以在这里记录喂养、尿布和睡眠。" title="宝宝记录" />
            <EmptyState
              action={<Button onClick={() => setProfileOpen(true)}>宝宝已出生，开始记录</Button>}
              description="填写出生日期即可开始记录；不会清空待产清单、医院档案、准备出发或家庭分工。"
              icon={Baby}
              title="宝宝已出生？"
            />
          </>
        )}

        {hasBabyMode(profile) ? <Button className="justify-self-start text-destructive hover:text-destructive" onClick={() => setClearOpen(true)} variant="ghost">清空全部宝宝资料和记录</Button> : null}
        <footer className="px-3 pb-4 text-center text-xs leading-5 text-muted-foreground">本功能仅用于个人记录，不用于判断宝宝是否喂养充足、睡眠正常或是否需要就医。出现健康问题请联系医生。</footer>
      </section>

      <BabyProfileDialog onOpenChange={setProfileOpen} open={profileOpen} profile={profile} />
      <ConfirmDialog
        confirmLabel="清空全部宝宝数据"
        description="宝宝昵称、出生资料、全部喂养、吸奶、尿布、睡眠记录和活动计时都会清空；旧设备不能让旧记录重新出现。待产清单、医院档案和家庭分工不受影响。"
        onConfirm={() => { void clearAllBabyData().then((result) => showAppToast({ message: result.ok ? "宝宝资料和照护记录已清空。" : result.message ?? "清空失败。", tone: result.ok ? "success" : "warning" })); }}
        onOpenChange={setClearOpen}
        open={clearOpen}
        title="确认清空全部宝宝资料和记录？"
        variant="destructive"
      />
    </div>
  );
}

export function BabyWorkspaceSkeleton() {
  return <div className="page-shell page-shell-with-nav" aria-label="正在读取宝宝资料和照护记录"><section className="mobile-shell grid gap-4"><Skeleton className="h-32 rounded-card" /><Skeleton className="h-20 rounded-card" /><Skeleton className="h-64 rounded-card" /></section></div>;
}
