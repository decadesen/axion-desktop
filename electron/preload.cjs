const { contextBridge } = require("electron");
const fs = require("node:fs/promises");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const { URL } = require("node:url");

const desktopConfigPath =
  process.env.AXION_DESKTOP_CONFIG_PATH ||
  process.env.PET_DESKTOP_CONFIG_PATH ||
  path.resolve(process.cwd(), "config.yaml");

const runtime = {
  version: "0.1.0",
  platform: process.platform,
  env: {
    wsUrl: process.env.PET_WS_URL || "ws://127.0.0.1:18765/ws",
    useMockBackend: process.env.PET_USE_MOCK !== "false",
    boxUrl: process.env.PET_BOX_URL || "http://127.0.0.1:26681",
    boxHost: process.env.PET_BOX_HOST || "127.0.0.1",
    boxPort: process.env.PET_BOX_PORT || "26681",
    desktopConfigPath,
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

const stripInlineComment = (value) => {
  let quote = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if ((char === "\"" || char === "'") && value[index - 1] !== "\\") {
      quote = quote === char ? "" : quote || char;
      continue;
    }
    if (char === "#" && !quote) {
      return value.slice(0, index).trim();
    }
  }
  return value.trim();
};

const parseYamlScalar = (value) => {
  const trimmed = stripInlineComment(value);
  if (!trimmed) {
    return "";
  }
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const readNestedYamlScalar = (raw, pathParts) => {
  const stack = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }
    const match = line.match(/^(\s*)([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) {
      continue;
    }
    const indent = match[1].length;
    const key = match[2];
    const value = match[3] ?? "";
    while (stack.length && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const currentPath = [...stack.map((item) => item.key), key];
    if (currentPath.join(".") === pathParts.join(".") && value.trim()) {
      return parseYamlScalar(value);
    }
    if (!value.trim()) {
      stack.push({ indent, key });
    }
  }
  return "";
};

const readConfigValue = async (pathParts) => {
  const raw = await fs.readFile(desktopConfigPath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    const value = pathParts.reduce((current, key) => current?.[key], parsed);
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return readNestedYamlScalar(raw, pathParts);
  }
};

const readBoxStaticToken = async () => {
  const accessToken = await readConfigValue(["box", "static_token"]);
  if (!accessToken) {
    throw new Error(`No box.static_token found in ${desktopConfigPath}.`);
  }

  return {
    access_token: accessToken,
    token_type: "Bearer",
    scope_token_type: "static",
    subject_ref: "frontend-ui",
    display_name: "frontend UI static token",
  };
};

contextBridge.exposeInMainWorld("runtime", runtime);
contextBridge.exposeInMainWorld("axionDevice", {
  request: requestDevice,
});
contextBridge.exposeInMainWorld("boxStaticToken", {
  read: readBoxStaticToken,
});
