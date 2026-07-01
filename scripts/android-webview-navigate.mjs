import {
  assertWebSocketSupport,
  navigateAndroidWebView,
  prepareAndroidWebViewDevToolsPort,
  selectAndroidWebViewPageTarget,
} from "./android-webview-devtools.mjs";

const url = process.argv[2];

if (!url) {
  console.error("Usage: node scripts/android-webview-navigate.mjs <url>");
  process.exit(1);
}

try {
  assertWebSocketSupport();

  const port = await prepareAndroidWebViewDevToolsPort();
  const nextTargets = await navigateAndroidWebView(port, url, {
    all: process.env.ANDROID_WEBVIEW_NAVIGATE_ALL === "1",
  });
  const nextTarget = selectAndroidWebViewPageTarget(nextTargets);

  console.log(`Navigated Android WebView to ${nextTarget?.url ?? url}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
