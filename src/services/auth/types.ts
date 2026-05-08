export type AuthStage =
  | "checking"
  | "box_offline"
  | "device_unbound"
  | "binding_pending"
  | "device_reinit_required"
  | "login_required"
  | "authenticating"
  | "authenticated"
  | "session_expired"
  | "error";

export interface BoxSession {
  accessToken: string;
  tokenType: "Bearer" | string;
  expiresAt: string;
  authMethod: "cloud" | "local_account" | string;
  userId?: string;
  scopeTokenType?: "static" | string;
  displayName?: string;
}

export interface BoxInitInfo {
  initialized: boolean;
  bound: boolean;
  local_account_setup: boolean;
  bootstrap_code?: string;
  issue_link?: string;
  device_id?: string;
  hardware_fingerprint?: string;
  bind_state?: string;
  needs_reset_binding?: boolean;
  device_access_token_expires_at?: string;
}

export interface CloudWebAuthFlow {
  authorize_code: string;
  status: "pending" | "approved" | "rejected" | "expired" | "exchanged" | string;
  authorize_link?: string;
  expires_at: string;
  failure_code?: string;
}

export interface AuthContext {
  stage: AuthStage;
  boxBaseUrl: string;
  cloudBaseUrl: string;
  session: BoxSession | null;
  initInfo: BoxInitInfo | null;
  authFlow: CloudWebAuthFlow | null;
  lastError: string | null;
}
