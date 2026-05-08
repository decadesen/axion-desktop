import {
  getBoxInitInfo,
  isBindingLostError,
  isUnauthorizedError,
  pollBoxInitInfo,
  resetBoxBinding,
} from "./box-api";
import { clearBoxSession, saveBoxSession } from "./session-storage";
import { loadStaticFrontendSession } from "./static-token";
import { setAuthFlow, setAuthSession, setAuthStage, setInitInfo } from "./auth-state";
import type { BoxInitInfo, BoxSession } from "./types";

const bindingPollIntervalMs = 3_000;
const healthCheckIntervalMs = 60_000;

class AuthManager {
  private bindingTimer: number | null = null;
  private healthTimer: number | null = null;

  async boot(): Promise<void> {
    this.stopBindingPoll();
    this.stopHealthLoop();
    setAuthFlow(null);
    setAuthStage("checking");

    let session: BoxSession;
    try {
      session = await this.loadStaticSession();
      this.persistSession(session);
    } catch (error) {
      clearBoxSession();
      setAuthSession(null);
      setAuthStage("box_offline", errorToMessage(error));
      return;
    }

    try {
      const initInfo = await getBoxInitInfo();
      this.applyInitInfo(initInfo);
    } catch (error) {
      this.handleRuntimeError(error);
    }
  }

  async forceRefresh(): Promise<void> {
    await this.boot();
  }

  async resetBinding(): Promise<void> {
    this.stopBindingPoll();
    setAuthStage("checking");
    try {
      const initInfo = await resetBoxBinding();
      this.applyInitInfo(initInfo);
    } catch (error) {
      this.handleRuntimeError(error);
    }
  }

  async startCloudLogin(_options: { openWindow?: boolean } = {}): Promise<void> {
    await this.forceRefresh();
  }

  async loginWithLocalAccount(_username = "", _password = ""): Promise<void> {
    await this.forceRefresh();
  }

  async logout(): Promise<void> {
    clearBoxSession();
    setAuthSession(null);
    await this.forceRefresh();
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
    setAuthStage("box_offline", "本机 static-token 无法通过 Box 鉴权，请检查桌面端配置是否与 Box 配置一致。");
  }

  handleBindingLost(): void {
    this.stopHealthLoop();
    setAuthStage("device_reinit_required");
    this.startBindingPoll();
  }

  private applyInitInfo(initInfo: BoxInitInfo): void {
    setInitInfo(initInfo);
    if (!initInfo.bound) {
      setAuthStage(this.isReinitRequired(initInfo) ? "device_reinit_required" : "device_unbound");
      this.startBindingPoll();
      return;
    }

    this.stopBindingPoll();
    setAuthStage("authenticated");
    this.startHealthLoop();
  }

  private async healthCheck(): Promise<void> {
    try {
      const initInfo = await getBoxInitInfo();
      setInitInfo(initInfo);
      if (!initInfo.bound) {
        this.handleBindingLost();
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
      this.applyInitInfo(initInfo);
    } catch (error) {
      this.handleRuntimeError(error);
    }
  }

  private persistSession(session: BoxSession): void {
    saveBoxSession(session);
    setAuthSession(session);
    setAuthFlow(null);
  }

  private async loadStaticSession(): Promise<BoxSession> {
    const session = await loadStaticFrontendSession();
    if (!session) {
      throw new Error("未读取到 Box static-token，请检查桌面端 config.yaml 中的 box.static_token。");
    }
    return session;
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
}

const errorToMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

export const authManager = new AuthManager();
