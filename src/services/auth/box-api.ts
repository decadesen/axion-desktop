import { resolveRuntimeConfig } from "../runtime-config";
import { loadBoxSession } from "./session-storage";
import type { BoxInitInfo, BoxSession, CloudWebAuthFlow } from "./types";

interface ApiEnvelope<T> {
  code: number;
  data?: T;
  error?: string;
}

export class BoxApiError extends Error {
  readonly status: number;
  readonly code: number;

  constructor(message: string, status: number, code: number) {
    super(message);
    this.name = "BoxApiError";
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions<TBody = unknown> {
  method?: "GET" | "POST";
  body?: TBody;
  skipAuth?: boolean;
  token?: string;
}

const { boxBaseUrl } = resolveRuntimeConfig();

interface BoxSessionDTO {
  access_token: string;
  token_type: string;
  expires_at: string;
  auth_method: string;
  user_id?: string;
}

const buildUrl = (path: string) => `${boxBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

const readEnvelope = async <T>(response: Response): Promise<ApiEnvelope<T>> => {
  const rawText = await response.text();
  if (!rawText.trim()) {
    return {
      code: response.ok ? 0 : -1,
      error: response.ok ? "" : `${response.status} ${response.statusText}`,
    };
  }

  try {
    return JSON.parse(rawText) as ApiEnvelope<T>;
  } catch {
    return {
      code: -1,
      error: rawText.slice(0, 200),
    };
  }
};

export const isUnauthorizedError = (error: unknown): boolean => {
  return error instanceof BoxApiError && (error.status === 401 || error.code === 1002);
};

export const isBindingLostError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("device_reinit_required") ||
    message.includes("device_not_bound") ||
    message.includes("cloud_binding_lost")
  );
};

export const requestBox = async <TResponse, TBody = unknown>(
  path: string,
  options: RequestOptions<TBody> = {},
): Promise<TResponse> => {
  const headers = new Headers();
  headers.set("Accept", "application/json");

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const sessionToken = options.token ?? loadBoxSession()?.accessToken ?? "";
  if (!options.skipAuth && sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? "POST",
    headers,
    body,
  });
  const envelope = await readEnvelope<TResponse>(response);

  if (!response.ok || envelope.code !== 0) {
    throw new BoxApiError(
      envelope.error || `${response.status} ${response.statusText || "request failed"}`,
      response.status,
      envelope.code,
    );
  }

  if (envelope.data === undefined) {
    throw new BoxApiError("Box API response is missing data.", response.status, envelope.code);
  }

  return envelope.data;
};

export const getBoxInitInfo = async (): Promise<BoxInitInfo> => {
  const response = await requestBox<{ init_info: BoxInitInfo }>("/api/v1/bootstrap/_get", {
    body: {},
  });
  return response.init_info;
};

export const pollBoxInitInfo = async (): Promise<BoxInitInfo> => {
  const response = await requestBox<{ init_info: BoxInitInfo }>("/api/v1/bootstrap/_poll", {
    body: {},
  });
  return response.init_info;
};

export const createCloudWebAuth = async (): Promise<CloudWebAuthFlow> => {
  const response = await requestBox<{ flow: CloudWebAuthFlow }>("/api/v1/cloud_web_auth/_create", {
    body: {
      ttl_sec: 300,
      scope: ["box:webui"],
    },
    skipAuth: true,
  });
  return response.flow;
};

export const pollCloudWebAuth = async (authorizeCode: string) => {
  const response = await requestBox<{ flow: CloudWebAuthFlow; token?: BoxSessionDTO }>("/api/v1/cloud_web_auth/_poll", {
    body: {
      authorize_code: authorizeCode,
    },
    skipAuth: true,
  });
  return {
    flow: response.flow,
    token: response.token ? toBoxSession(response.token) : undefined,
  };
};

export const loginLocalAccount = async (username: string, password: string): Promise<BoxSession> => {
  const response = await requestBox<{ token: BoxSessionDTO }>("/api/v1/local_account/_login", {
    body: {
      username,
      password,
    },
    skipAuth: true,
  });
  return toBoxSession(response.token);
};

export const validateBoxSession = async (session: BoxSession): Promise<boolean> => {
  try {
    await requestBox<unknown>("/api/v1/install/_overview", {
      body: {},
      token: session.accessToken,
    });
    return true;
  } catch {
    return false;
  }
};

const toBoxSession = (token: BoxSessionDTO): BoxSession => {
  return {
    accessToken: token.access_token,
    tokenType: token.token_type || "Bearer",
    expiresAt: token.expires_at,
    authMethod: token.auth_method,
    userId: token.user_id,
  };
};
