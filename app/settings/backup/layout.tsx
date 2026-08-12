import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "备份与恢复 | DadKit",
  description: "管理本机恢复点、完整 JSON、照片包与 WebDAV 备份。",
};

export default function BackupSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
