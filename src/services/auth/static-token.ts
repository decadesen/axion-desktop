import type { BoxSession } from "./types";

const staticTokenExpiry = "9999-12-31T23:59:59.999Z";

export const loadStaticFrontendSession = async (): Promise<BoxSession | null> => {
  if (!window.boxStaticToken) {
    return null;
  }

  const token = await window.boxStaticToken.read();
  const accessToken = token.access_token.trim();
  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    tokenType: token.token_type || "Bearer",
    expiresAt: staticTokenExpiry,
    authMethod: "static",
    userId: token.subject_ref || "frontend-ui",
    scopeTokenType: token.scope_token_type || "static",
    displayName: token.display_name || "frontend UI static token",
  };
};
