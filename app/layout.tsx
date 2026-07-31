import type { Metadata, Viewport } from "next";

import { AppHeader } from "@/components/AppHeader";
import { AppToast } from "@/components/AppToast";
import { BackgroundTasks } from "@/components/BackgroundTasks";
import { InstallPrompt } from "@/components/InstallPrompt";
import { MobileNav } from "@/components/MobileNav";
import { PersistenceWarning } from "@/components/PersistenceWarning";
import { SyncSessionWarning } from "@/components/SyncSessionWarning";
import { THEME_STORAGE_KEY } from "@/lib/theme";
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
    "打开即用的待产包清单与孕周成长参考，按全部、待购买和待装包快速确认准备进度。",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DadKit",
  },
  openGraph: {
    title: "DadKit 待产包清单",
    description: "不用先填资料，打开就能确认待产包还差什么，也能按孕周查看成长参考。",
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
    description: "不用先填资料，打开就能确认待产包还差什么，也能按孕周查看成长参考。",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    // 与 app/globals.css 的浅色 --background: 40 43% 97% 保持一致。
    { media: "(prefers-color-scheme: light)", color: "#FBF8F2" },
    // 与 app/globals.css 的深色 --background: 28 14% 9% 保持一致。
    { media: "(prefers-color-scheme: dark)", color: "#1A1714" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// 构建期注入共享 key；对应值见 lib/theme.ts，避免客户端 hook 与首屏脚本漂移。
const themeInitScript = `(function(){try{var p=window.localStorage.getItem("${THEME_STORAGE_KEY}");if(p!=="light"&&p!=="dark"){p=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.classList.toggle("dark",p==="dark");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <BackgroundTasks />
        <PersistenceWarning />
        <SyncSessionWarning />
        <AppToast />
        <AppHeader />
        <main>{children}</main>
        <InstallPrompt />
        <MobileNav />
      </body>
    </html>
  );
}
