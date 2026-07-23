import type { Metadata, Viewport } from "next";

import { AppHeader } from "@/components/AppHeader";
import { MobileNav } from "@/components/MobileNav";
import { StoreHydrator } from "@/components/StoreHydrator";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "DadKit 待产准备",
  description:
    "围绕医院确认、核心待产包、临出门沟通卡和产后提醒生成的本地优先待产准备工具。",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DadKit",
  },
};

export const viewport: Viewport = {
  themeColor: "#EA5371",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
