"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MigrationTransferCard = dynamic(
  () =>
    import("@/components/MigrationTransferCard").then(
      (module) => module.MigrationTransferCard,
    ),
  {
    loading: () => (
      <p className="px-5 pb-5 text-sm text-muted-foreground">
        正在加载加密迁移工具…
      </p>
    ),
    ssr: false,
  },
);

export function MigrationTransferLauncher() {
  const [open, setOpen] = useState(false);

  if (open) {
    return <MigrationTransferCard />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5" />
          加密设备迁移
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm leading-6 text-muted-foreground">
          将清单、成长记录、恢复点、显示偏好和本机照片打包为本地加密文件。
          密码、家庭同步 token 和站点地址不会写入迁移包。
        </p>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          打开迁移工具
        </Button>
      </CardContent>
    </Card>
  );
}
