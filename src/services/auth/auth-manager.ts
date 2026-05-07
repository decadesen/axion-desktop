import {
  createCloudWebAuth,
  getBoxInitInfo,
  isBindingLostError,
  isUnauthorizedError,
  loginLocalAccount,
  pollBoxInitInfo,
  pollCloudWebAuth,
  validateBoxSession,
} from "./box-api";
import { clearBoxSession, loadBoxSession, saveBoxSession } from "./session-storage";
import { loadStaticFrontendSession } from "./static-token";
import { authState, setAuthFlow, setAuthSession, setAuthStage, setInitInfo } from "./auth-state";
import type { BoxInitInfo, BoxSession } from "./types";

const bindingPollIntervalMs = 3_000;
const healthCheckIntervalMs = 60_000;

class AuthManager {
  private bindingTimer: number | null = null;
  private healthTimer: number | null = null;

  async boot(): Promise<void> {
    this.stopBindingPoll();
    this.stopHealthLoop();
    setAuthStage("checking");

    try {
      const initInfo = await getBoxInitInfo();
      await this.applyInitInfo(initInfo);
    } catch (error) {
      this.handleBootError(error);
      return;
    }

    const staticSession = await this.loadValidStaticSession();
    if (staticSession) {
      this.persistSession(staticSession);
      setAuthStage("authenticated");
      this.startHealthLoop();
      return;
    }

    const session = loadBoxSession();
    if (!session) {
      setAuthStage("login_required");
      return;
    }

    const valid = await validateBoxSession(session);
    if (!valid) {
      clearBoxSession();
      setAuthSession(null);
      setAuthStage("session_expired");
      return;
    }

    setAuthSession(session);
    setAuthStage("authenticated");
    this.startHealthLoop();
  }

  async startCloudLogin(options: { openWindow?: boolean } = {}): Promise<void> {
    setAuthStage("authenticating");
    try {
      const flow = await createCloudWebAuth();
      setAuthFlow(flow);
      if (options.openWindow) {
        this.openAuthorizeLink(flow.authorize_link ?? "");
      }
      this.startCloudAuthPoll();
      setAuthStage("login_required");
    } catch (error) {
      this.handleRuntimeError(error);
    }
  }

  async loginWithLocalAccount(username: string, password: string): Promise<void> {
    setAuthStage("authenticating");
    try {
      const session = await loginLocalAccount(username, password);
      this.persistSession(session);
      setAuthStage("authenticated");
      this.startHealthLoop();
    } catch (error) {
      this.handleRuntimeError(error);
    }
  }

  async logout(): Promise<void> {
    clearBoxSession();
    setAuthSession(null);
    setAuthFlow(null);
    this.stopHealthLoop();
    setAuthStage("login_required");
  }

  async forceRefresh(): Promise<void> {
    await this.boot();
  }

  startHealthLoop(): void {
    this.stopHealthLoop();
    this.healthTimer = window.setInterval(() => {
      void this.healthCheck();
    }, healthCheckIntervalMs);
  }

  stopHealthLoop(): void {
    if (this.healthTimer !== null) {
      window.clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }

  handleUnauthorized(): void {
    clearBoxSession();
    setAuthSession(null);
    this.stopHealthLoop();
    setAuthStage("session_expired");
  }

  handleBindingLost(): void {
    clearBoxSession();
    setAuthSession(null);
    this.stopHealthLoop();
    setAuthStage("device_reinit_required");
    this.startBindingPoll();
  }

  private async applyInitInfo(initInfo: BoxInitInfo): Promise<void> {
    setInitInfo(initInfo);
    if (!initInfo.bound) {
      clearBoxSession();
      setAuthSession(null);
      setAuthStage(this.isReinitRequired(initInfo) ? "device_reinit_required" : "device_unbound");
      this.startBindingPoll();
    }
  }

  private async healthCheck(): Promise<void> {
    try {
      const initInfo = await getBoxInitInfo();
      setInitInfo(initInfo);
      if (!initInfo.bound) {
        this.handleBindingLost();
        return;
      }

      const session = loadBoxSession();
      if (!session) {
        setAuthSession(null);
        setAuthStage("login_required");
        return;
      }

      const valid = await validateBoxSession(session);
      if (!valid) {
        const staticSession = await this.loadValidStaticSession();
        if (staticSession) {
          this.persistSession(staticSession);
          setAuthStage("authenticated");
          return;
        }
        this.handleUnauthorized();
      }
    } catch (error) {
      this.handleRuntimeError(error);
    }
  }

  private startBindingPoll(): void {
    this.stopBindingPoll();
    this.bindingTimer = window.setInterval(() => {
      void this.pollBindingOnce();
    }, bindingPollIntervalMs);
  }

  private stopBindingPoll(): void {
    if (this.bindingTimer !== null) {
      window.clearInterval(this.bindingTimer);
      this.bindingTimer = null;
    }
  }

  private async pollBindingOnce(): Promise<void> {
    try {
      const initInfo = await pollBoxInitInfo();
      setInitInfo(initInfo);
      if (initInfo.bound) {
        this.stopBindingPoll();
        setAuthStage("login_required");
      }
    } catch (error) {
      this.handleRuntimeError(error);
    }
  }

  private startCloudAuthPoll(): void {
    this.stopBindingPoll();
    this.bindingTimer = window.setInterval(() => {
      void this.pollCloudAuthOnce();
    }, bindingPollIntervalMs);
  }

  private async pollCloudAuthOnce(): Promise<void> {
    const authorizeCode = authState.authFlow?.authorize_code.trim() ?? "";
    if (!authorizeCode) {
      return;
    }

    try {
      const response = await pollCloudWebAuth(authorizeCode);
      setAuthFlow(response.flow);
      if (response.token?.accessToken) {
        this.stopBindingPoll();
        this.persistSession(response.token);
        setAuthStage("authenticated");
        this.startHealthLoop();
      }
      if (["rejected", "expired"].includes(response.flow.status)) {
        this.stopBindingPoll();
        setAuthStage("login_required");
      }
    } catch (error) {
      this.handleRuntimeError(error);
    }
  }

  private persistSession(session: BoxSession): void {
    saveBoxSession(session);
    setAuthSession(session);
    setAuthFlow(null);
  }

  private async loadValidStaticSession(): Promise<BoxSession | null> {
    try {
      const session = await loadStaticFrontendSession();
      if (!session) {
        return null;
      }
      return (await validateBoxSession(session)) ? session : null;
    } catch (error) {
      console.warn("[auth] static frontend token unavailable", error);
      return null;
    }
  }

  private handleBootError(error: unknown): void {
    setAuthStage("box_offline", errorToMessage(error));
  }

  private handleRuntimeError(error: unknown): void {
    if (isUnauthorizedError(error)) {
      this.handleUnauthorized();
      return;
    }
    if (isBindingLostError(error)) {
      this.handleBindingLost();
      return;
    }
    setAuthStage("error", errorToMessage(error));
  }

  private isReinitRequired(initInfo: BoxInitInfo): boolean {
    return String(initInfo.bind_state ?? "").trim().toLowerCase() === "reinit_required";
  }

  private openAuthorizeLink(authorizeLink: string): void {
    if (!authorizeLink.trim()) {
      return;
    }
    window.open(authorizeLink, "_blank", "noopener,noreferrer");
  }
}

const errorToMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

export const authManager = new AuthManager();
