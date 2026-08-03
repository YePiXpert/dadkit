// MiSans 字体按 unicode-range 切片懒加载（public/fonts/misans/），
// 在根布局以 <link> 注入，浏览器只下载页面实际用到的字重切片。
export const MISANS_STYLESHEETS = [
  "/fonts/misans/MiSans-Regular.min.css",
  "/fonts/misans/MiSans-Medium.min.css",
  "/fonts/misans/MiSans-Semibold.min.css",
  "/fonts/misans/MiSans-Bold.min.css",
] as const;

export const SANS_FONT_STACK =
  'MiSans, -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
