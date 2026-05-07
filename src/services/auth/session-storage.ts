import type { BoxSession } from "./types";

const BOX_SESSION_STORAGE_KEY = "axion-desktop.box-session";

const isBoxSession = (value: unknown): value is BoxSession => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<BoxSession>;
  return (
    typeof candidate.accessToken === "string" &&
    candidate.accessToken.trim().length > 0 &&
    typeof candidate.tokenType === "string" &&
    typeof candidate.expiresAt === "string" &&
    typeof candidate.authMethod === "string" &&
    (candidate.scopeTokenType === undefined || typeof candidate.scopeTokenType === "string") &&
    (candidate.displayName === undefined || typeof candidate.displayName === "string")
  );
};

export const loadBoxSession = (): BoxSession | null => {
  try {
    const raw = window.localStorage.getItem(BOX_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isBoxSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveBoxSession = (session: BoxSession): void => {
  window.localStorage.setItem(BOX_SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearBoxSession = (): void => {
  window.localStorage.removeItem(BOX_SESSION_STORAGE_KEY);
};
