export interface RuntimeConfig {
  boxBaseUrl: string;
  boxStaticTokenPath: string;
  boxStaticTokenWslDistro: string;
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
  const configuredBoxBaseUrl = resolveBaseUrl(env?.boxUrl ?? "", env?.boxHost ?? "127.0.0.1", env?.boxPort ?? "18080");

  return {
    boxBaseUrl: import.meta.env.DEV ? "" : configuredBoxBaseUrl,
    boxStaticTokenPath: env?.boxStaticTokenPath ?? "/srv/axion-box/var/static-token.json",
    boxStaticTokenWslDistro: env?.boxStaticTokenWslDistro ?? "",
    cloudBaseUrl: resolveBaseUrl(env?.cloudUrl ?? "", env?.cloudHost ?? "127.0.0.1", env?.cloudPort ?? "8080"),
    deviceBaseUrl: import.meta.env.DEV ? "/device-api" : resolveBaseUrl(env?.deviceUrl ?? "", "127.0.0.1", "17890"),
  };
};
