import type { Metadata } from "next";

import { JoinSyncWorkspace } from "@/components/sync/JoinSyncWorkspace";

export const metadata: Metadata = {
  title: "加入家庭同步 | DadKit",
  description: "通过私密邀请加入家庭同步。",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function JoinPage() {
  return <JoinSyncWorkspace />;
}
