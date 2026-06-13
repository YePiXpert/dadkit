import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const DEBUG_PORT = Number(
  process.env.CHROME_DEBUG_PORT ?? 9300 + Math.floor(Math.random() * 1000),
);
const VIEWPORT = {
  width: Number(process.env.VISUAL_WIDTH ?? 390),
  height: Number(process.env.VISUAL_HEIGHT ?? 844),
  deviceScaleFactor: Number(process.env.VISUAL_DPR ?? 2),
};
const OUT_DIR =
  process.env.OUT_DIR ??
  path.join(
    process.cwd(),
    ".visual-screenshots",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );
const ROUTES = [
  ["01-home", "/"],
  ["02-setup", "/setup"],
  ["03-checklist", "/checklist"],
  ["04-hospital", "/hospital"],
  ["05-timeline", "/timeline"],
  ["06-go", "/go"],
  ["07-contractions", "/contractions"],
  ["08-settings", "/settings"],
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(os.homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"),
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  const chromePath = candidates.find((candidate) => existsSync(candidate));

  if (!chromePath) {
    throw new Error(
      "Chrome or Edge was not found. Set CHROME_PATH to a browser executable.",
    );
  }

  return chromePath;
}

async function waitForJson(url, attempts = 60) {
  let lastError;

  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(500);
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    if (!globalThis.WebSocket) {
      reject(new Error("This script needs Node.js with the global WebSocket API."));
      return;
    }

    const ws = new WebSocket(wsUrl);
    let sequence = 0;
    const pending = new Map();
    const eventWaiters = new Map();
    const eventListeners = new Map();
    const openTimer = setTimeout(() => {
      reject(new Error("Timed out while opening the Chrome DevTools socket."));
    }, 10_000);

    ws.onopen = () => {
      clearTimeout(openTimer);
      resolve({
        send(method, params = {}) {
          const id = ++sequence;

          ws.send(JSON.stringify({ id, method, params }));

          return new Promise((res, rej) => {
            pending.set(id, { method, res, rej });
          });
        },
        waitEvent(method, timeoutMs = 15_000) {
          return new Promise((res, rej) => {
            const timer = setTimeout(() => {
              const waiters = eventWaiters.get(method) ?? [];

              eventWaiters.set(
                method,
                waiters.filter((waiter) => waiter.res !== res),
              );
              rej(new Error(`Timed out waiting for ${method}.`));
            }, timeoutMs);
            const waiters = eventWaiters.get(method) ?? [];

            waiters.push({
              res(payload) {
                clearTimeout(timer);
                res(payload);
              },
            });
            eventWaiters.set(method, waiters);
          });
        },
        listen(method, handler) {
          const listeners = eventListeners.get(method) ?? [];

          listeners.push(handler);
          eventListeners.set(method, listeners);
        },
        close() {
          ws.close();
        },
      });
    };

    ws.onerror = () => reject(new Error("Chrome DevTools socket error."));
    ws.onmessage = (message) => {
      const payload = JSON.parse(message.data);

      if (payload.id && pending.has(payload.id)) {
        const { method, res, rej } = pending.get(payload.id);

        pending.delete(payload.id);

        if (payload.error) {
          rej(new Error(`${method}: ${payload.error.message}`));
          return;
        }

        res(payload.result ?? {});
        return;
      }

      if (payload.method && eventWaiters.has(payload.method)) {
        const waiters = eventWaiters.get(payload.method) ?? [];

        eventWaiters.set(payload.method, []);
        waiters.forEach((waiter) => waiter.res(payload.params ?? {}));
      }

      if (payload.method && eventListeners.has(payload.method)) {
        const listeners = eventListeners.get(payload.method) ?? [];

        listeners.forEach((listener) => listener(payload.params ?? {}));
      }
    };
  });
}

function buildSeedProfile() {
  const now = new Date().toISOString();

  return {
    dueDate: process.env.DADKIT_VISUAL_DUE_DATE ?? "2026-09-04",
    regionId: "cn-bj-general",
    hospitalMode: "unknown",
    deliveryMode: "vaginal",
    expectedStayDays: 3,
    breastfeeding: true,
    partnerPresent: true,
    coldWeather: false,
    hospitalProvidedItemIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const userDataDir = path.join(os.tmpdir(), `dadkit-chrome-${Date.now()}`);
  const chrome = spawn(
    findChrome(),
    [
      "--headless=new",
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${userDataDir}`,
      "--disable-gpu",
      "--disable-application-cache",
      "--disk-cache-size=0",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--remote-allow-origins=*",
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );

  try {
    const targets = await waitForJson(
      `http://127.0.0.1:${DEBUG_PORT}/json/list`,
    );
    const target = targets.find((item) => item.type === "page");

    if (!target) {
      throw new Error("No Chrome page target was available.");
    }

    const cdp = await connect(target.webSocketDebuggerUrl);
    const seedProfile = buildSeedProfile();
    const diagnostics = [];

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable").catch(() => null);
    await cdp.send("Network.enable");
    await cdp
      .send("Network.setCacheDisabled", { cacheDisabled: true })
      .catch(() => null);
    await cdp
      .send("Network.setBypassServiceWorker", { bypass: true })
      .catch(() => null);
    await cdp
      .send("Storage.clearDataForOrigin", {
        origin: new URL(BASE_URL).origin,
        storageTypes: "all",
      })
      .catch(() => null);
    cdp.listen("Runtime.exceptionThrown", (params) => {
      diagnostics.push({
        type: "exception",
        text:
          params.exceptionDetails?.exception?.description ??
          params.exceptionDetails?.text ??
          "Runtime exception",
      });
    });
    cdp.listen("Runtime.consoleAPICalled", (params) => {
      diagnostics.push({
        type: "console",
        level: params.type,
        text: (params.args ?? [])
          .map((arg) => arg.value ?? arg.description ?? "")
          .join(" "),
      });
    });
    cdp.listen("Log.entryAdded", (params) => {
      diagnostics.push({
        type: "log",
        level: params.entry?.level,
        text: params.entry?.text ?? "",
      });
    });
    cdp.listen("Network.responseReceived", (params) => {
      const status = params.response?.status ?? 0;

      if (status >= 400) {
        diagnostics.push({
          type: "network",
          level: "error",
          text: `${status} ${params.response?.url ?? ""}`,
        });
      }
    });
    cdp.listen("Network.loadingFailed", (params) => {
      diagnostics.push({
        type: "network",
        level: "error",
        text: `${params.errorText ?? "loading failed"} ${params.blockedReason ?? ""}`.trim(),
      });
    });
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      ...VIEWPORT,
      mobile: true,
      screenWidth: VIEWPORT.width,
      screenHeight: VIEWPORT.height,
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
    await cdp.send("Network.setUserAgentOverride", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });

    async function navigate(route) {
      const loaded = cdp
        .waitEvent("Page.loadEventFired", 15_000)
        .catch(() => null);

      await cdp.send("Page.navigate", { url: new URL(route, BASE_URL).href });
      await loaded;
      await sleep(900);
    }

    await navigate("/");
    await cdp.send("Runtime.evaluate", {
      expression: [
        `localStorage.setItem('dadkit:user-profile', ${JSON.stringify(
          JSON.stringify(seedProfile),
        )})`,
        "localStorage.setItem('dadkit:checklist-mode', JSON.stringify('lean'))",
      ].join(";"),
    });

    const manifest = [];

    for (const [name, route] of ROUTES) {
      const diagnosticsStart = diagnostics.length;

      await navigate(route);
      await sleep(1_200);
      await cdp
        .send("Runtime.evaluate", {
          expression: "document.fonts && document.fonts.ready",
          awaitPromise: true,
        })
        .catch(() => null);

      const state = await cdp.send("Runtime.evaluate", {
        expression:
          "(() => { const firstRelative = document.querySelector('.relative'); const firstImage = document.querySelector('img'); const imageRect = firstImage ? firstImage.getBoundingClientRect() : null; return { width: innerWidth, height: innerHeight, styleSheets: document.styleSheets.length, firstRelativePosition: firstRelative ? getComputedStyle(firstRelative).position : null, firstImageRect: imageRect ? { x: Math.round(imageRect.x), y: Math.round(imageRect.y), width: Math.round(imageRect.width), height: Math.round(imageRect.height) } : null, hasProfile: Boolean(localStorage.getItem('dadkit:user-profile')), text: document.body ? document.body.innerText.slice(0, 260) : '' }; })()",
        returnByValue: true,
      });
      const screenshot = await cdp.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false,
      });
      const file = path.join(OUT_DIR, `${name}.png`);

      writeFileSync(file, Buffer.from(screenshot.data, "base64"));
      manifest.push({
        name,
        route,
        file,
        state: state.result?.value,
        diagnostics: diagnostics.slice(diagnosticsStart),
      });
    }

    cdp.close();
    writeFileSync(
      path.join(OUT_DIR, "manifest.json"),
      JSON.stringify(
        {
          baseUrl: BASE_URL,
          debugPort: DEBUG_PORT,
          viewport: `${VIEWPORT.width}x${VIEWPORT.height}@${VIEWPORT.deviceScaleFactor}x`,
          seededDueDate: seedProfile.dueDate,
          manifest,
        },
        null,
        2,
      ),
    );

    console.log(`Captured ${manifest.length} screenshots in ${OUT_DIR}`);
  } finally {
    chrome.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
