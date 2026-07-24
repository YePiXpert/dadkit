import {
  missingWebDavAcceptanceEnv,
  readWebDavAcceptanceEnv,
  runWebDavAcceptance,
} from "./webdav-acceptance-core.mjs";

try {
  const { config, secret, allowOverwrite } = readWebDavAcceptanceEnv();
  const missing = missingWebDavAcceptanceEnv({ config, secret });

  if (missing.length > 0) {
    console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
    console.error("Secrets must be supplied through environment variables, not CLI args.");
    process.exit(1);
  }

  const result = await runWebDavAcceptance({
    client: createHostFetchClient(),
    config,
    secret,
    allowOverwrite,
  });

  printResult(result);

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

function printResult(result) {
  console.log("DadKit WebDAV acceptance mode: PWA host");
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
