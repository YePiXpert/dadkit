import {
  assertWebSocketSupport,
  navigateAndroidWebView,
  prepareAndroidWebViewDevToolsPort,
  selectAndroidWebViewPageTarget,
  sendDevToolsCommand,
} from "./android-webview-devtools.mjs";
import {
  missingWebDavAcceptanceEnv,
  readWebDavAcceptanceEnv,
  runWebDavAcceptance,
} from "./webdav-acceptance-core.mjs";

const mode = process.argv[2] ?? "host";

try {
  const { config, secret, allowOverwrite } = readWebDavAcceptanceEnv();
  const missing = missingWebDavAcceptanceEnv({ config, secret });

  if (missing.length > 0) {
    console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
    console.error("Secrets must be supplied through environment variables, not CLI args.");
    process.exit(1);
  }

  const client =
    mode === "android"
      ? await createAndroidNativeHttpClient()
      : mode === "host"
        ? createHostFetchClient()
        : undefined;

  if (!client) {
    console.error("Usage: node scripts/verify-webdav-acceptance.mjs [host|android]");
    process.exit(1);
  }

  const result = await runWebDavAcceptance({
    client,
    config,
    secret,
    allowOverwrite,
  });

  printResult(result, mode);

  if (!result.ok) {
    process.exit(result.code === "remote-conflict" ? 2 : 1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function createHostFetchClient() {
  return {
    async request(method, url, { headers = {}, body } = {}) {
      const response = await fetch(url, {
        method,
        headers,
        body,
      });

      return {
        status: response.status,
        data: await response.text(),
      };
    },
  };
}

async function createAndroidNativeHttpClient() {
  assertWebSocketSupport();

  const port = await prepareAndroidWebViewDevToolsPort();
  const pageTargets = await navigateAndroidWebView(
    port,
    "https://localhost/settings/index.html",
    { all: true },
  );
  const target = selectAndroidWebViewPageTarget(pageTargets);

  if (!target?.webSocketDebuggerUrl) {
    throw new Error("No Android WebView page target found for native HTTP verification.");
  }

  return {
    async request(method, url, { headers = {}, body } = {}) {
      const result = await sendDevToolsCommand(target.webSocketDebuggerUrl, {
        method: "Runtime.evaluate",
        params: {
          expression: androidNativeHttpExpression({ method, url, headers, body }),
          awaitPromise: true,
          returnByValue: true,
        },
      });

      const value = result.result?.value;

      if (!value || typeof value.status !== "number") {
        throw new Error("Android native HTTP verification returned an invalid response.");
      }

      return value;
    },
  };
}

function androidNativeHttpExpression({ method, url, headers, body }) {
  const payload = JSON.stringify({
    method,
    url,
    headers,
    body,
  });

  return `;(async () => {
    const payload = ${payload};
    const plugin = window.Capacitor?.Plugins?.CapacitorHttp;

    if (!plugin?.request) {
      throw new Error("CapacitorHttp plugin is not available in this WebView.");
    }

    const response = await plugin.request({
      url: payload.url,
      method: payload.method,
      headers: payload.headers,
      data: payload.body,
      responseType: "text",
      disableRedirects: true
    });

    return {
      status: response.status,
      data: typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data ?? null)
    };
  })()`;
}

function printResult(result, mode) {
  console.log(`DadKit WebDAV acceptance mode: ${mode}`);
  console.log(`Target: ${result.targetUrl}`);

  for (const event of result.events) {
    const suffix =
      typeof event.status === "number" ? ` (${event.status})` : "";

    console.log(`- ${event.code}${suffix}`);
  }

  if (result.ok) {
    console.log("Result: ok");
    return;
  }

  if (result.code === "remote-conflict") {
    console.error(
      "Result: remote file exists and was not created by this acceptance script.",
    );
    console.error(
      "Set DADKIT_WEBDAV_ALLOW_OVERWRITE=1 only if this test may replace it.",
    );
    return;
  }

  console.error(`Result: ${result.code}`);
}
