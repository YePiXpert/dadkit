import {
  assertWebSocketSupport,
  getAndroidWebViewBodyText,
  navigateAndroidWebView,
  prepareAndroidWebViewDevToolsPort,
} from "./android-webview-devtools.mjs";

const [url, expectedText] = process.argv.slice(2);

if (!url || !expectedText) {
  console.error("Usage: node scripts/verify-android-webview-route.mjs <url> <expected text>");
  process.exit(1);
}

try {
  assertWebSocketSupport();

  const port = await prepareAndroidWebViewDevToolsPort();
  const pageTargets = await navigateAndroidWebView(port, url, { all: true });
  const matches = [];
  const observed = [];

  for (const target of pageTargets) {
    if (!target.webSocketDebuggerUrl) {
      continue;
    }

    const text = await getAndroidWebViewBodyText(target.webSocketDebuggerUrl);
    const sample = compactText(text).slice(0, 180);

    observed.push({
      title: target.title,
      url: target.url,
      sample,
    });

    if (target.url === url && text.includes(expectedText)) {
      matches.push({
        title: target.title,
        url: target.url,
        sample,
      });
    }
  }

  if (matches.length === 0) {
    console.error(`Expected Android WebView route ${url} to include: ${expectedText}`);
    console.error("Observed Android WebView targets:");

    for (const target of observed) {
      console.error(`- ${target.url} | ${target.title} | ${target.sample}`);
    }

    process.exit(1);
  }

  const match = matches[0];
  console.log(`Verified Android WebView route: ${match.url}`);
  console.log(`Title: ${match.title}`);
  console.log(`Text sample: ${match.sample}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function compactText(value) {
  return value.replace(/\s+/g, " ").trim();
}
