import type { Metadata } from "next";

import { GrowthWorkspace } from "@/components/GrowthWorkspace";

export const metadata: Metadata = {
  title: "宝宝成长记 · DadKit",
  description: "孕 8–40 周的宝宝成长、大小参考与常见产检提醒。",
  openGraph: {
    title: "宝宝成长记 · DadKit",
    description: "按孕周查看宝宝成长参考，并和家人一起准备待产包。",
    images: [
      {
        url: "/og-growth.png",
        width: 1200,
        height: 630,
        alt: "孕期成长记与待产准备插画",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-growth.png"],
  },
};

export default function GrowthPage() {
  return <GrowthWorkspace />;
}
