import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "清单设置 | DadKit",
  description: "调整清单显示方式，补回通用物品或安全重建清单。",
};

export default function ChecklistSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
