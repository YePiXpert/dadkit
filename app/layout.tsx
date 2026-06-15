import type { Metadata, Viewport } from "next";

import { AppHeader } from "@/components/AppHeader";
import { MobileNav } from "@/components/MobileNav";
import { StoreHydrator } from "@/components/StoreHydrator";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "DadKit 待产包",
  description:
    "根据预产期、地区、医院和生产方式生成的本地优先待产包清单工具。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DadKit",
  },
};

export const viewport: Viewport = {
  themeColor: "#247A73",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <StoreHydrator />
        <PwaRegister />
        <AppHeader />
        <main>{children}</main>
        <MobileNav />
      </body>
    </html>
  );
}
