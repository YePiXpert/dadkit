import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "关于 DadKit",
  description: "版本信息已并入“我的”设置页。",
};

export default function AboutSettingsPage() {
  redirect("/settings");
}