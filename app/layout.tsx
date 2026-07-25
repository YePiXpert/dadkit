import type { Metadata, Viewport } from "next";

import { AppHeader } from "@/components/AppHeader";
import { MobileNav } from "@/components/MobileNav";
import { StoreHydrator } from "@/components/StoreHydrator";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

function getMetadataBase() {
  try {
    return new URL(process.env.DADKIT_PUBLIC_ORIGIN ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "DadKit 待产包清单",
  description:
    "打开即用的待产包 Todo 清单，按全部、待购买和待装包快速确认准备进度。",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/maskable-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DadKit",
  },
  openGraph: {
    title: "DadKit 待产包清单",
    description: "不用先填资料，打开就能确认待产包还差什么。",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "打开的待产包、清单和常用物品",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DadKit 待产包清单",
    description: "不用先填资料，打开就能确认待产包还差什么。",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#FBF8F2",
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
