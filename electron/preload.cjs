const { contextBridge } = require("electron");
const fs = require("node:fs/promises");
const http = require("node:http");
const https = require("node:https");
const { execFile } = require("node:child_process");
const { URL } = require("node:url");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const staticTokenPath = process.env.PET_BOX_STATIC_TOKEN_PATH || "/srv/axion-box/var/static-token.json";
const staticTokenWslDistro = process.env.PET_BOX_STATIC_TOKEN_WSL_DISTRO || "";

const runtime = {
  version: "0.1.0",
  platform: process.platform,
  env: {
    wsUrl: process.env.PET_WS_URL || "ws://127.0.0.1:18765/ws",
    useMockBackend: process.env.PET_USE_MOCK !== "false",
    boxUrl: process.env.PET_BOX_URL || "http://192.168.209.231:26681",
    boxHost: process.env.PET_BOX_HOST || "127.0.0.1",
    boxPort: process.env.PET_BOX_PORT || "18080",
    boxStaticTokenPath: staticTokenPath,
    boxStaticTokenWslDistro: staticTokenWslDistro,
    cloudUrl: process.env.PET_CLOUD_URL || "https://api.glenclaw.com",
    cloudHost: process.env.PET_CLOUD_HOST || "127.0.0.1",
    cloudPort: process.env.PET_CLOUD_PORT || "8080",
    deviceUrl: process.env.PET_DEVICE_URL || "http://127.0.0.1:17890",
  },
};

const requestDevice = (path, options = {}) =>
  new Promise((resolve, reject) => {
    const baseUrl = process.env.PET_DEVICE_URL || "http://127.0.0.1:17890";
    const url = new URL(path, baseUrl);
    const body = options.body === undefined ? null : JSON.stringify(options.body);
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(
      url,
      {
        method: options.method || "GET",
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {}),
        },
        timeout: Number(options.timeoutMs || 10000),
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            resolve(raw ? JSON.parse(raw) : null);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error("axion-device request timed out"));
    });
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });

const isLinuxAbsolutePath = (value) => value.startsWith("/");

const readStaticTokenFile = async () => {
  if (process.platform === "win32" && isLinuxAbsolutePath(staticTokenPath)) {
    const args = [
      ...(staticTokenWslDistro ? ["-d", staticTokenWslDistro] : []),
      "--",
      "cat",
      staticTokenPath,
    ];
    const { stdout } = await execFileAsync("wsl.exe", args, {
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 1024 * 1024,
    });
    return stdout;
  }

  return fs.readFile(staticTokenPath, "utf8");
};

const isStaticTokenRecord = (value) => {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (
    typeof value.access_token === "string" &&
    value.access_token.trim().length > 0 &&
    typeof value.token_type === "string" &&
    String(value.scope_token_type || "").trim().toLowerCase() === "static"
  );
};

const readBoxStaticToken = async () => {
  const raw = await readStaticTokenFile();
  const parsed = JSON.parse(raw);
  const tokens = Array.isArray(parsed?.tokens) ? parsed.tokens : [];
  const token =
    tokens.find((item) => isStaticTokenRecord(item) && item.subject_ref === "frontend-ui") ||
    tokens.find(isStaticTokenRecord);

  if (!token) {
    throw new Error("No frontend static token found.");
  }

  return {
    access_token: token.access_token,
    token_type: token.token_type || "Bearer",
    scope_token_type: token.scope_token_type || "static",
    subject_ref: token.subject_ref || "frontend-ui",
    display_name: token.display_name || "frontend UI static token",
  };
};

contextBridge.exposeInMainWorld("runtime", runtime);
contextBridge.exposeInMainWorld("axionDevice", {
  request: requestDevice,
});
contextBridge.exposeInMainWorld("boxStaticToken", {
  read: readBoxStaticToken,
});
