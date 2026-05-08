export interface RuntimeConfig {
  boxBaseUrl: string;
  desktopConfigPath: string;
  cloudBaseUrl: string;
  deviceBaseUrl: string;
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const resolveBaseUrl = (explicitUrl: string, host: string, port: string) => {
  const explicit = explicitUrl.trim();
  if (explicit) {
    return trimTrailingSlash(explicit);
  }

  const resolvedHost = host.trim() || "127.0.0.1";
  const resolvedPort = port.trim();
  return trimTrailingSlash(`http://${resolvedHost}${resolvedPort ? `:${resolvedPort}` : ""}`);
};

export const resolveRuntimeConfig = (): RuntimeConfig => {
  const env = window.runtime?.env;
  const configuredBoxBaseUrl = resolveBaseUrl(env?.boxUrl ?? "", env?.boxHost ?? "127.0.0.1", env?.boxPort ?? "26681");

  return {
    boxBaseUrl: import.meta.env.DEV ? "" : configuredBoxBaseUrl,
    desktopConfigPath: env?.desktopConfigPath ?? "config.yaml",
    cloudBaseUrl: resolveBaseUrl(env?.cloudUrl ?? "", env?.cloudHost ?? "127.0.0.1", env?.cloudPort ?? "8080"),
    deviceBaseUrl: import.meta.env.DEV ? "/device-api" : resolveBaseUrl(env?.deviceUrl ?? "", "127.0.0.1", "17890"),
  };
};
