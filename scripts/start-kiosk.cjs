const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");

const appRoot = path.resolve(__dirname, "..");
const useMockBackend = process.env.PET_USE_MOCK !== "false";
const wsPort = Number(process.env.MOCK_SERVER_PORT || 18765);
const wsHost = process.env.MOCK_SERVER_HOST || "127.0.0.1";
const electronBinary =
  process.platform === "win32"
    ? path.join(appRoot, "node_modules", ".bin", "electron.cmd")
    : path.join(appRoot, "node_modules", ".bin", "electron");

const managedChildren = [];

const childEnv = {
  ...process.env,
  PET_KIOSK: process.env.PET_KIOSK || "true",
  PET_USE_MOCK: useMockBackend ? "true" : "false",
  PET_WS_URL: process.env.PET_WS_URL || `ws://${wsHost}:${wsPort}/ws`,
  OZONE_PLATFORM: process.env.OZONE_PLATFORM || "wayland",
};

if (childEnv.OZONE_PLATFORM === "x11") {
  delete childEnv.WAYLAND_DISPLAY;
  delete childEnv.GDK_BACKEND;
  delete childEnv.QT_QPA_PLATFORM;
  delete childEnv.SDL_VIDEODRIVER;
  delete childEnv.MOZ_ENABLE_WAYLAND;
  childEnv.XDG_SESSION_TYPE = "x11";
}

function spawnManaged(command, args) {
  const child = spawn(command, args, {
    cwd: appRoot,
    env: childEnv,
    stdio: "inherit",
  });

  managedChildren.push(child);
  return child;
}

function cleanup(exitCode = 0) {
  for (const child of managedChildren) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    for (const child of managedChildren) {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }
    process.exit(exitCode);
  }, 1500).unref();
}

function waitForPort(port, host, timeoutMs = 10000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ port, host });

      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }
        setTimeout(tryConnect, 250);
      });
    };

    tryConnect();
  });
}

process.on("SIGINT", () => cleanup(130));
process.on("SIGTERM", () => cleanup(143));

(async () => {
  if (useMockBackend) {
    const mockServer = spawnManaged(process.execPath, [path.join(appRoot, "mock-server", "server.cjs")]);
    mockServer.once("exit", (code) => {
      if (code && code !== 0) {
        cleanup(code);
      }
    });
    await waitForPort(wsPort, wsHost);
  }

  const electronArgs = [path.join(appRoot, "electron", "main.cjs")];
  electronArgs.push(
    "--enable-features=UseOzonePlatform",
    `--ozone-platform=${childEnv.OZONE_PLATFORM}`,
    "--disable-vulkan",
  );

  const electron = spawnManaged(electronBinary, electronArgs);

  electron.once("exit", (code) => {
    cleanup(code || 0);
  });
})().catch((error) => {
  console.error("[start-kiosk]", error.message);
  cleanup(1);
});
