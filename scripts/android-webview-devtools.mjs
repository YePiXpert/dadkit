import { spawnSync } from "node:child_process";

import { getAdbPath, withMobileBuildEnv } from "./mobile-env.mjs";

const DEFAULT_DEVTOOLS_PORT = "9223";

export async function prepareAndroidWebViewDevToolsPort(env = process.env) {
  const port = env.ANDROID_WEBVIEW_DEVTOOLS_PORT ?? DEFAULT_DEVTOOLS_PORT;

  if (env.ANDROID_WEBVIEW_DEVTOOLS_PORT) {
    return port;
  }

  const socket = findAndroidWebViewDevToolsSocket(env);
  const adb = getAdbPath(env);
  const result = spawnSync(
    adb,
    ["forward", `tcp:${port}`, `localabstract:${socket}`],
    {
      encoding: "utf8",
      env: withMobileBuildEnv(env),
    },
  );

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim());
  }

  return port;
}

export async function getAndroidWebViewPageTargets(port) {
  const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);

  return targets.filter((item) => item.type === "page");
}

export function selectAndroidWebViewPageTarget(pageTargets) {
  return (
    pageTargets.find((item) => item.description?.includes('"attached":true')) ??
    pageTargets[0]
  );
}

export async function navigateAndroidWebView(port, url, options = {}) {
  const pageTargets = await getAndroidWebViewPageTargets(port);
  const target = selectAndroidWebViewPageTarget(pageTargets);

  if (!target?.webSocketDebuggerUrl) {
    throw new Error(`No Android WebView page target found on port ${port}.`);
  }

  const targetsToNavigate = options.all ? pageTargets : [target];

  for (const pageTarget of targetsToNavigate) {
    await sendDevToolsCommand(pageTarget.webSocketDebuggerUrl, {
      method: "Page.navigate",
      params: { url },
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));

  return getAndroidWebViewPageTargets(port);
}

export async function getAndroidWebViewBodyText(webSocketDebuggerUrl) {
  const result = await sendDevToolsCommand(webSocketDebuggerUrl, {
    method: "Runtime.evaluate",
    params: {
      expression: "document.body?.innerText ?? ''",
      returnByValue: true,
    },
  });

  return String(result.result?.value ?? "");
}

export function assertWebSocketSupport() {
  if (typeof WebSocket === "undefined") {
    throw new Error("This script needs a Node.js runtime with global WebSocket support.");
  }
}

export async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }

  return response.json();
}

export function sendDevToolsCommand(webSocketDebuggerUrl, command) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(webSocketDebuggerUrl);
    const id = 1;
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Timed out waiting for DevTools response."));
    }, 5000);

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ id, ...command }));
    });

    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.id !== id) {
        return;
      }

      clearTimeout(timeout);
      ws.close();

      if (message.error) {
        reject(new Error(message.error.message));
        return;
      }

      resolve(message.result);
    });

    ws.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("Android WebView DevTools socket failed."));
    });
  });
}

function findAndroidWebViewDevToolsSocket(env) {
  const adb = getAdbPath(env);
  const result = spawnSync(adb, ["shell", "cat", "/proc/net/unix"], {
    encoding: "utf8",
    env: withMobileBuildEnv(env),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim());
  }

  const socket = result.stdout
    .split(/\r?\n/)
    .map((line) => line.match(/@?(webview_devtools_remote_\d+)/)?.[1])
    .find(Boolean);

  if (!socket) {
    throw new Error("No Android WebView DevTools socket found. Launch the APK first.");
  }

  return socket;
}
