/**
 * ARCHITECTURE: Preview automation.
 * Запускает/проверяет локальный preview workflow отдельно от production application logic.
 * Нужен для воспроизводимого визуального smoke-check без добавления dev-логики в страницы.
 */

import {spawn} from "node:child_process";
import {request} from "node:http";

const port = process.env.PORT || "3000";
const url = "http://127.0.0.1:" + port;

function waitForServer(timeoutMs = 120000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const retry = () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error("Next.js dev server did not become ready."));
        return;
      }
      setTimeout(check, 1500);
    };

    const check = () => {
      const req = request(url, {method: "GET"}, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });

      req.on("error", retry);
      req.setTimeout(2000, () => req.destroy());
      req.end();
    };

    check();
  });
}

const next = spawn(
  "npm",
  ["run", "dev", "--", "--hostname", "0.0.0.0", "--port", port],
  {stdio: "inherit", shell: true}
);

let tunnel;

const cleanup = () => {
  if (tunnel && tunnel.exitCode === null) tunnel.kill("SIGTERM");
  if (next.exitCode === null) next.kill("SIGTERM");
};

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    cleanup();
    process.exit(0);
  });
}

try {
  await waitForServer();
  console.log("\nNext.js is ready: " + url);
} catch (error) {
  cleanup();
  console.error(error);
  process.exit(1);
}

tunnel = spawn(
  "npx",
  ["--yes", "wrangler", "tunnel", "quick-start", url],
  {stdio: ["ignore", "pipe", "pipe"], shell: true}
);

let tunnelBuffer = "";

const onTunnelOutput = (chunk) => {
  const value = chunk.toString();
  tunnelBuffer += value;
  process.stdout.write(value);

  const match = tunnelBuffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match) {
    console.log("\nLIVE PREVIEW: " + match[0] + "\n");
  }

  if (tunnelBuffer.length > 12000) {
    tunnelBuffer = tunnelBuffer.slice(-6000);
  }
};

tunnel.stdout.on("data", onTunnelOutput);
tunnel.stderr.on("data", onTunnelOutput);

const exitCode = await new Promise((resolve) => {
  const handleExit = (code) => resolve(code ?? 1);
  tunnel.on("exit", handleExit);
  next.on("exit", (code) => {
    if (tunnel.exitCode === null) tunnel.kill("SIGTERM");
    if (code !== 0) resolve(code ?? 1);
  });
});

cleanup();
process.exit(exitCode);
